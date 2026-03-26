/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  TRENDING_KV: KVNamespace;
  BATTLEMETRICS_API_KEY?: string;
  WEBHOOK_SECRET: string;
};

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
    const cached = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.MODS);
    if (!cached || !Array.isArray(cached)) {
      return c.json({ data: [], meta: { total: 0, limit, offset } });
    }

    let mods = cached as any[];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      mods = mods.filter(m =>
        m.name?.toLowerCase().includes(searchLower) ||
        m.id?.toLowerCase().includes(searchLower)
      );
    }

    const total = mods.length;

    // Sort
    if (sortBy === 'players') mods.sort((a, b) => (b.totalPlayers || 0) - (a.totalPlayers || 0));
    else if (sortBy === 'servers') mods.sort((a, b) => (b.serverCount || 0) - (a.serverCount || 0));
    else if (sortBy === 'name') mods.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else mods.sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999));

    // Paginate
    const data = mods.slice(offset, offset + limit);

    return c.json({ data, meta: { total, limit, offset } });
  } catch (err) {
    return c.json({ data: [], meta: { total: 0, limit, offset, error: String(err) } });
  }
});

// Single Mod Detail
app.get('/api/mods/:modId', async (c) => {
  const modId = c.req.param('modId');

  try {
    const [mods, servers] = await Promise.all([
      getChunkedData(c.env.TRENDING_KV, KV_KEYS.MODS),
      getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS),
    ]);

    if (!mods || !servers) {
      return c.json({ error: 'Not found' }, 404);
    }

    const mod = mods.find((m: any) => m.id === modId);
    if (!mod) {
      return c.json({ error: 'Not found' }, 404);
    }

    // Find servers using this mod
    const modServers = servers.filter((s: any) =>
      s.mods?.some((m: any) => m.id === modId)
    );

    // Calculate ranks
    const byPlayers = [...mods].sort((a, b) => (b.totalPlayers || 0) - (a.totalPlayers || 0));
    const byServers = [...mods].sort((a, b) => (b.serverCount || 0) - (a.serverCount || 0));

    const playerRank = byPlayers.findIndex((m: any) => m.id === modId) + 1;
    const serverRank = byServers.findIndex((m: any) => m.id === modId) + 1;

    return c.json({
      data: {
        ...mod,
        stats: {
          ...mod,
          playerRank: playerRank || 9999,
          serverRank: serverRank || 9999
        },
        servers: modServers
      }
    });
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
    const cached = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS);
    if (!cached || !Array.isArray(cached)) {
      return c.json({ data: [], meta: { total: 0, limit, offset } });
    }

    let servers = cached as any[];

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
    const servers = await getChunkedData(c.env.TRENDING_KV, KV_KEYS.SERVERS);
    if (!servers) {
      return c.json({ error: 'Not found' }, 404);
    }

    const server = servers.find((s: any) => s.id === serverId);
    if (!server) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json({ data: server });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Trending Data - still from KV (unchanged)
app.get('/api/trending', async (c) => {
  try {
    const latestData = await c.env.TRENDING_KV.get('snapshot:latest', 'json') as any;

    if (!latestData) {
      return c.json({
        data: { rising: [], falling: [], new: [] },
        meta: { lastUpdated: null, nextUpdate: null }
      });
    }

    const limit = 50;
    return c.json({
      data: {
        rising: (latestData.rising || []).slice(0, limit),
        falling: (latestData.falling || []).slice(0, limit),
        new: (latestData.new || []).slice(0, limit)
      },
      meta: {
        lastUpdated: latestData.timestamp,
        snapshotDate: latestData.date
      }
    });
  } catch (err) {
    return c.json({
      data: { rising: [], falling: [], new: [] },
      meta: { error: String(err) }
    }, 500);
  }
});

// ============================================================================
// Collector Service (writes to D1 + KV)
// ============================================================================

async function runCollector(env: Bindings) {
  const game = 'reforger';

  console.log("🚀 CLOUDFLARE_COLLECTOR: STARTING IMPORT");

  const allServers: any[] = [];
  const params = new URLSearchParams({
    'filter[game]': game,
    'page[size]': '100'
  });
  let url = `https://api.battlemetrics.com/servers?${params.toString()}`;
  let pageCount = 0;
  const MAX_PAGES = 10;

  try {
    while (url && pageCount < MAX_PAGES) {
      console.log(`📡 FETCHING PAGE ${pageCount + 1}: ${url}`);
      const headers: Record<string, string> = {
        'User-Agent': 'ReforgerMods/1.0',
        'Accept': 'application/json'
      };
      if (env.BATTLEMETRICS_API_KEY) {
        headers['Authorization'] = `Bearer ${env.BATTLEMETRICS_API_KEY}`;
      }
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const servers = data.data || [];
      allServers.push(...servers);
      console.log(`📡 PAGE ${pageCount + 1}: ${servers.length} servers | TOTAL: ${allServers.length}`);

      url = data.links?.next || '';
      pageCount++;

      if (url) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ FETCHED ${allServers.length} TOTAL SERVERS`);

    // ============================================================================
    // 1. Write to D1 (backup)
    // ============================================================================

    const statements: any[] = [];
    const modMap = new Map<string, any>();

    for (const server of allServers) {
      const { id, attributes } = server;
      const reforgerMods = attributes.details?.reforger?.mods || [];

      // Server upsert
      statements.push(env.DB.prepare(`
        INSERT INTO Server (id, name, ip, port, players, maxPlayers, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, ip=excluded.ip, port=excluded.port,
          players=excluded.players, maxPlayers=excluded.maxPlayers,
          updatedAt=excluded.updatedAt
      `).bind(id, attributes.name, attributes.ip || '', attributes.port || 0, attributes.players, attributes.maxPlayers));

      // Process mods
      for (const sm of reforgerMods) {
        modMap.set(sm.modId, {
          id: sm.modId,
          name: sm.name || "Unknown Module",
        });

        statements.push(env.DB.prepare(`
          INSERT INTO Mod (id, name, thumbnail, createdAt, updatedAt)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, updatedAt = CURRENT_TIMESTAMP
        `).bind(sm.modId, sm.name || "Unknown Module", null));

        statements.push(env.DB.prepare(`
          INSERT INTO ServerMod (serverId, modId)
          VALUES (?, ?)
          ON CONFLICT(serverId, modId) DO NOTHING
        `).bind(id, sm.modId));
      }
    }

    console.log(`📦 PREPARED ${statements.length} STATEMENTS`);
    if (statements.length > 0) {
      for (let i = 0; i < statements.length; i += 50) {
        await env.DB.batch(statements.slice(i, i + 50));
      }
    }

    // Update stats in D1
    console.log("📊 UPDATING D1 STATS...");
    await env.DB.prepare("UPDATE Mod SET serverCount = 0, totalPlayers = 0").run();
    await env.DB.prepare(`
      UPDATE Mod SET
        serverCount = (SELECT COUNT(*) FROM ServerMod WHERE modId = Mod.id),
        totalPlayers = COALESCE((SELECT SUM(s.players) FROM Server s JOIN ServerMod sm ON s.id = sm.serverId WHERE sm.modId = Mod.id), 0)
    `).run();

    // ============================================================================
    // 2. Build data for KV cache (compute all in memory)
    // ============================================================================

    console.log("📦 BUILDING KV CACHE...");

    // Get all mods with their stats from D1
    const { results: rawMods } = await env.DB.prepare(
      "SELECT id, name, serverCount, totalPlayers FROM Mod WHERE serverCount > 0"
    ).all();

    const mods = (rawMods as any[]) || [];

    // Calculate ranks in memory
    const byPlayers = [...mods].sort((a, b) => (b.totalPlayers || 0) - (a.totalPlayers || 0));
    const byServers = [...mods].sort((a, b) => (b.serverCount || 0) - (a.serverCount || 0));

    const playerRanks = new Map(byPlayers.map((m, i) => [m.id, i + 1]));
    const serverRanks = new Map(byServers.map((m, i) => [m.id, i + 1]));

    // Create mod list with all computed data
    const modList = mods.map(m => ({
      id: m.id,
      name: m.name,
      serverCount: m.serverCount,
      totalPlayers: m.totalPlayers,
      overallRank: Math.floor((playerRanks.get(m.id)! + serverRanks.get(m.id)!) / 2),
    }));

    // Get all server-mod relationships in ONE query
    const { results: allServerMods } = await env.DB.prepare(
      "SELECT sm.serverId, sm.modId FROM ServerMod sm"
    ).all();

    // Build server-mod map
    const serverModMap = new Map<string, string[]>();
    for (const sm of (allServerMods as any[])) {
      if (!serverModMap.has(sm.serverId)) {
        serverModMap.set(sm.serverId, []);
      }
      serverModMap.get(sm.serverId)!.push(sm.modId);
    }

    // Get servers
    const { results: rawServers } = await env.DB.prepare(
      "SELECT s.id, s.name, s.ip, s.port, s.players, s.maxPlayers FROM Server s ORDER BY s.players DESC"
    ).all();

    const serverList = (rawServers as any[]).map(s => ({
      id: s.id,
      name: s.name,
      ip: s.ip,
      port: s.port,
      players: s.players,
      maxPlayers: s.maxPlayers,
      mods: (serverModMap.get(s.id) || []).map(modId => {
        const mod = modList.find(m => m.id === modId);
        return mod ? { id: mod.id, name: mod.name, rank: mod.overallRank } : null;
      }).filter(Boolean)
    }));

    // Global stats
    const totalMods = mods.length;
    const totalPlayers = mods.reduce((sum, m) => sum + (m.totalPlayers || 0), 0);
    const totalServers = serverList.length;

    // ============================================================================
    // 3. Write to KV (active read cache)
    // ============================================================================

    console.log("✍️  WRITING TO KV CACHE...");

    await Promise.all([
      env.TRENDING_KV.put(KV_KEYS.MODS, JSON.stringify(modList)),
      env.TRENDING_KV.put(KV_KEYS.SERVERS, JSON.stringify(serverList)),
      env.TRENDING_KV.put(KV_KEYS.STATS, JSON.stringify({ totalMods, totalPlayers, totalServers })),
      env.TRENDING_KV.put(KV_KEYS.LAST_UPDATE, new Date().toISOString()),
    ]);

    console.log("✅ CLOUDFLARE_COLLECTOR: COMPLETE");
    return {
      servers: allServers.length,
      mods: modList.length,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ COLLECTOR_ERROR:", err);
    throw err;
  }
}

// Trending Snapshot Service (unchanged - already uses KV)
async function runTrendingSnapshot(env: Bindings) {
  console.log("📈 TRENDING_SNAPSHOT: STARTING");

  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    const mods = await env.TRENDING_KV.get(KV_KEYS.MODS, 'json') as any[];
    if (!mods) {
      throw new Error('No mods in cache');
    }

    const prevData = await env.TRENDING_KV.get('snapshot:latest', 'json') as any;

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
            overallRank: currentMod.overallRank,
            changePlayers: currentMod.totalPlayers,
            changeServers: currentMod.serverCount
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
              overallRank: currentMod.overallRank,
              changePlayers: playerChange,
              changeServers: serverChange,
              prevRank: prevMod.overallRank,
              currentRank: currentMod.overallRank
            });
          }

          if (playerChange < -50 || serverChange < -5) {
            falling.push({
              id: currentMod.id,
              name: currentMod.name,
              serverCount: currentMod.serverCount,
              totalPlayers: currentMod.totalPlayers,
              overallRank: currentMod.overallRank,
              changePlayers: playerChange,
              changeServers: serverChange,
              prevRank: prevMod.overallRank,
              currentRank: currentMod.overallRank
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
          overallRank: mod.overallRank,
          changePlayers: mod.totalPlayers,
          changeServers: mod.serverCount
        });
      }
    }

    rising.sort((a, b) => b.changePlayers - a.changePlayers);
    falling.sort((a, b) => a.changePlayers - b.changePlayers);
    newMods.sort((a, b) => b.totalPlayers - a.totalPlayers);

    const snapshot = {
      date: today,
      timestamp,
      mods: mods,
      rising: rising.slice(0, 100),
      falling: falling.slice(0, 100),
      new: newMods.slice(0, 100)
    };

    await env.TRENDING_KV.put('snapshot:latest', JSON.stringify(snapshot));
    await env.TRENDING_KV.put(`snapshot:${today}`, JSON.stringify(snapshot), {
      expirationTtl: 30 * 24 * 60 * 60
    });

    console.log(`✅ TRENDING_SNAPSHOT: ${rising.length} rising, ${falling.length} falling, ${newMods.length} new`);

    return {
      date: today,
      rising: rising.length,
      falling: falling.length,
      new: newMods.length
    };
  } catch (err) {
    console.error("❌ TRENDING_SNAPSHOT_ERROR:", err);
    throw err;
  }
}

// Manual trigger endpoints
app.get('/api/collect', async (c) => {
  try {
    const stats = await runCollector(c.env);
    return c.json({ success: true, ...stats });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

app.get('/api/trending/snapshot', async (c) => {
  try {
    const result = await runTrendingSnapshot(c.env);
    return c.json({ success: true, ...result });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Public webhook for cron-job.org
// Usage: https://armamods-leaderboard.pauliusmed.workers.dev/api/webhook/collect?key=YOUR_SECRET_KEY
app.get('/api/webhook/collect', async (c) => {
  const key = c.req.query('key');

  // Check for webhook key (set as secret in wrangler)
  if (key !== c.env.WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Directly trigger collector in the background
    c.executionCtx.waitUntil(runCollector(c.env));

    return c.json({
      success: true,
      message: 'Collection triggered in background',
      note: 'Collector is now running on Cloudflare'
    });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Status endpoint - check if collection is needed
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
    if (cron === '0 */4 * * *') {
      ctx.waitUntil(runCollector(env));
    }
    if (cron === '0 3 * * *') {
      ctx.waitUntil(runTrendingSnapshot(env));
    }
  },
};
