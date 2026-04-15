export const config = {
  runtime: 'edge',
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const baseWorkerUrl = env.WORKER_URL || 'https://armamods-leaderboard.pauliusmed.workers.dev';
  const workerUrl = `${baseWorkerUrl}${url.pathname}${url.search}`;

  try {
    // Optimizuotas Cron: jei tai scrape užduotis, tiesiog "paleidžiame" ir uždarome ryšį
    if (url.pathname.includes('/api/cron/scrape')) {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      
      // Naktinis režimas (00:00 - 08:00 Lietuvos laiku = 21:00 - 05:00 UTC)
      const isNight = hourUtc >= 21 || hourUtc < 5;
      
      if (isNight) {
        return new Response(JSON.stringify({ status: 'Skipped - Night Mode', hourUtc }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (context.waitUntil) {
        context.waitUntil(fetch(workerUrl, {
          method: request.method,
          headers: request.headers,
        }));
      } else {
        fetch(workerUrl, { method: request.method, headers: request.headers });
      }
      
      return new Response(JSON.stringify({ status: 'Triggered', hourUtc }), {
        status: 202,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const response = await fetch(workerUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      // Tikriname tik pirmus 1000 simbolių klaidos, kad netaupytume CPU dideliems tekstams
      const errorText = await response.text();
      const shortError = errorText.slice(0, 1000);
      
      return new Response(JSON.stringify({ 
        error: `API error: ${response.status}`, 
        details: shortError
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Naudojame tiesioginį streaming - tai efektyviausias būdas CPU atžvilgiu
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy connection failed', 
      details: error instanceof Error ? error.message : 'Unknown'
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
