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

  console.log("💾 UPDATING KV HISTORY...");
  const statsMap: Record<string, { p: number, s: number, r: number }> = {};
  for (const m of modList) {
    statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
  }

  try {
    // Hourly (24 points)
    const historyHourly = await kv.get(`history:hourly:${game}`, 'json') || [];
    const updatedHourly = [...historyHourly, { time: new Date().toISOString(), mods: statsMap }].slice(-24);
    await kv.put(`history:hourly:${game}`, JSON.stringify(updatedHourly));
    console.log("✅ HOURLY updated (24 points)");

    // Daily (90 points for quarterly trends)
    const today = new Date().toISOString().split('T')[0];
    const historyDaily = await kv.get(`history:daily:${game}`, 'json') as any[] || [];
    const updatedDaily = [...historyDaily.filter((d: any) => d.time !== today), { time: today, mods: statsMap }].slice(-90);
    await kv.put(`history:daily:${game}`, JSON.stringify(updatedDaily));
    console.log("✅ DAILY updated (90 points)");

    // Monthly (60 points)
    const thisMonth = today.substring(0, 7);
    const historyMonthly = await kv.get(`history:monthly:${game}`, 'json') as any[] || [];
    const updatedMonthly = [...historyMonthly.filter((d: any) => d.time !== thisMonth), { time: thisMonth, mods: statsMap }].slice(-60);
    await kv.put(`history:monthly:${game}`, JSON.stringify(updatedMonthly));
    console.log("✅ MONTHLY updated (60 points)");

    // Yearly (10 points)
    const thisYear = today.substring(0, 4);
    const historyYearly = await kv.get(`history:yearly:${game}`, 'json') as any[] || [];
    const updatedYearly = [...historyYearly.filter((d: any) => d.time !== thisYear), { time: thisYear, mods: statsMap }].slice(-10);
    await kv.put(`history:yearly:${game}`, JSON.stringify(updatedYearly));
    console.log("✅ YEARLY updated (10 points)");
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

  try {
    const [mods, historyDaily] = await Promise.all([
        getChunkedData(kv, KV_KEYS.MODS),
        kv.get(`history:daily:${game}`, 'json') as Promise<any[]>
    ]);

    if (!mods || mods.length === 0) {
      throw new Error('No mods in cache - run collector first');
    }

    const safeHistory = historyDaily || [];
    const today = new Date().toISOString().split('T')[0];
    
    // ---------------------------------------------------------
    // 1. ROLLUP LOGIC (Daily, Monthly, Yearly)
    // ---------------------------------------------------------
    const statsMap: Record<string, { p: number, s: number, r: number }> = {};
    for (const m of mods) {
      statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
    }

    const dailyPoint = { time: today, mods: statsMap };

    // Update Daily
    const updatedDaily = [...safeHistory.filter((d:any) => d.time !== today), dailyPoint].slice(-90);
    await kv.put(`history:daily:${game}`, JSON.stringify(updatedDaily));
    
    // Update Monthly
    const thisMonth = today.substring(0, 7);
    const historyMonthly = await kv.get(`history:monthly:${game}`, 'json') || [];
    const updatedMonthly = [...(historyMonthly as any[]).filter((d:any) => d.time !== thisMonth), { time: thisMonth, mods: statsMap }].slice(-60);
    await kv.put(`history:monthly:${game}`, JSON.stringify(updatedMonthly));

    // Update Yearly
    const thisYear = today.substring(0, 4);
    const historyYearly = await kv.get(`history:yearly:${game}`, 'json') || [];
    const updatedYearly = [...(historyYearly as any[]).filter((d:any) => d.time !== thisYear), { time: thisYear, mods: statsMap }].slice(-10);
    await kv.put(`history:yearly:${game}`, JSON.stringify(updatedYearly));

    // ---------------------------------------------------------
    // 2. TRENDING CALCULATION (Pre-calculate for specific periods)
    // ---------------------------------------------------------
    const periods = [
        { name: '24h', days: 1 },
        { name: '7d', days: 7 },
        { name: '30d', days: 30 },
        { name: '90d', days: 90 }
    ];

    for (const p of periods) {
        let prevEntry = updatedDaily[updatedDaily.length - p.days];
        
        // Smart Lookup: if daily is too short, use monthly snapshots for long periods
        if (!prevEntry && p.days > 30) {
            const monthsBack = Math.ceil(p.days / 30);
            const historyMonthly = await kv.get(`history:monthly:${game}`, 'json') || [];
            prevEntry = (historyMonthly as any[])[(historyMonthly as any[]).length - monthsBack];
            if (prevEntry) console.log(`  [SMART LOOKUP] Using monthly snapshot for ${p.name} trend`);
        }
        
        if (!prevEntry) prevEntry = updatedDaily[0] || { mods: {} };

        const prevMap = new Map();
        if (prevEntry?.mods) {
            Object.entries(prevEntry.mods).forEach(([id, s]: any) => prevMap.set(id, s));
        }

        const rising: any[] = [];
        const falling: any[] = [];
        const newMods: any[] = [];
        
        const MIN_SERVERS_ACTIVE = 3;   // Reikia bent 3 serverių, kad būtų "aktyvus"
        const MIN_SERVERS_NEW = 5;      // Naujiems populiariems reikia bent 5
        const MIN_PLAYERS_RISING = 1;   // Kylančiam modui reikia bent 1 žaidėjo
        const RANK_THRESHOLD = 5000;    // Ignoruojame Triukšmą už #5000 ribos

        for (const mod of mods) {
            const prev = prevMap.get(mod.id);
            const currentRank = mod.overallRank || 9999;
            const currentPlayers = mod.totalPlayers || 0;
            const currentServers = mod.serverCount || 0;

            if (!prev) {
                // Was not in index X days ago - candidate for New Popular
                // Reikalaujame bent 5 serverių ir bent 5 žaidėjų naujoms modifikacijoms
                if (currentServers >= MIN_SERVERS_NEW && currentPlayers >= 5) {
                    newMods.push({ ...mod, trendScore: (10000 - currentRank) });
                }
            } else {
                const prevRank = prev.r || 9999;
                const rankDelta = prevRank - currentRank;
                
                // Ignoruojame pokyčius, jei abi pozicijos yra už 5000 ribos (triukšmas)
                if (currentRank > RANK_THRESHOLD && prevRank > RANK_THRESHOLD) continue;

                // --- MATEMATINIS MODELIS: Momentum Score ---
                // 1. Rango santykio logaritmas (log2 užtikrina, kad dvigubas pagerėjimas visur būtų lygus 1 balui)
                const rankRatio = prevRank / currentRank;
                const rankLog = Math.log2(rankRatio);

                // 2. Aktyvumo daugiklis (log10 naudojamas, kad žaidėjų/serverių skaičius neperimtų visos įtakos)
                // log10(101) = 2, log10(1001) = 3. Tai subalansuoja mases.
                const activityLog = Math.log10(currentPlayers + 1) + Math.log10(currentServers + 1);

                // Galutinis balas: Rango "greitis" * Aktyvumo "svoris"
                const momentumScore = rankLog * activityLog;

                if (rankDelta > 0) {
                    // Rising: reikalaujame bent min aktyvumo
                    if (currentServers >= MIN_SERVERS_ACTIVE && currentPlayers >= MIN_PLAYERS_RISING) {
                        rising.push({ ...mod, currentRank, prevRank, rankDelta, trendScore: momentumScore });
                    }
                } else if (rankDelta < 0) {
                    // Falling: tas pats modelis veikia ir kritimui (bus neigiamas balas)
                    falling.push({ ...mod, currentRank, prevRank, rankDelta, trendScore: momentumScore });
                }
            }
        }

        rising.sort((a, b) => b.trendScore - a.trendScore);
        falling.sort((a, b) => a.trendScore - b.trendScore); // Mažiausias (labiausiai neigiamas) balas pirmas
        newMods.sort((a, b) => a.overallRank - b.overallRank);

        const result = {
            rising: rising.slice(0, 50),
            new: newMods.slice(0, 50),
            falling: falling.slice(0, 50)
        };

        await kv.put(`${KV_KEYS.TRENDING}:${p.name}`, JSON.stringify(result));
        console.log(`✅ TRENDING UPDATED for ${p.name}`);
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
