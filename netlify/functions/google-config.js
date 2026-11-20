const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
}

export async function handler() {
  const clientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_YOUTUBE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  ).trim()

  const configured = Boolean(clientId && !clientId.startsWith('your-'))

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      configured,
      clientId: configured ? clientId : ''
    })
  }
}
