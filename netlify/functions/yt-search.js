import { searchYouTubeInnerTube } from './music-helpers.js'

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
}

export async function handler(event) {
  try {
    const q = event.queryStringParameters?.q || ''
    const mode = event.queryStringParameters?.mode || 'lyrics'
    const items = await searchYouTubeInnerTube(q, mode)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, items })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message, items: [] })
    }
  }
}
