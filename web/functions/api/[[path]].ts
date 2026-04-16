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

// Debug logging for every request
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`[REQUEST] ${c.req.method} ${c.req.url} started`);
  await next();
  const ms = Date.now() - start;
  console.log(`[RESPONSE] ${c.req.method} ${c.req.url} finished in ${ms}ms - Status: ${c.res.status}`);
});

// Global Error Handler
app.onError((err, c) => {
    console.error(`[CRITICAL ERROR]`, err);
    return c.json({ 
        error: 'Internal Worker error', 
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString()
    }, 503);
});

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
  const start = Date.now();
  try {
    const meta = await kv.get(`${baseKey}:meta`, 'json') as any;
    if (!meta || !meta.chunks) {
        console.log(`[KV] No meta or chunks for ${baseKey}`);
        return [];
    }

    console.log(`[KV] Fetching ${meta.chunks} chunks for ${baseKey} (total expected items: ${meta.total || 'unknown'})`);
    const chunks = [];
    for (let i = 0; i < meta.chunks; i++) {
      const chunkStart = Date.now();
      const chunk = await kv.get(`${baseKey}:${i}`, 'json') as any[];
      if (chunk) {
        chunks.push(...chunk);
        const chunkTime = Date.now() - chunkStart;
        if (chunkTime > 10) { // Log slow chunks
            console.log(`  [KV] Slow chunk ${i} for ${baseKey} took ${chunkTime}ms`);
        }
      }
    }
    const totalTime = Date.now() - start;
    console.log(`[KV] Finished ${baseKey} total fetch in ${totalTime}ms`);
    return chunks;
  } catch (err) {
    console.error(`[KV ERROR] Error reading chunks for ${baseKey}:`, err);
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
  const cache = await caches.open('armamods:details');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) {
      console.log(`[CACHE HIT] Detail data for ${c.req.url}`);
      return cacheResponse;
  }

  const start = Date.now();
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const keys = getKVKeys(game);

  console.log(`[MODS_DETAIL] Starting fetch for ${modId}...`);
  const mods = await getChunkedData(c.env.TRENDING_KV, keys.MODS);
  const mod = mods.find(m => m.id === modId);
  if (!mod) return c.json({ error: 'Not found' }, 404);

  // Ultra-optimized server fetching (prevent 503)
  const modServers: any[] = [];
  const MAX_SERVERS_PER_MOD = 100; // Limit to 100 servers to save CPU
  
  try {
    const meta = await c.env.TRENDING_KV.get(`${keys.SERVERS}:meta`, 'json') as any;
    if (meta && meta.chunks) {
        console.log(`[MODS_DETAIL] Scanning server chunks for mod inclusion (max ${MAX_SERVERS_PER_MOD} results)...`);
        for (let i = 0; i < meta.chunks; i++) {
            if (modServers.length >= MAX_SERVERS_PER_MOD) break;
            
            const chunkText = await c.env.TRENDING_KV.get(`${keys.SERVERS}:${i}`, 'text');
            if (chunkText && chunkText.includes(`"id":"${modId}"`)) {
                const chunk = JSON.parse(chunkText);
                for (const s of chunk) {
                    if (s.mods && s.mods.some((m: any) => m.id === modId)) {
                        modServers.push(s);
                        if (modServers.length >= MAX_SERVERS_PER_MOD) break;
                    }
                }
            }
        }
    }
  } catch (err) {
      console.error('[MODS_DETAIL] Server chunk error:', err);
  }

  const finished = Date.now() - start;
  console.log(`[MODS_DETAIL] Response ready for ${modId} in ${finished}ms`);
  const finalResponse = c.json({ data: { ...mod, stats: { ...mod, totalMods: mods.length }, servers: modServers } });
  
  // Cache the response for 1 hour
  finalResponse.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  
  return finalResponse;
});


// Helper to scan history text for a specific modId (Used in shards)
function scanHistoryPoints(historyText: string, modId: string): any[] {
  const modHistory = [];
  const searchStr = '"time":"';
  let pos = historyText.indexOf(searchStr);

  while (pos !== -1) {
    const timeStart = pos + searchStr.length;
    const timeEnd = historyText.indexOf('"', timeStart);
    if (timeEnd === -1) break;
    const time = historyText.slice(timeStart, timeEnd);
    
    // Find where the "mods" object starts for this time point
    const modsKeyStr = '"mods":{';
    const modsStartPos = historyText.indexOf(modsKeyStr, timeEnd);
    if (modsStartPos === -1) break;

    // Find where the NEXT time point starts to know where this block ends
    let nextTimePos = historyText.indexOf(searchStr, modsStartPos);
    if (nextTimePos === -1) nextTimePos = historyText.length;

    const pointBlock = historyText.slice(modsStartPos, nextTimePos);
    const modStrPos = pointBlock.indexOf(`"${modId}":{`);
    
    if (modStrPos !== -1) {
      const startStats = pointBlock.indexOf('{', modStrPos);
      const endStats = pointBlock.indexOf('}', startStats);
      if (startStats !== -1 && endStats !== -1) {
          try {
            const statsStr = pointBlock.slice(startStats, endStats + 1);
            const stats = JSON.parse(statsStr);
            modHistory.push({ 
                date: time, 
                totalPlayers: stats.p || 0, 
                serverCount: stats.s || 0, 
                overallRank: stats.r || 9999 
            });
          } catch { /* ignore parse errors */ }
      }
    } else {
        modHistory.push({ date: time, totalPlayers: 0, serverCount: 0, overallRank: 9999 });
    }
    
    pos = historyText.indexOf(searchStr, nextTimePos - 1);
    if (pos === -1) break;
    if (pos <= modsStartPos) pos = historyText.indexOf(searchStr, nextTimePos + 1);
  }
  return modHistory;
}

app.get('/mods/:modId/history', async (c) => {
  const cache = await caches.open('armamods:history');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const start = Date.now();
  const game = getGameFromQuery(c);
  const modId = c.req.param('modId');
  const daysString = c.req.query('days') || '30';
  const requestingAll = daysString === 'all';
  const days = requestingAll ? 9999 : parseInt(daysString);

  let baseKey = `history:daily:${game}`;
  let sliceCount = -days;

  if (days <= 1) { baseKey = `history:hourly:${game}`; sliceCount = -24; }
  else if (days > 31 && days <= 365) { baseKey = `history:monthly:${game}`; sliceCount = -12; }
  else if (days > 365 || requestingAll) { baseKey = `history:yearly:${game}`; sliceCount = -10; }

  console.log(`[HISTORY] Fetching ${baseKey} shards for ${modId}...`);
  
  let modHistory: any[] = [];
  const meta = await c.env.TRENDING_KV.get(`${baseKey}:meta`, 'json') as any;

  if (meta && meta.chunks) {
      // Sharded logic
      for (let i = 0; i < meta.chunks; i++) {
          const shardKey = `${baseKey}:${i}`;
          // Greitas patikrinimas ar šis blokas turi mūsų modą
          const shardText = await c.env.TRENDING_KV.get(shardKey, 'text');
          if (shardText && shardText.includes(`"${modId}":{`)) {
              modHistory = scanHistoryPoints(shardText, modId);
              break;
          }
      }
  } else {
      // Legacy single-file logic
      const historyText = await c.env.TRENDING_KV.get(baseKey, 'text');
      if (historyText) modHistory = scanHistoryPoints(historyText, modId);
  }

  const finalHistory = modHistory.slice(sliceCount);
  const finished = Date.now() - start;
  console.log(`[HISTORY] Prepared ${finalHistory.length} nodes in ${finished}ms`);
  
  const finalResponse = c.json({ data: finalHistory });
  
  // Cache the response for 1 hour
  finalResponse.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));
  
  return finalResponse;
});

app.get('/servers', async (c) => {
  const cache = await caches.open('armamods:servers');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) {
      console.log(`[CACHE HIT] Servers data for ${c.req.url}`);
      return cacheResponse;
  }

  const start = Date.now();
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);
  const limit = Math.min(parseInt(c.req.query('limit') || '1000'), 1000);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  console.log(`[SERVERS] Fetching data for ${game}...`);
  const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS);
  let filtered = [...servers];

  if (search) {
    const low = search.toLowerCase();
    filtered = filtered.filter(s => s.name?.toLowerCase().includes(low));
  }

  filtered.sort((a, b) => (b.players || 0) - (a.players || 0));

  const finalResponse = c.json({ 
    data: filtered.slice(offset, offset + limit), 
    meta: { total: filtered.length, limit, offset } 
  });

  // Cache fixed result for 1 hour to prevent CPU overload
  finalResponse.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, finalResponse.clone()));

  const finished = Date.now() - start;
  console.log(`[SERVERS] Prepared in ${finished}ms`);
  
  return finalResponse;
});

// Get Single Server Details
app.get('/servers/:serverId', async (c) => {
  const cache = await caches.open('armamods:server_details');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const serverId = c.req.param('serverId');
  const game = getGameFromQuery(c);
  const keys = getKVKeys(game);

  console.log(`[SERVERS_DETAIL] Fetching server ${serverId}...`);
  const servers = await getChunkedData(c.env.TRENDING_KV, keys.SERVERS);
  const server = servers.find(s => s.id === serverId);

  if (!server) return c.json({ error: 'Server not found' }, 404);

  const response = c.json({ data: server });
  
  // Cache for 1 hour
  response.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  
  return response;
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

// DEBUG ENDPOINT: See raw KV data structure
app.get('/debug/raw/:key', async (c) => {
    const key = c.req.param('key');
    const data = await c.env.TRENDING_KV.get(key, 'text');
    if (!data) return c.json({ error: 'Not found' });
    return c.text(data.slice(0, 5000));
});



// --- SERVER RANKING ENDPOINTS ---

// Get Top Ranked Servers (Leaderboard)
app.get('/servers/ranking', async (c) => {
  const game = c.req.query('game') || 'reforger';
  const cache = await caches.open('armamods:ranking:servers');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const ranking = await c.env.TRENDING_SNAPSHOTS.get(`cache:ranking:servers:${game}`, 'json');
  if (!ranking) return c.json({ data: [] });

  const response = c.json({ data: ranking });
  response.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

// Get Points History for a specific server (For Charts)
app.get('/servers/:serverId/history', async (c) => {
  const serverId = c.req.param('serverId');
  const game = c.req.query('game') || 'reforger';
  const cache = await caches.open('armamods:server_history');
  const cacheResponse = await cache.match(c.req.raw);
  if (cacheResponse) return cacheResponse;

  const history = await c.env.TRENDING_SNAPSHOTS.get(`history:server_scores:${game}`, 'json') as any[];
  if (!history) return c.json({ data: [] });

  // Extract points for ONLY this server to keep response small
  const serverHistory = history.map(entry => ({
    time: entry.time,
    points: entry.scores[serverId] || 0
  })).filter(h => h.points !== 0 || h.time === history[history.length-1].time);

  const response = c.json({ data: serverHistory });
  response.headers.set('Cache-Control', 'public, max-age=3600');
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

export const onRequest = handle(app);
