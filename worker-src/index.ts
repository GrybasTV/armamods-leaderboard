import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Basic CORS to allow website communication
app.use('*', cors());
app.get('/', (c) => c.text('ARMAMODS Leaderboard API - Online'));

// API Endpoints (Hono + D1)
app.get('/api/collect', async (c) => {
  try {
    const stats = await runCollector(c.env);
    return c.json({ success: true, ...stats });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

app.get('/api/stats', async (c) => {
  try {
    const stats: any = await c.env.DB.prepare(
      "SELECT COALESCE((SELECT COUNT(*) FROM Mod WHERE serverCount > 0), 0) as totalMods, COALESCE((SELECT SUM(players) FROM Server), 0) as totalPlayers, COALESCE((SELECT COUNT(*) FROM Server), 0) as totalServers"
    ).first();
    return c.json(stats || { totalMods: 0, totalPlayers: 0, totalServers: 0 });
  } catch (err) {
    return c.json({ totalMods: 0, totalPlayers: 0, totalServers: 0, error: String(err) });
  }
});

// All Active Mods
app.get('/api/mods', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const sortBy = c.req.query('sortBy') || 'overall';
  const search = c.req.query('search') || '';

  let where = "WHERE serverCount > 0";
  const params: any[] = [];

  if (search) {
    where += " AND (name LIKE ? OR id LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  let order = "ORDER BY overallRank ASC";
  if (sortBy === 'players') order = "ORDER BY totalPlayers DESC";
  else if (sortBy === 'servers') order = "ORDER BY serverCount DESC";
  else if (sortBy === 'name') order = "ORDER BY name ASC";

  try {
    const { results: data } = await c.env.DB.prepare(
      `SELECT * FROM Mod ${where} ${order} LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const stats: any = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM Mod ${where}`
    ).bind(...params).first();
    const total = stats?.count || 0;

    return c.json({ data: data || [], meta: { total, limit, offset } });
  } catch (err) {
    return c.json({ data: [], meta: { total: 0, limit, offset, error: String(err) } });
  }
});

// Single Mod Detail
app.get('/api/mods/:modId', async (c) => {
  const modId = c.req.param('modId');
  const mod: any = await c.env.DB.prepare("SELECT * FROM Mod WHERE modId = ?").bind(modId).first();
  if (!mod) return c.json({ error: 'Not found' }, 404);

  // Get servers for this mod
  const { results: servers } = await c.env.DB.prepare(
    "SELECT s.* FROM Server s JOIN ServerMod sm ON s.id = sm.serverId WHERE sm.modId = (SELECT id FROM Mod WHERE modId = ?) ORDER BY s.players DESC"
  ).bind(modId).all();

  return c.json({ data: { ...mod, stats: mod, servers } });
});

// All Servers
app.get('/api/servers', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  let where = "";
  const params: any[] = [];
  if (search) {
    where = "WHERE name LIKE ?";
    params.push(`%${search}%`);
  }

  try {
    const { results: data } = await c.env.DB.prepare(
      `SELECT * FROM Server ${where} ORDER BY players DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const stats: any = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM Server ${where}`
    ).bind(...params).first();
    const total = stats?.count || 0;

    return c.json({ data: data || [], meta: { total, limit, offset } });
  } catch (err) {
    return c.json({ data: [], meta: { total: 0, limit, offset, error: String(err) } });
  }
});

// Single Server Detail
app.get('/api/servers/:serverId', async (c) => {
  const serverId = c.req.param('serverId');
  const server: any = await c.env.DB.prepare("SELECT * FROM Server WHERE id = ?").bind(serverId).first();
  if (!server) return c.json({ error: 'Not found' }, 404);

  const { results: mods } = await c.env.DB.prepare(
    "SELECT m.* FROM Mod m JOIN ServerMod sm ON m.id = sm.modId WHERE sm.serverId = ? ORDER BY m.totalPlayers DESC"
  ).bind(serverId).all();

  return c.json({ data: { ...server, mods: mods.map((m: any) => ({ ...m, rank: m.overallRank })) } });
});

// Collector Service for D1
async function runCollector(env: Bindings) {
  const game = 'reforger';

  console.log("🚀 CLOUDFLARE_COLLECTOR: STARTING IMPORT");

  const allServers: any[] = [];
  let url = `https://api.battlemetrics.com/servers?filter[game]=${game}&page[size]=100`;
  let pageCount = 0;
  const MAX_PAGES = 10; // Limit to 10 pages (1000 servers) to fit in Worker time limits

  try {
    // Fetch servers with pagination (limited to MAX_PAGES)
    while (url && pageCount < MAX_PAGES) {
      console.log(`📡 FETCHING PAGE ${pageCount + 1}: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ReforgerMods/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const servers = data.data || [];
      allServers.push(...servers);
      console.log(`📡 PAGE ${pageCount + 1}: ${servers.length} servers | TOTAL: ${allServers.length}`);

      // Get next page
      url = data.links?.next || '';
      pageCount++;

      // Rate limiting without API key: 60 req/min (1 second delay)
      if (url) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ FETCHED ${allServers.length} TOTAL SERVERS`);

    const statements: any[] = [];
    const modMap = new Map();

    for (const server of allServers) {
      const { id, attributes } = server;
      const reforgerMods = attributes.details?.reforger?.mods || [];
      if (pageCount < 3) console.log(`📡 SERVER ${attributes.name} HAS ${reforgerMods.length} MODS`);
      
      // Server statement
      statements.push(env.DB.prepare(`
        INSERT INTO Server (id, name, ip, port, players, maxPlayers, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name=excluded.name, ip=excluded.ip, port=excluded.port, 
          players=excluded.players, maxPlayers=excluded.maxPlayers, 
          updatedAt=excluded.updatedAt
      `).bind(id, attributes.name, attributes.ip || '', attributes.port || 0, attributes.players, attributes.maxPlayers));

      // Process Mods for this server
      for (const sm of reforgerMods) {
        // Insert Mod (Upsert using modId as primary key id)
        statements.push(env.DB.prepare(`
          INSERT INTO Mod (id, name, thumbnail, createdAt, updatedAt)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, updatedAt = CURRENT_TIMESTAMP
        `).bind(sm.modId, sm.name || "Unknown Module", null));

        // Link ServerMod (Now just using IDs directly)
        statements.push(env.DB.prepare(`
          INSERT INTO ServerMod (serverId, modId)
          VALUES (?, ?)
          ON CONFLICT(serverId, modId) DO NOTHING
        `).bind(id, sm.modId));
      }
    }

    console.log(`📦 PREPARED ${statements.length} STATEMENTS`);
    if (statements.length > 0) {
      // Execute in chunks
      for (let i = 0; i < statements.length; i += 50) {
        await env.DB.batch(statements.slice(i, i + 50));
      }
    }

    // Recalculate Stats & Ranks
    console.log("📊 CALCULATING RANKS...");
    
    // 1. Reset all stats before re-calculating
    await env.DB.prepare("UPDATE Mod SET serverCount = 0, totalPlayers = 0").run();

    // 2. Aggregate stats
    await env.DB.prepare(`
        UPDATE Mod SET 
          serverCount = (SELECT COUNT(*) FROM ServerMod WHERE modId = Mod.id),
          totalPlayers = COALESCE((SELECT SUM(s.players) FROM Server s JOIN ServerMod sm ON s.id = sm.serverId WHERE sm.modId = Mod.id), 0)
    `).run();

    // 3. Simple Overall Rank update based on totalPlayers
    await env.DB.prepare(`
      UPDATE Mod SET overallRank = (
        SELECT rank FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY totalPlayers DESC, serverCount DESC) as rank FROM Mod
        ) r WHERE r.id = Mod.id
      )
    `).run();

    console.log("✅ CLOUDFLARE_COLLECTOR: COMPLETE");
    return {
      servers: allServers.length,
      ops: statements.length,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ COLLECTOR_ERROR:", err);
    throw err;
  }
}

// Worker Entry Point
export default {
  fetch: (request: any, env: any, ctx: any) => app.fetch(request, env, ctx),
  async scheduled(event: any, env: any, ctx: any) {
    ctx.waitUntil(runCollector(env));
  },
};
