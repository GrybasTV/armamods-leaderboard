import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Basic CORS to allow website communication
app.use('*', cors());

// API Endpoints (Hono + D1)
app.get('/api/collect', async (c) => {
  try {
    await runCollector(c.env);
    return c.json({ success: true, message: "Collector executed (check logs if possible)" });
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
    where += " AND (name LIKE ? OR modId LIKE ?)";
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
  const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImM1YzczMGM5YmU0MWQ1YzAiLCJpYXQiOjE3NzQzNTkyNDYsIm5iZiI6MTc3NDM1OTI0NiwiaXNzIjoiaHR0cHM6Ly93d3cuYmF0dGxlbWV0cmljcy5jb20iLCJzdWIiOiJ1cm46dXNlcjoxMTM0ODY0In0.Lq9f8sDqtL3THGZftjbG0Dx4xvwEhaGTqyBtZ6e1fSc";
  const game = 'reforger';
  
  console.log("🚀 CLOUDFLARE_COLLECTOR: STARTING IMPORT");
  const url = `https://api.battlemetrics.com/servers?filter[game]=${game}&page[size]=100&include=mod`;
  
  try {
    console.log("📡 FETCHING:", url);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    console.log("📥 STATUS:", response.status, response.statusText);
    const bodyText = await response.text();
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${bodyText.substring(0, 100)}`);
    }

    const data: any = JSON.parse(bodyText);
    const servers = data.data || [];
    const included = data.included || [];
    
    // Map of mod details from included data
    const modDetails = new Map();
    included.forEach((item: any) => {
      if (item.type === 'mod') {
        modDetails.set(item.id, {
          name: item.attributes?.name || "Unknown Module",
          thumbnail: item.attributes?.thumbnailUrl || null
        });
      }
    });

    console.log(`📡 RECEIVED ${servers.length} SERVERS AND ${modDetails.size} MOD DETAILS`);

    for (const server of servers) {
      const { id, attributes, relationships } = server;
      
      // Update Server in D1
      await env.DB.prepare(`
        INSERT INTO Server (id, name, ip, port, players, maxPlayers, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name=excluded.name, ip=excluded.ip, port=excluded.port, 
          players=excluded.players, maxPlayers=excluded.maxPlayers, 
          updatedAt=excluded.updatedAt
      `).bind(id, attributes.name, attributes.ip || '', attributes.port || 0, attributes.players, attributes.maxPlayers).run();

      // Process Mods for this server
      const serverMods = relationships?.mods?.data || [];
      for (const sm of serverMods) {
        const modId = sm.id;
        const detail = modDetails.get(modId) || { name: "Unknown Module", thumbnail: null };
        
        // Upsert Mod
        await env.DB.prepare(`
          INSERT INTO Mod (id, modId, name, thumbnail, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(modId) DO UPDATE SET name=excluded.name, updatedAt=excluded.updatedAt, thumbnail=excluded.thumbnail
        `).bind(crypto.randomUUID(), modId, detail.name, detail.thumbnail).run();

        // Link ServerMod
        const dbMod: any = await env.DB.prepare("SELECT id FROM Mod WHERE modId = ?").bind(modId).first();
        if (dbMod) {
          await env.DB.prepare(`
            INSERT INTO ServerMod (serverId, modId)
            VALUES (?, ?)
            ON CONFLICT(serverId, modId) DO NOTHING
          `).bind(id, dbMod.id).run();
        }
      }
    }

    // Recalculate Stats & Ranks
    console.log("📊 CALCULATING RANKS...");
    
    // 1. Reset all stats
    await env.DB.prepare("UPDATE Mod SET serverCount = 0, totalPlayers = 0").run();

    // 2. Aggregate stats
    await env.DB.prepare(`
      UPDATE Mod SET 
        serverCount = (SELECT COUNT(*) FROM ServerMod WHERE modId = Mod.id),
        totalPlayers = (SELECT SUM(s.players) FROM Server s JOIN ServerMod sm ON s.id = sm.serverId WHERE sm.modId = Mod.id)
    `).run();

    // 3. Final Overall Rank Calculation (Complex for SQL, simplified version)
    // We'll just order by players/servers and assign sequence
    const { results: rankedMods } = await env.DB.prepare(`
      SELECT id, 
             (RANK() OVER (ORDER BY totalPlayers DESC)) as pRank,
             (RANK() OVER (ORDER BY serverCount DESC)) as sRank
      FROM Mod WHERE serverCount > 0
    `).all();

    for (const m of rankedMods) {
      const overall = Math.floor((Number(m.pRank) + Number(m.sRank)) / 2);
      await env.DB.prepare("UPDATE Mod SET overallRank = ? WHERE id = ?").bind(overall, m.id).run();
    }

    console.log("✅ CLOUDFLARE_COLLECTOR: COMPLETE");
  } catch (err) {
    console.error("❌ COLLECTOR_ERROR:", err);
  }
}

// Collector entry point (Cron Trigger)
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    ctx.waitUntil(runCollector(env));
  },
};
