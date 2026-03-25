#!/usr/bin/env node
/**
 * Collector - fetches data from BattleMetrics and pushes to Cloudflare KV
 * Runs outside of Cloudflare (GitHub Actions, local machine) to avoid IP blocks
 */

import 'dotenv/config';
import { BattleMetricsService } from '../src/services/battlemetrics.js';

interface CloudflareKV {
  put: (key: string, value: string) => Promise<void>;
  get: (key: string, type: 'json') => Promise<any>;
}

// Cloudflare KV API via REST
class CloudflareKVClient {
  private apiKey: string;
  private accountId: string;
  private namespaceId = 'a8f21c595e39452e95e7e41e3d812013'; // trending_snapshots

  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    if (!this.apiKey || !this.accountId) {
      throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required');
    }
  }

  private baseUrl(path: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}${path}`;
  }

  async put(key: string, value: string): Promise<void> {
    const response = await fetch(this.baseUrl(`/values/${key}`), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'text/plain',
      },
      body: value,
    });
    if (!response.ok) {
      throw new Error(`KV put failed: ${response.status}`);
    }
  }

  async get(key: string, type: 'json'): Promise<any> {
    const response = await fetch(this.baseUrl(`/values/${key}`), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`KV get failed: ${response.status}`);
    }
    const text = await response.text();
    return type === 'json' ? JSON.parse(text) : text;
  }
}

const KV_KEYS = {
  MODS: 'cache:mods',
  SERVERS: 'cache:servers',
  STATS: 'cache:stats',
  LAST_UPDATE: 'cache:lastUpdate',
};

interface ServerMod {
  serverId: string;
  modId: string;
}

async function runCollector() {
  console.log('🚀 COLLECTOR: Starting...');

  const kv = new CloudflareKVClient();
  const bm = new BattleMetricsService();

  console.log('📡 Fetching servers from BattleMetrics...');
  const servers = await bm.fetchAllServers(false); // fetch ALL servers
  console.log(`✅ Fetched ${servers.length} servers`);

  // Build data structures
  const serverList: any[] = [];
  const serverMods: ServerMod[] = [];
  const modMap = new Map<string, { id: string; name: string; serverCount: number; totalPlayers: number; }>();

  for (const server of servers) {
    const { id, attributes } = server;
    const reforgerMods = attributes.details?.reforger?.mods || [];

    serverList.push({
      id,
      name: attributes.name,
      ip: attributes.ip || '',
      port: attributes.port || 0,
      players: attributes.players,
      maxPlayers: attributes.maxPlayers,
      mods: [] as any[],
    });

    for (const sm of reforgerMods) {
      serverMods.push({ serverId: id, modId: sm.modId });

      if (!modMap.has(sm.modId)) {
        modMap.set(sm.modId, {
          id: sm.modId,
          name: sm.name || 'Unknown Module',
          serverCount: 0,
          totalPlayers: 0,
        });
      }
    }
  }

  // Calculate mod stats
  for (const sm of serverMods) {
    const mod = modMap.get(sm.modId);
    if (mod) {
      const server = serverList.find(s => s.id === sm.serverId);
      if (server) {
        mod.serverCount++;
        mod.totalPlayers += server.players;
        server.mods.push({
          id: mod.id,
          name: mod.name,
          serverCount: mod.serverCount,
          totalPlayers: mod.totalPlayers,
        });
      }
    }
  }

  // Calculate ranks
  const mods = Array.from(modMap.values());
  const byPlayers = [...mods].sort((a, b) => b.totalPlayers - a.totalPlayers);
  const byServers = [...mods].sort((a, b) => b.serverCount - a.serverCount);

  const playerRanks = new Map(byPlayers.map((m, i) => [m.id, i + 1]));
  const serverRanks = new Map(byServers.map((m, i) => [m.id, i + 1]));

  const modList = mods.map(m => ({
    id: m.id,
    name: m.name,
    serverCount: m.serverCount,
    totalPlayers: m.totalPlayers,
    playerRank: playerRanks.get(m.id)!,
    serverRank: serverRanks.get(m.id)!,
    overallRank: Math.floor((playerRanks.get(m.id)! + serverRanks.get(m.id)!) / 2),
  }));

  // Update server mods with ranks
  for (const server of serverList) {
    for (const mod of server.mods) {
      const fullMod = modList.find(m => m.id === mod.id);
      if (fullMod) {
        mod.playerRank = fullMod.playerRank;
        mod.serverRank = fullMod.serverRank;
        mod.overallRank = fullMod.overallRank;
      }
    }
  }

  // Global stats
  const totalMods = mods.length;
  const currentPlayers = serverList.reduce((sum, s) => sum + s.players, 0); // Current online players
  const totalServers = serverList.length;

  console.log(`📦 Writing to KV...`);
  console.log(`  - ${modList.length} mods`);
  console.log(`  - ${serverList.length} servers`);
  console.log(`  - ${currentPlayers} current players`);

  // Split mods into chunks (KV limit is 25MB)
  const CHUNK_SIZE = 1800; // Reduced to fit overallRank field
  const modChunks = [];
  for (let i = 0; i < modList.length; i += CHUNK_SIZE) {
    modChunks.push(modList.slice(i, i + CHUNK_SIZE));
  }

  console.log(`  - Splitting into ${modChunks.length} mod chunks...`);
  for (let i = 0; i < modChunks.length; i++) {
    await kv.put(`${KV_KEYS.MODS}:${i}`, JSON.stringify(modChunks[i]));
  }
  // Store metadata
  await kv.put(`${KV_KEYS.MODS}:meta`, JSON.stringify({ total: modList.length, chunks: modChunks.length }));

  // Split servers into chunks
  const serverChunks = [];
  for (let i = 0; i < serverList.length; i += CHUNK_SIZE) {
    serverChunks.push(serverList.slice(i, i + CHUNK_SIZE));
  }

  console.log(`  - Splitting into ${serverChunks.length} server chunks...`);
  for (let i = 0; i < serverChunks.length; i++) {
    await kv.put(`${KV_KEYS.SERVERS}:${i}`, JSON.stringify(serverChunks[i]));
  }
  await kv.put(`${KV_KEYS.SERVERS}:meta`, JSON.stringify({ total: serverList.length, chunks: serverChunks.length }));

  await kv.put(KV_KEYS.STATS, JSON.stringify({ totalMods, totalPlayers: currentPlayers, totalServers }));
  await kv.put(KV_KEYS.LAST_UPDATE, new Date().toISOString());

  console.log('✅ COLLECTOR: Complete!');
  return { servers: totalServers, mods: totalMods };
}

// Helper to read chunked data from KV
async function getChunkedData(kv: CloudflareKVClient, baseKey: string): Promise<any[]> {
  const meta = await kv.get(`${baseKey}:meta`, 'json');
  if (!meta) return [];

  const chunks = [];
  for (let i = 0; i < meta.chunks; i++) {
    const chunk = await kv.get(`${baseKey}:${i}`, 'json');
    if (chunk) chunks.push(...chunk);
  }
  return chunks;
}

async function runTrendingSnapshot() {
  console.log('📈 TRENDING SNAPSHOT: Starting...');

  const kv = new CloudflareKVClient();

  const mods = await getChunkedData(kv, KV_KEYS.MODS) as any[];
  if (!mods) {
    throw new Error('No mods in cache - run collector first');
  }

  const prevData = await kv.get('snapshot:latest', 'json') as any;

  const currentModMap = new Map();
  for (const mod of mods) {
    currentModMap.set(mod.id, mod);
  }

  const rising: any[] = [];
  const falling: any[] = [];
  const newMods: any[] = [];

  if (prevData && prevData.mods) {
    const prevModMap = new Map();
    for (const mod of prevData.mods) {
      prevModMap.set(mod.id, mod);
    }

    for (const [id, currentMod] of currentModMap) {
      const prevMod = prevModMap.get(id);

      if (!prevMod) {
        newMods.push({
          id: currentMod.id,
          name: currentMod.name,
          serverCount: currentMod.serverCount,
          totalPlayers: currentMod.totalPlayers,
          playerRank: currentMod.playerRank,
          serverRank: currentMod.serverRank,
          overallRank: currentMod.overallRank,
          changePlayers: currentMod.totalPlayers,
          changeServers: currentMod.serverCount,
        });
      } else {
        const playerChange = currentMod.totalPlayers - prevMod.totalPlayers;
        const serverChange = currentMod.serverCount - prevMod.serverCount;

        if (playerChange > 50 || serverChange > 5) {
          rising.push({
            id: currentMod.id,
            name: currentMod.name,
            serverCount: currentMod.serverCount,
            totalPlayers: currentMod.totalPlayers,
            playerRank: currentMod.playerRank,
            serverRank: currentMod.serverRank,
            overallRank: currentMod.overallRank,
            changePlayers: playerChange,
            changeServers: serverChange,
          });
        }

        if (playerChange < -50 || serverChange < -5) {
          falling.push({
            id: currentMod.id,
            name: currentMod.name,
            serverCount: currentMod.serverCount,
            totalPlayers: currentMod.totalPlayers,
            playerRank: currentMod.playerRank,
            serverRank: currentMod.serverRank,
            overallRank: currentMod.overallRank,
            changePlayers: playerChange,
            changeServers: serverChange,
          });
        }
      }
    }
  } else {
    for (const mod of mods.slice(0, 50)) {
      newMods.push({
        id: mod.id,
        name: mod.name,
        serverCount: mod.serverCount,
        totalPlayers: mod.totalPlayers,
        playerRank: mod.playerRank,
        serverRank: mod.serverRank,
        overallRank: mod.overallRank,
        changePlayers: mod.totalPlayers,
        changeServers: mod.serverCount,
      });
    }
  }

  rising.sort((a, b) => b.changePlayers - a.changePlayers);
  falling.sort((a, b) => a.changePlayers - b.changePlayers);
  newMods.sort((a, b) => b.totalPlayers - a.totalPlayers);

  const today = new Date().toISOString().split('T')[0];
  const snapshot = {
    date: today,
    timestamp: new Date().toISOString(),
    mods: mods,
    rising: rising.slice(0, 100),
    falling: falling.slice(0, 100),
    new: newMods.slice(0, 100),
  };

  await kv.put('snapshot:latest', JSON.stringify(snapshot));

  console.log(`✅ TRENDING: ${rising.length} rising, ${falling.length} falling, ${newMods.length} new`);
  return { date: today, rising: rising.length, falling: falling.length, new: newMods.length };
}

// CLI
const command = process.argv[2];

(async () => {
  try {
    if (command === 'collect') {
      await runCollector();
    } else if (command === 'trending') {
      await runTrendingSnapshot();
    } else {
      console.log('Usage: npm run collect | trending');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
