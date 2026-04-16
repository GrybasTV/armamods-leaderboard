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
    TRENDING: `cache:trending${suffix}`,
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
  const modId = c.req.param('modId');
  const keys = getKVKeys(game);

  const mods = await getChunkedData(c.env.TRENDING_KV, keys.MODS);
  const mod = mods.find(m => m.id === modId);
  if (!mod) return c.json({ error: 'Not found' }, 404);

  // Optimized server fetching to reduce CPU usage (prevent 503)
  let modServers: any[] = [];
  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        for (let i = 0; i < meta.chunks; i++) {
            const chunkText = await c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text');
            if (chunkText && chunkText.includes(`"id":"${modId}"`)) {
                const chunk = JSON.parse(chunkText);
                const filtered = chunk.filter((s: any) => s.mods && s.mods.some((m: any) => m.id === modId));
                modServers.push(...filtered);
            }
        }
    }
  } catch (err) {
      console.error('Server chunk error:', err);
  }

  return c.json({ data: { ...mod, stats: { ...mod, totalMods: mods.length }, servers: modServers } });
});

app.get('/mods/:modId/history', async (c) => {
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const daysString = c.req.query('days') || '30';
  const requestingAll = daysString === 'all';
  const days = requestingAll ? 9999 : parseInt(daysString);

  let key = `history:daily:${game}`;
  let sliceCount = -days;

  if (days <= 1) {
    key = `history:hourly:${game}`;
    sliceCount = -24;
  } else if (days > 31 && days <= 365) {
    key = `history:monthly:${game}`;
    sliceCount = -12; // paskutiniai 12 mėnesių
  } else if (days > 365 || requestingAll) {
    key = `history:yearly:${game}`;
    sliceCount = -10; // paskutiniai 10 metų
  } else {
    // 2-31 days (30D)
    key = `history:daily:${game}`;
    sliceCount = -days;
  }

  const historyText = await c.env.TRENDING_KV.get(key, 'text');
  if (!historyText) return c.json({ data: [] });

  const points = historyText.split('"time":"');
  const modHistory = [];

  for (let i = 1; i < points.length; i++) {
    const pointStr = points[i];
    const timeEnd = pointStr.indexOf('"');
    if (timeEnd === -1) continue;
    const time = pointStr.slice(0, timeEnd);
    
    const modStrPos = pointStr.indexOf(`"${modId}":{`);
    if (modStrPos !== -1) {
      const endPos = pointStr.indexOf('}', modStrPos);
      const modStatsStr = pointStr.slice(modStrPos + `"${modId}":`.length, endPos + 1);
      try {
        const stats = JSON.parse(modStatsStr);
        modHistory.push({ date: time, totalPlayers: stats.p || 0, serverCount: stats.s || 0, overallRank: stats.r || 9999 });
      } catch(e) {}
    } else {
      modHistory.push({ date: time, totalPlayers: 0, serverCount: 0, overallRank: 9999 });
    }
  }

  const finalHistory = modHistory.slice(sliceCount);
  return c.json({ data: finalHistory });
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
    const period = (c.req.query('period') || '24h') as '24h' | '7d' | '30d';

    const trendingData = await c.env.TRENDING_KV.get(`${keys.TRENDING}:${period}`, 'json') as any;
    
    if (!trendingData) {
        return c.json({ data: { rising: [], falling: [], new: [] }, meta: { lastUpdated: new Date().toISOString() } });
    }

    return c.json({ data: trendingData, meta: { lastUpdated: new Date().toISOString() } });
});


export const onRequest = handle(app);
