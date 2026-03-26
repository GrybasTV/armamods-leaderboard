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

  // Forward API requests to the Worker
  const workerUrl = `https://armamods-leaderboard.pauliusmed.workers.dev${url.pathname}${url.search}`;

  const response = await fetch(workerUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  // Add CORS headers to response
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  
  newResponse.headers.set('Access-Control-Allow-Origin', '*');

  return newResponse;
}
