const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
}

export async function handler() {
  const clientId = (process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID || '').trim()
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      configured: Boolean(clientId && clientId !== 'your-spotify-client-id'),
      clientId: clientId && clientId !== 'your-spotify-client-id' ? clientId : ''
    })
  }
}
