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

  // Forward API requests
  console.log(`[Proxy] Incoming request for: ${url.pathname}`);
  
  // Clean up the path - if we are in /api/[[path]], url.pathname already has it
  const workerUrl = `https://armamods-leaderboard.pauliusmed.workers.dev${url.pathname}${url.search}`;
  console.log(`[Proxy] Forwarding to: ${workerUrl}`);

  try {
    const response = await fetch(workerUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Handle error responses - return proper JSON structure
    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ 
        error: `Worker API error: ${response.status}`, 
        details: errorBody,
        data: null,
        meta: null
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Add CORS headers to response
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    newResponse.headers.set('Access-Control-Allow-Origin', '*');

    return newResponse;
  } catch (error) {
    // Handle network errors
    return new Response(JSON.stringify({ 
      error: 'Worker unreachable', 
      details: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      meta: null
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
