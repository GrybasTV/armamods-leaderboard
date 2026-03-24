import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Basic CORS to allow website communication
app.use('*', cors());

// API Endpoints (Hono + D1)
app.get('/api/stats', async (c) => {
  const stats = await c.env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM Mod WHERE serverCount > 0) as totalMods, (SELECT SUM(players) FROM Server) as totalPlayers, (SELECT COUNT(*) FROM Server) as totalServers"
  ).first();
  return c.json(stats);
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

  const { results: data } = await c.env.DB.prepare(
    `SELECT * FROM Mod ${where} ${order} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const { count: total }: any = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM Mod ${where}`
  ).bind(...params).first();

  return c.json({ data, meta: { total, limit, offset } });
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

  const { results: data } = await c.env.DB.prepare(
    `SELECT * FROM Server ${where} ORDER BY players DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const { count: total }: any = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM Server ${where}`
  ).bind(...params).first();

  return c.json({ data, meta: { total, limit, offset } });
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

// Collector entry point (Cron Trigger)
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    // This will host the logic from src/services/collector.ts adapted for standard fetch + D1
    console.log("⏰ CLOUDFLARE_COLLECTOR: ENGAGED");
  },
};
