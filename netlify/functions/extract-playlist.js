import {
  extractSpotifyPlaylistFromEmbed,
  extractYoutubePlaylistInnerTube
} from './music-helpers.js'

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
}

export async function handler(event) {
  try {
    const targetUrl = (event.queryStringParameters?.url || '').trim()
    if (!targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Ingresa un enlace válido de playlist.' })
      }
    }

    const spMatch = targetUrl.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/)
    if (spMatch && spMatch[1]) {
      const playlist = await extractSpotifyPlaylistFromEmbed(spMatch[1])
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, playlist })
      }
    }

    const ytMatch = targetUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/)
    if (ytMatch && ytMatch[1]) {
      const isYtMusic = targetUrl.includes('music.youtube.com')
      const playlist = await extractYoutubePlaylistInnerTube(ytMatch[1], isYtMusic)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, playlist })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error:
          'Formato de enlace no reconocido. Pega un enlace de playlist de Spotify (open.spotify.com/playlist/...), YouTube o YouTube Music (?list=...).'
      })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message || 'Error al extraer la playlist.' })
    }
  }
}
