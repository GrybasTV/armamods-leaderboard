/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Mod {
  id: string;
  name: string;
  serverCount: number;
  totalPlayers: number;
  overallRank: number;
  marketShare: number;
}

interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  players: number;
  maxPlayers: number;
  mods: Array<{ id: string; name: string; rank: number } | null>;
}

interface ModSnapshot {
  p: number; // Players
  s: number; // Servers
  r: number; // Rank
}

interface HistoryPoint {
  time: string;
  mods: Record<string, ModSnapshot>;
}

interface Bindings {
  DB: D1Database;
  TRENDING_KV: KVNamespace;
  BATTLEMETRICS_API_KEY?: string;
  WEBHOOK_SECRET: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// Basic CORS to allow website communication
app.use('*', cors());
app.get('/', (c) => c.text('ARMAMODS Leaderboard API - Online'));

// KV Keys
const KV_KEYS = {
  MODS: 'cache:mods',
  SERVERS: 'cache:servers',
  STATS: 'cache:stats',
  LAST_UPDATE: 'cache:lastUpdate',
};

// ============================================================================
// API Endpoints (serving from KV - no SQL reads!)
// ============================================================================

// Helper to read chunked data from KV
async function getChunkedData(kv: KVNamespace, baseKey: string): Promise<any[]> {
  try {
    const meta = await kv.get(`${baseKey}:meta`, 'json') as any;
    if (!meta || !meta.chunks) return [];

    const chunks = [];
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = await kv.get(`${baseKey}:${i}`, 'json') as any[];
      if (chunk) chunks.push(...chunk);
    }
    return chunks;
  } catch (err) {
    console.error(`Error reading chunks for ${baseKey}:`, err);
    return [];
  }
}

app.get('/api/stats', async (c) => {
  try {
    const stats = await c.env.TRENDING_KV.get(KV_KEYS.STATS, 'json');
    return c.json(stats || { totalMods: 0, totalPlayers: 0, totalServers: 0 });
  } catch (err) {
    return c.json({ totalMods: 0, totalPlayers: 0, totalServers: 0, error: String(err) });
  }
});

// All Active Mods
app.get('/api/mods', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '1000'), 1000);
  const offset = parseInt(c.req.query('offset') || '0');
  const sortBy = c.req.query('sortBy') || 'overall';
  const search = c.req.query('search') || '';

  try {
    const cached = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.MODS) as Mod[];
    if (!cached || !Array.isArray(cached)) {
      return c.json({ data: [], meta: { total: 0, limit, offset } });
    }

    let modsList = cached;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      modsList = modsList.filter(m =>
        m.name?.toLowerCase().includes(searchLower) ||
        m.id?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'players') modsList.sort((a, b) => b.totalPlayers - a.totalPlayers);
    else if (sortBy === 'servers') modsList.sort((a, b) => b.serverCount - a.serverCount);
    else if (sortBy === 'name') modsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else {
      modsList.sort((a, b) => {
        const rankDiff = (a.overallRank || 9999) - (b.overallRank || 9999);
        return rankDiff !== 0 ? rankDiff : b.totalPlayers - a.totalPlayers;
      });
    }

    return c.json({ data: modsList.slice(offset, offset + limit), meta: { total: modsList.length, limit, offset } });
  } catch (err) {
    return c.json({ data: [], meta: { total: 0, limit, offset, error: String(err) } });
  }
});

// Single Mod Detail
app.get('/api/mods/:modId', async (c) => {
  const modId = c.req.param('modId');

  try {
    const [mods, servers] = await Promise.all([
      getChunkedData(c.env.TRENDING_KV, KV_KEYS.MODS) as Promise<Mod[]>,
      getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS) as Promise<Server[]>,
    ]);

    const mod = mods.find(m => m.id === modId);
    if (!mod) {
      return c.json({ error: 'Not found' }, 404);
    }

    // Find servers using this mod
    const modServers = servers.filter((s: Server) =>
      s.mods?.some((m) => m?.id === modId)
    );

    return c.json({
      data: {
        ...mod,
        stats: {
          ...mod,
          totalMods: mods.length
        },
        servers: modServers
      }
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Mod History (30 days) from KV
app.get('/api/mods/:modId/history', async (c) => {
  const modId = c.req.param('modId');
  const days = Math.min(parseInt(c.req.query('days') || '30'), 365);
  
  try {
    const key = days <= 1 ? 'history:hourly' : 'history:daily';
    const historyData = await c.env.TRENDING_KV.get(key, 'json') as HistoryPoint[] || [];
    
    const modHistory = historyData.slice(-days * (key === 'history:hourly' ? 24 : 1)).map(point => {
      const stats = point.mods[modId] || { p: 0, s: 0, r: 9999 };
      return { date: point.time, totalPlayers: stats.p, serverCount: stats.s, overallRank: stats.r };
    }).filter(d => d.totalPlayers > 0 || d.serverCount > 0);

    return c.json({ data: modHistory });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// All Servers
app.get('/api/servers', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '1000'), 1000);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  try {
    const cached = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS) as Server[];
    if (!cached || !Array.isArray(cached)) {
      return c.json({ data: [], meta: { total: 0, limit, offset } });
    }

    let servers = cached;

    if (search) {
      const searchLower = search.toLowerCase();
      servers = servers.filter(s => s.name?.toLowerCase().includes(searchLower));
    }

    const total = servers.length;

    // Sort by players desc
    servers.sort((a, b) => (b.players || 0) - (a.players || 0));

    const data = servers.slice(offset, offset + limit);

    return c.json({ data, meta: { total, limit, offset } });
  } catch (err) {
    return c.json({ data: [], meta: { total: 0, limit, offset, error: String(err) } });
  }
});

// Single Server Detail
app.get('/api/servers/:serverId', async (c) => {
  const serverId = c.req.param('serverId');

  try {
    const servers = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS) as Server[];
    if (!servers) return c.json({ error: 'Not found' }, 404);

    const server = servers.find((s: Server) => s.id === serverId);
    if (!server) return c.json({ error: 'Not found' }, 404);

    return c.json({ data: server });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Trending Data - Now 100% KV-Based
app.get('/api/trending', async (c) => {
  const period = (c.req.query('period') || '24h') as '24h' | '7d' | '30d';

  try {
    const currentMods = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.MODS) as Mod[];
    if (!currentMods || currentMods.length === 0) {
      return c.json({ data: { rising: [], falling: [], new: [] }, meta: { error: 'No current mod data' } });
    }

    const dailyHistory = await c.env.TRENDING_KV.get('history:daily', 'json') as HistoryPoint[] || [];
    const target = new Date();
    if (period === '7d') target.setDate(target.getDate() - 7);
    else if (period === '30d') target.setDate(target.getDate() - 30);
    else target.setDate(target.getDate() - 1);
    const targetDateStr = target.toISOString().split('T')[0];

    const prevEntry = dailyHistory.find(h => h.time.startsWith(targetDateStr)) || dailyHistory[0];
    const prevMap = new Map<string, ModSnapshot>();
    if (prevEntry?.mods) {
      for (const [id, stats] of Object.entries(prevEntry.mods)) {
        prevMap.set(id, stats);
      }
    }

    const rising: any[] = [];
    const falling: any[] = [];
    const newMods: any[] = [];

    for (const mod of currentMods) {
      const prev = prevMap.get(mod.id);
      if (!prev) {
        newMods.push({ ...mod, changePlayers: mod.totalPlayers, changeServers: mod.serverCount });
      } else {
        const rankImprovement = (prev.r || 9999) - (mod.overallRank || 9999);
        const trendInfo = {
          ...mod,
          prevRank: prev.r,
          currentRank: mod.overallRank,
          changePlayers: mod.totalPlayers - (prev.p || 0),
          changeServers: mod.serverCount - (prev.s || 0)
        };
        if (rankImprovement > 0) rising.push(trendInfo);
        else if (rankImprovement < 0) falling.push(trendInfo);
      }
    }

    rising.sort((a, b) => (b.prevRank - b.currentRank) - (a.prevRank - a.currentRank));
    falling.sort((a, b) => (a.currentRank - b.prevRank) - (b.currentRank - b.prevRank));
    newMods.sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999));

    return c.json({
      data: { rising: rising.slice(0, 100), falling: falling.slice(0, 100), new: newMods.slice(0, 100) },
      meta: { period, comparisonDate: prevEntry?.time || 'N/A' }
    });
  } catch (err) {
    return c.json({ data: { rising: [], falling: [], new: [] }, meta: { error: String(err) } }, 500);
  }
});

// ============================================================================
// Collector Service (100% KV-Native)
// ============================================================================

async function runCollector(env: Bindings) {
  const game = 'reforger';
  console.log("🚀 CLOUDFLARE_COLLECTOR: STARTING IMPORT (100% KV)");

  const allServers: any[] = [];
  const params = new URLSearchParams({ 'filter[game]': game, 'page[size]': '100' });
  let url = `https://api.battlemetrics.com/servers?${params.toString()}`;
  let pageCount = 0;
  const MAX_PAGES = 10;

  try {
    while (url && pageCount < MAX_PAGES) {
      const headers: Record<string, string> = { 'User-Agent': 'ReforgerMods/1.0', 'Accept': 'application/json' };
      if (env.BATTLEMETRICS_API_KEY) headers['Authorization'] = `Bearer ${env.BATTLEMETRICS_API_KEY}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json() as any;
      const servers = data.data || [];
      allServers.push(...servers);
      url = data.links?.next || '';
      pageCount++;
      if (url) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const activeModsMap = new Map<string, {id:string, name:string, p:number, s:number}>();
    for (const server of allServers) {
      const players = server.attributes?.players || 0;
      const mods = server.attributes?.details?.reforger?.mods || [];
      for (const sm of mods) {
        if (!sm.modId) continue;
        const existing = activeModsMap.get(sm.modId);
        if (existing) { existing.p += players; existing.s += 1; }
        else activeModsMap.set(sm.modId, { id: sm.modId, name: sm.name || "Unknown Module", p: players, s: 1 });
      }
    }

    const mListRaw = Array.from(activeModsMap.values());
    const totalS = allServers.length;
    const totalP = mListRaw.reduce((sum, m) => sum + m.p, 0);

    const byPlayers = [...mListRaw].sort((a, b) => b.p - a.p);
    const byServers = [...mListRaw].sort((a, b) => b.s - a.s);
    const playerRanks = new Map(byPlayers.map((m, i) => [m.id, i + 1]));
    const serverRanks = new Map(byServers.map((m, i) => [m.id, i + 1]));

    let modList: Mod[] = mListRaw.map((m) => ({
      id: m.id, name: m.name, serverCount: m.s, totalPlayers: m.p,
      overallRank: Math.round((playerRanks.get(m.id)! + serverRanks.get(m.id)!) / 2),
      marketShare: totalS > 0 ? ((m.s / totalS) * 100) : 0,
    }));

    modList.sort((a, b) => {
      const rankDiff = a.overallRank - b.overallRank;
      return rankDiff !== 0 ? rankDiff : b.totalPlayers - a.totalPlayers;
    });
    modList.forEach((m, i) => m.overallRank = i + 1);

    const serverList: Server[] = allServers.map((s: any) => {
      const sMods = s.attributes?.details?.reforger?.mods || [];
      return {
        id: s.id, name: s.attributes?.name, ip: s.attributes?.ip, port: s.attributes?.port,
        players: s.attributes?.players, maxPlayers: s.attributes?.maxPlayers,
        mods: sMods.map((sm: any) => {
          const mod = activeModsMap.get(sm.modId);
          const rank = modList.find(m => m.id === sm.modId)?.overallRank;
          return mod ? { id: mod.id, name: mod.name, rank: rank || 9999 } : null;
        }).filter(Boolean)
      };
    });

    console.log("✍️  WRITING TO KV CACHE...");
    await Promise.all([
      env.TRENDING_KV.put(KV_KEYS.MODS, JSON.stringify(modList)),
      env.TRENDING_KV.put(KV_KEYS.SERVERS, JSON.stringify(serverList)),
      env.TRENDING_KV.put(KV_KEYS.STATS, JSON.stringify({ totalMods: modList.length, totalPlayers: totalP, totalServers: totalS })),
      env.TRENDING_KV.put(KV_KEYS.LAST_UPDATE, new Date().toISOString()),
    ]);

    console.log("💾 UPDATING KV HOURLY HISTORY...");
    try {
      const historyHourly = await env.TRENDING_KV.get('history:hourly', 'json') as HistoryPoint[] || [];
      const statsMap: Record<string, ModSnapshot> = {};
      for (const m of modList) statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
      const updatedHourly = [...historyHourly, { time: new Date().toISOString(), mods: statsMap }].slice(-24);
      await env.TRENDING_KV.put('history:hourly', JSON.stringify(updatedHourly));
    } catch (kvErr) { console.error("⚠️ KV Error:", kvErr); }

    return { servers: totalS, mods: modList.length, timestamp: new Date().toISOString() };
  } catch (err) { console.error("❌ ERROR:", err); throw err; }
}

// Trending Snapshot Service
async function runTrendingSnapshot(env: Bindings) {
  console.log("📈 TRENDING_SNAPSHOT: STARTING");

  try {
    const today = new Date().toISOString().split('T')[0];
    const mods = await getChunkedData(env.TRENDING_KV, KV_KEYS.MODS) as Mod[];
    if (!mods.length) throw new Error('No mods in cache');

    console.log("📊 SAVING DAILY KV SNAPSHOT...");
    try {
      const historyDaily = await env.TRENDING_KV.get('history:daily', 'json') as HistoryPoint[] || [];
      
      const statsMap: Record<string, ModSnapshot> = {};
      for (const m of mods) {
        statsMap[m.id] = { p: m.totalPlayers, s: m.serverCount, r: m.overallRank };
      }

      const dailyPoint = {
        time: today,
        mods: statsMap
      };

      const updatedDaily = [...historyDaily, dailyPoint].slice(-90);
      await env.TRENDING_KV.put('history:daily', JSON.stringify(updatedDaily));
      console.log("✅ DAILY KV HISTORY UPDATED (90-day window)");
    } catch (kvErr) {
      console.error("⚠️ Failed to update daily KV:", kvErr);
    }
    
    return { success: true, date: today };
  } catch (err) {
    console.error("❌ TRENDING_SNAPSHOT_ERROR:", err);
    throw err;
  }
}

// Manual trigger endpoints
app.get('/api/collect', async (c) => {
  try {
    const stats = await runCollector(c.env);
    return c.json(stats);
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

app.get('/api/trending/snapshot', async (c) => {
  try {
    const result = await runTrendingSnapshot(c.env);
    return c.json(result);
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Public webhook for cron-job.org
app.get('/api/webhook/collect', async (c) => {
  const key = c.req.query('key');
  if (key !== c.env.WEBHOOK_SECRET) return c.json({ error: 'Unauthorized' }, 401);

  try {
    c.executionCtx.waitUntil(runCollector(c.env));
    return c.json({ success: true, message: 'Collection triggered in background' });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Status endpoint
app.get('/api/webhook/status', async (c) => {
  const key = c.req.query('key');

  if (key !== c.env.WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const trigger = await c.env.TRENDING_KV.get('webhook:collect:trigger', 'json');
    const lastUpdate = await c.env.TRENDING_KV.get(KV_KEYS.LAST_UPDATE);

    return c.json({
      hasPendingTrigger: !!trigger,
      lastUpdate: lastUpdate || null,
      triggerData: trigger || null
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Worker Entry Point
export default {
  fetch: (request: any, env: any, ctx: any) => app.fetch(request, env, ctx),
  async scheduled(event: any, env: any, ctx: any) {
    const cron = event.cron;
    if (cron === '0 * * * *') {
      ctx.waitUntil(runCollector(env));
    }
    if (cron === '0 3 * * *') {
      ctx.waitUntil(runTrendingSnapshot(env));
    }
  },
};
