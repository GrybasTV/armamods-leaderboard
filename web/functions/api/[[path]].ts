import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type GameType = 'reforger' | 'arma3';

interface Bindings {
  TRENDING_KV: KVNamespace;
  WEBHOOK_SECRET: string;
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Setup Middleware
app.use('*', cors());

// Helper logic
function getGameFromQuery(c: any): GameType {
  const game = c.req.query('game');
  return game === 'arma3' ? 'arma3' : 'reforger';
}

function getKVKeys(game: GameType) {
  const suffix = game === 'arma3' ? ':arma3' : '';
  return {
    MODS: `cache:mods${suffix}`,
    SERVERS: `cache:servers${suffix}`,
    STATS: `cache:stats${suffix}`,
    LAST_UPDATE: `cache:lastUpdate${suffix}`,
    HISTORY_HOURLY: `history:hourly:${game}`,
    HISTORY_DAILY: `history:daily:${game}`,
  };
}

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



// ---------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------

app.get('/stats', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const stats = await c.env.TRENDING_KV.get(keys.STATS, 'json');
  return c.json(stats || { totalMods: 0, totalPlayers: 0, totalServers: 0, game });
});

app.get('/mods', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const limit = Math.min(parseInt(c.req.query('limit') || '1000'), 1000);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';
  const sortBy = c.req.query('sortBy') || 'overall';

  const mods = await getChunkedData(c.env.TRENDING_KV, keys.MODS);
  let filtered = [...mods];

  if (search) {
    const low = search.toLowerCase();
    filtered = filtered.filter(m => m.name?.toLowerCase().includes(low) || m.id?.toLowerCase().includes(low));
  }

  // Sort logic
  if (sortBy === 'players') filtered.sort((a, b) => b.totalPlayers - a.totalPlayers);
  else if (sortBy === 'servers') filtered.sort((a, b) => b.serverCount - a.serverCount);
  else if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else {
    filtered.sort((a, b) => (a.overallRank || 9999) - (b.overallRank || 9999));
  }

  return c.json({ 
    data: filtered.slice(offset, offset + limit), 
    meta: { total: filtered.length, limit, offset } 
  });
});

app.get('/mods/:modId', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const modId = c.req.param('modId');

  const [mods, servers] = await Promise.all([
    getChunkedData(c.env.TRENDING_KV, keys.MODS),
    getChunkedData(c.env.TRENDING_KV, keys.SERVERS)
  ]);

  const mod = mods.find(m => m.id === modId);
  if (!mod) return c.json({ error: 'Not found' }, 404);

  const modServers = servers.filter(s => s.mods?.some(sm => sm?.id === modId));
  return c.json({ data: { ...mod, stats: { ...mod, totalMods: mods.length }, servers: modServers } });
});

app.get('/mods/:modId/history', async (c) => {
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const days = Math.min(parseInt(c.req.query('days') || '30'), 365);

  const key = days <= 1 ? `history:hourly:${game}` : `history:daily:${game}`;
  const historyData = await c.env.TRENDING_KV.get(key, 'json') as any[] || [];
  
  const modHistory = historyData.slice(days <= 1 ? -24 : -days).map(point => {
    const stats = point.mods[modId] || { p: 0, s: 0, r: 9999 };
    return { date: point.time, totalPlayers: stats.p, serverCount: stats.s, overallRank: stats.r };
  }).filter(d => d.totalPlayers > 0 || d.serverCount > 0);

  return c.json({ data: modHistory });
});

app.get('/servers', async (c) => {
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const limit = Math.min(parseInt(c.req.query('limit') || '1000'), 1000);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS);
  let filtered = [...servers];

  if (search) {
    const low = search.toLowerCase();
    filtered = filtered.filter(s => s.name?.toLowerCase().includes(low));
  }

  filtered.sort((a, b) => (b.players || 0) - (a.players || 0));

  return c.json({ 
    data: filtered.slice(offset, offset + limit), 
    meta: { total: filtered.length, limit, offset } 
  });
});

// Bayesian Trending logic
app.get('/trending', async (c) => {
    const game = getGameFromQuery(c);
    const keys = getKVKeys(game);
    const period = (c.req.query('period') || '30d') as '24h' | '7d' | '30d';

    const currentMods = await getChunkedData(c.env.TRENDING_KV, keys.MODS);
    if (!currentMods.length) return c.json({ data: { rising: [], falling: [], new: [] } });

    const dailyHistory = await c.env.TRENDING_KV.get(keys.HISTORY_DAILY, 'json') as any[] || [];
    const targetDays = period === '7d' ? 7 : (period === '30d' ? 30 : 1);
    const prevEntry = dailyHistory[dailyHistory.length - targetDays] || dailyHistory[0];

    const prevMap = new Map();
    if (prevEntry?.mods) Object.entries(prevEntry.mods).forEach(([id, s]) => prevMap.set(id, s));

    const MIN_SERVERS = 5;
    const rising: any[] = [];
    const newMods: any[] = [];

    for (const mod of currentMods) {
        const prev = prevMap.get(mod.id);
        if (!prev) {
            if (mod.serverCount >= MIN_SERVERS) newMods.push(mod);
        } else {
            const serverDelta = mod.serverCount - (prev.s || 0);
            if (serverDelta > 0) rising.push({ ...mod, changeServers: serverDelta });
        }
    }

    rising.sort((a, b) => b.changeServers - a.changeServers);

    return c.json({ data: { rising: rising.slice(0, 50), new: newMods.slice(0, 50), falling: [] } });
});

export const onRequest = handle(app);
