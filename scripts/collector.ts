#!/usr/bin/env node
/**
 * Collector - fetches data from BattleMetrics and pushes to Cloudflare KV
 * Runs outside of Cloudflare (GitHub Actions, local machine) to avoid IP blocks
 *
 * Usage: npm run collect [-- --game=reforger|arma3]
 */

import 'dotenv/config';
import { BattleMetricsService, GameType } from '../src/services/battlemetrics.js';

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

// Parse game type from CLI
function parseGameType(): GameType {
  const gameArg = process.argv.find(arg => arg.startsWith('--game='));
  const game = gameArg?.split('=')[1] as GameType;
  return game === 'arma3' ? 'arma3' : 'reforger';
}

function getKVKeys(game: GameType) {
  const suffix = game === 'arma3' ? ':arma3' : '';
  return {
    MODS: `cache:mods${suffix}`,
    SERVERS: `cache:servers${suffix}`,
    STATS: `cache:stats${suffix}`,
    LAST_UPDATE: `cache:lastUpdate${suffix}`,
  };
}

interface ServerMod {
  serverId: string;
  modId: string;
}

async function runCollector() {
  const game = parseGameType();
  console.log(`🚀 COLLECTOR: Starting for ${game.toUpperCase()}...`);

  const kv = new CloudflareKVClient();
  const bm = new BattleMetricsService(game);
  const KV_KEYS = getKVKeys(game);

  console.log('📡 Fetching servers from BattleMetrics...');
  const servers = await bm.fetchAllServers(false); // fetch ALL servers
  console.log(`✅ Fetched ${servers.length} servers`);

  // Build data structures
  const serverList: any[] = [];
  const serverMods: ServerMod[] = [];
  const modMap = new Map<string, { id: string; name: string; serverCount: number; totalPlayers: number; }>();

  for (const server of servers) {
    const { id, attributes } = server;
    const gameMods = game === 'arma3'
      ? (attributes.details?.arma3?.mods || [])
      : (attributes.details?.reforger?.mods || []);

    serverList.push({
      id,
      name: attributes.name,
      ip: attributes.ip || '',
      port: attributes.port || 0,
      players: attributes.players,
      maxPlayers: attributes.maxPlayers,
      mods: [] as any[],
    });

    for (const sm of gameMods) {
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
  const totalServers = serverList.length;
  const byPlayers = [...mods].sort((a, b) => b.totalPlayers - a.totalPlayers);
  const byServers = [...mods].sort((a, b) => b.serverCount - a.serverCount);

  const playerRanks = new Map(byPlayers.map((m, i) => [m.id, i + 1]));
  const serverRanks = new Map(byServers.map((m, i) => [m.id, i + 1]));

  // Create mod list with ranks
  let modList = mods.map(m => ({
    id: m.id,
    name: m.name,
    serverCount: m.serverCount,
    totalPlayers: m.totalPlayers,
    playerRank: playerRanks.get(m.id)!,
    serverRank: serverRanks.get(m.id)!,
    overallRank: Math.round((playerRanks.get(m.id)! + serverRanks.get(m.id)!) / 2),
    marketShare: totalServers > 0 ? ((m.serverCount / totalServers) * 100) : 0,
  }));

  // Sort by overallRank, then by totalPlayers (desc) for tie-breaking, then assign sequential ranks
  modList.sort((a, b) => {
    if (a.overallRank !== b.overallRank) return a.overallRank - b.overallRank;
    return b.totalPlayers - a.totalPlayers; // More players = better rank
  });
  modList = modList.map((m, i) => ({ ...m, overallRank: i + 1 }));

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
  const currentPlayers = serverList.reduce((sum, s) => sum + s.players, 0);

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

  console.log("💾 UPDATING KV HOURLY HISTORY...");
  try {
    const historyHourly = await kv.get(`history:hourly:${game}`, 'json') || [];
    const statsMap: Record<string, { p: number, s: number, r: number }> = {};
    for (const m of modList) {
      statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
    }
    const updatedHourly = [...historyHourly, { time: new Date().toISOString(), mods: statsMap }].slice(-24);
    await kv.put(`history:hourly:${game}`, JSON.stringify(updatedHourly));
    console.log("✅ HOURLY KV HISTORY UPDATED!");
  } catch (kvErr) {
    console.error("⚠️ KV Error:", kvErr);
  }

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
  const game = parseGameType();
  console.log(`📈 TRENDING SNAPSHOT: Starting for ${game.toUpperCase()}...`);

  const kv = new CloudflareKVClient();
  const KV_KEYS = getKVKeys(game);

  const mods = await getChunkedData(kv, KV_KEYS.MODS) as any[];
  if (!mods || mods.length === 0) {
    throw new Error('No mods in cache - run collector first');
  }

  const today = new Date().toISOString().split('T')[0];
  console.log("📊 SAVING DAILY KV SNAPSHOT...");

  try {
    const historyDaily = await kv.get(`history:daily:${game}`, 'json') || [];
    
    const statsMap: Record<string, { p: number, s: number, r: number }> = {};
    for (const m of mods) {
      statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
    }

    const dailyPoint = {
      time: today,
      mods: statsMap
    };

    const updatedDaily = [...historyDaily, dailyPoint].slice(-90);
    await kv.put(`history:daily:${game}`, JSON.stringify(updatedDaily));
    
    console.log("✅ DAILY KV HISTORY UPDATED (90-day window)");
    return { success: true, date: today };
  } catch (kvErr) {
    console.error("⚠️ Failed to update daily KV:", kvErr);
    throw kvErr;
  }
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

// Usage examples:
// npm run collect              # Collect Reforger (default)
// npm run collect -- --game=arma3  # Collect Arma 3
// npm run trending             # Trending snapshot for Reforger
// npm run trending -- --game=arma3 # Trending snapshot for Arma 3
