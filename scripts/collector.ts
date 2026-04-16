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
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(this.baseUrl(`/values/${key}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'text/plain',
        },
        body: value,
      });
      
      if (response.status === 429 && i < maxRetries - 1) {
        const delay = 2000 * (i + 1);
        console.log(`  ⚠️ Rate limited (429). Retrying in ${delay/1000}s... (Bandymas ${i+1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`KV put failed: ${response.status}`);
      }
      return;
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    TRENDING: `cache:trending${suffix}`,
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

    // Arma 3 uses modIds/modNames arrays, Reforger uses mods array
    let gameMods: Array<{modId: string; name: string}> = [];
    if (game === 'arma3') {
      const modIds = attributes.details?.modIds || [];
      const modNames = attributes.details?.modNames || [];
      gameMods = modIds.filter((mid: any) => mid != null).map((mid: number, idx: number) => ({
        modId: mid.toString(),
        name: modNames[idx] || `Mod ${mid}`
      }));
    } else {
      gameMods = attributes.details?.reforger?.mods || [];
    }

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
      // Skip mod ID 0 (base game, not an actual mod)
      if (sm.modId === '0' || sm.modId === 0) continue;

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

  // Create a map for faster server lookups
  const serverMap = new Map(serverList.map(s => [s.id, s]));

  // Calculate mod stats
  console.log(`📊 Processing ${serverMods.length} mod-server associations...`);
  for (const sm of serverMods) {
    const mod = modMap.get(sm.modId);
    if (mod) {
      const server = serverMap.get(sm.serverId);
      if (server) {
        mod.serverCount++;
        mod.totalPlayers += (server.players || 0);
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

  try {
    // Split mods into chunks (KV limit is 25MB)
    const MOD_CHUNK_SIZE = 5000; 
    const modChunks = [];
    for (let i = 0; i < modList.length; i += MOD_CHUNK_SIZE) {
      modChunks.push(modList.slice(i, i + MOD_CHUNK_SIZE));
    }

    console.log(`  - Writing mod chunks...`);
    for (let i = 0; i < modChunks.length; i++) {
      try {
        await kv.put(`${KV_KEYS.MODS}:${i}`, JSON.stringify(modChunks[i]));
        console.log(`    [OK] Mod chunk ${i+1}/${modChunks.length}`);
      } catch (err) {
        console.error(`    [FAIL] Mod chunk ${i+1}:`, err);
        throw err;
      }
    }

    // Store metadata
    await kv.put(`${KV_KEYS.MODS}:meta`, JSON.stringify({ total: modList.length, chunks: modChunks.length }));

    // Split servers into chunks
    const SERVER_CHUNK_SIZE = 500;
    const serverChunks = [];
    for (let i = 0; i < serverList.length; i += SERVER_CHUNK_SIZE) {
      serverChunks.push(serverList.slice(i, i + SERVER_CHUNK_SIZE));
    }

    console.log(`  - Writing server chunks...`);
    for (let i = 0; i < serverChunks.length; i++) {
      try {
        await kv.put(`${KV_KEYS.SERVERS}:${i}`, JSON.stringify(serverChunks[i]));
        console.log(`    [OK] Server chunk ${i+1}/${serverChunks.length}`);
      } catch (err) {
        console.error(`    [FAIL] Server chunk ${i+1}:`, err);
        throw err;
      }
    }
    await kv.put(`${KV_KEYS.SERVERS}:meta`, JSON.stringify({ total: serverList.length, chunks: serverChunks.length }));

    await kv.put(KV_KEYS.STATS, JSON.stringify({ totalMods, totalPlayers: currentPlayers, totalServers }));
    await kv.put(KV_KEYS.LAST_UPDATE, new Date().toISOString());
    console.log(`✅ KV write completed successfully`);
  } catch (kvWriteErr) {
    console.error(`❌ KV Sync Error Detail:`, kvWriteErr);
    throw kvWriteErr;
  }

  console.log("💾 UPDATING KV HISTORY (SHARDED JSON)...");
  const today = new Date().toISOString().split('T')[0];
  const MOD_HISTORY_CHUNK_SIZE = 5000;
  
  try {
    const statsMap: Record<string, { p: number, s: number, r: number }> = {};
    for (const m of modList) {
      statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
    }

    const periods = [
      { name: 'hourly', key: `history:hourly:${game}`, limit: 24 },
      { name: 'daily', key: `history:daily:${game}`, limit: 90 },
      { name: 'monthly', key: `history:monthly:${game}`, limit: 60 },
      { name: 'yearly', key: `history:yearly:${game}`, limit: 10 }
    ];

    for (const period of periods) {
      const timeLabel = period.name === 'hourly' ? new Date().toISOString() : 
                        period.name === 'monthly' ? today.substring(0, 7) : 
                        period.name === 'yearly' ? today.substring(0, 4) : today;

      // Skaidome modus į blokus istorijai
      const modIds = Object.keys(statsMap);
      const chunks = [];
      for (let i = 0; i < modIds.length; i += MOD_HISTORY_CHUNK_SIZE) {
        chunks.push(modIds.slice(i, i + MOD_HISTORY_CHUNK_SIZE));
      }

      console.log(`  - Processing ${period.name} history (${chunks.length} shards)...`);

      for (let i = 0; i < chunks.length; i++) {
        const shardKey = `${period.key}:${i}`;
        const shardModIds = chunks[i];
        const shardStats: Record<string, any> = {};
        for (const id of shardModIds) shardStats[id] = statsMap[id];

        const history = await kv.get(shardKey, 'json') || [];
        const updated = [...history.filter((d: any) => d.time !== timeLabel), { time: timeLabel, mods: shardStats }].slice(-period.limit);
        
        await kv.put(shardKey, JSON.stringify(updated));
        await sleep(500);
      }
      
      // Store meta for this period
      await kv.put(`${period.key}:meta`, JSON.stringify({ chunks: chunks.length, totalMods: modIds.length, lastUpdate: new Date().toISOString() }));
      console.log(`    ✅ ${period.name.toUpperCase()} shards updated`);
    }
  } catch (kvErr) {
    console.error("⚠️ KV History Error:", kvErr);
  }

  console.log('✅ COLLECTOR: Complete!');
  return { servers: totalServers, mods: totalMods };
}

// Pagalbinė funkcija surinkti visus istorijos blokus į vieną map'ą (skirta trending skaičiavimams)
async function getFullHistoryPoint(kv: CloudflareKVClient, baseKey: string, offsetFromEnd: number): Promise<any> {
    const meta = await kv.get(`${baseKey}:meta`, 'json');
    if (!meta) return null;

    const fullMods: Record<string, any> = {};
    let pointTime = '';

    for (let i = 0; i < meta.chunks; i++) {
        const shard = await kv.get(`${baseKey}:${i}`, 'json');
        if (shard && shard.length > 0) {
            const point = shard[shard.length - offsetFromEnd] || shard[0];
            if (point) {
                pointTime = point.time;
                Object.assign(fullMods, point.mods);
            }
        }
    }
    return pointTime ? { time: pointTime, mods: fullMods } : null;
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

  try {
    const mods = await getChunkedData(kv, KV_KEYS.MODS);
    if (!mods || mods.length === 0) {
      throw new Error('No mods in cache - run collector first');
    }

    // ---------------------------------------------------------
    // TRENDING CALCULATION (Using sharded history)
    // ---------------------------------------------------------
    const periods = [
        { name: '24h', days: 1, baseKey: `history:daily:${game}` },
        { name: '7d', days: 7, baseKey: `history:daily:${game}` },
        { name: '30d', days: 30, baseKey: `history:daily:${game}` },
        { name: '90d', days: 90, baseKey: `history:daily:${game}` }
    ];

    for (const p of periods) {
        // Paimame istorinį tašką iš visų blokų
        let prevEntry = await getFullHistoryPoint(kv, p.baseKey, p.days);
        
        if (!prevEntry && p.days > 30) {
            const monthsBack = Math.ceil(p.days / 30);
            prevEntry = await getFullHistoryPoint(kv, `history:monthly:${game}`, monthsBack);
            if (prevEntry) console.log(`  [SMART LOOKUP] Using monthly sharded snapshot for ${p.name} trend`);
        }
        
        if (!prevEntry) {
            prevEntry = await getFullHistoryPoint(kv, p.baseKey, 999); // Fallback to oldest available
        }

        const prevMap = new Map();
        if (prevEntry?.mods) {
            Object.entries(prevEntry.mods).forEach(([id, s]: any) => prevMap.set(id, s));
        }

        const rising: any[] = [];
        const falling: any[] = [];
        const newMods: any[] = [];
        
        // Gauname bendrą statistiką dinaminiams slenksčiams (0.5%)
        const stats = await kv.get(KV_KEYS.STATS, 'json') || { totalPlayers: 5000, totalServers: 500 };
        const MIN_TREND_PLAYERS = Math.max(5, Math.floor(stats.totalPlayers * 0.005));
        const MIN_TREND_SERVERS = Math.max(2, Math.floor(stats.totalServers * 0.005));

        console.log(`📊 Dynamic Thresholds: Personnel >= ${MIN_TREND_PLAYERS}, Deployments >= ${MIN_TREND_SERVERS}`);

        for (const mod of mods) {
            const prev = prevMap.get(mod.id);
            const currentRank = mod.overallRank || 50000;
            const currentPlayers = mod.totalPlayers || 0;
            const currentServers = mod.serverCount || 0;
            
            const prevRank = prev?.r || 50000;
            const prevPlayers = prev?.p || 0;
            const prevServers = prev?.s || 0;

            // Reikšmingumo filtras: modas turi turėti pakankamai veiklos dabar arba praeityje
            const isSignificant = (currentPlayers >= MIN_TREND_PLAYERS || prevPlayers >= MIN_TREND_PLAYERS) &&
                                  (currentServers >= MIN_TREND_SERVERS || prevServers >= MIN_TREND_SERVERS);

            if (!prev) {
                // New Popular: traukiami tik tie nauji modai, kurie pasiekė bazinį aktyvumo lygį
                if (isSignificant && currentRank < 10000) {
                    newMods.push({ ...mod, trendScore: (50000 - currentRank) });
                }
            } else {
                const rankDelta = prevRank - currentRank;
                
                // Ignoruojame neaktyvius modus arba tuos, kieno reitingas nepakito
                if (!isSignificant || rankDelta === 0) continue;

                // Matematinis modelis:
                // 1. Pozicijos svoris (sunkiau pakilti Top 100 nei Top 5000)
                const positionWeight = 100 / Math.sqrt(Math.min(currentRank, prevRank));
                
                // 2. Aktyvumo daugiklis (logaritminis žaidėjų skaičius)
                const activityMultiplier = Math.log10(Math.max(currentPlayers, prevPlayers) + 1.1);
                
                const trendScore = rankDelta * positionWeight * activityMultiplier;

                if (rankDelta > 0) {
                    rising.push({ ...mod, currentRank, prevRank, rankDelta, trendScore });
                } else {
                    falling.push({ ...mod, currentRank, prevRank, rankDelta, trendScore });
                }
            }
        }

        rising.sort((a, b) => b.trendScore - a.trendScore);
        falling.sort((a, b) => a.trendScore - b.trendScore);
        newMods.sort((a, b) => a.overallRank - b.overallRank);

        const result = {
            rising: rising.slice(0, 50),
            new: newMods.slice(0, 50),
            falling: falling.slice(0, 50)
        };

        await kv.put(`${KV_KEYS.TRENDING}:${p.name}`, JSON.stringify(result));
        console.log(`✅ TRENDING UPDATED for ${p.name}`);
        await sleep(500);
    }

    console.log(`✅ ROLLUP & TRENDING COMPLETED SUCCESSFULLY`);
    return { success: true };

  } catch (kvErr) {
    console.error("⚠️ Failed to update history/trending:", kvErr);
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
