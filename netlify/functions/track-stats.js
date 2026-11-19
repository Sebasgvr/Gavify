import { resolveRealTrackPlays } from './music-helpers.js'

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
}

export async function handler(event) {
  try {
    const q = event.queryStringParameters?.q || ''
    const platform = event.queryStringParameters?.platform || 'spotify'
    const videoId = event.queryStringParameters?.videoId || ''
    const plays = await resolveRealTrackPlays({ query: q, platform, videoId })
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, plays, platform })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, plays: 0, error: err.message })
    }
  }
}
