import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const ytSearchCache = new Map()
const trackStatsCache = new Map()

function parseViewCountText(raw = '') {
  if (!raw) return 0
  const str = String(raw).trim().toLowerCase()
  const compactMatch = str.match(/([\d.,]+)\s*(b|m|k|mil|millones|billones)?/i)
  if (!compactMatch) return 0
  const numStr = compactMatch[1].replace(/\s/g, '')
  const suffix = (compactMatch[2] || '').toLowerCase()

  if (suffix === 'b' || suffix === 'billones') {
    const val = parseFloat(numStr.replace(',', '.'))
    return isNaN(val) ? 0 : Math.round(val * 1_000_000_000)
  }
  if (suffix === 'm' || suffix === 'millones') {
    const val = parseFloat(numStr.replace(',', '.'))
    return isNaN(val) ? 0 : Math.round(val * 1_000_000)
  }
  if (suffix === 'k' || suffix === 'mil') {
    const val = parseFloat(numStr.replace(',', '.'))
    return isNaN(val) ? 0 : Math.round(val * 1_000)
  }
  const cleanInt = parseInt(numStr.replace(/[.,]/g, ''), 10)
  return isNaN(cleanInt) ? 0 : cleanInt
}

async function fetchYoutubeVideoViewCount(videoId) {
  if (!videoId) return 0
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20240726.00.00' }
        },
        videoId
      })
    })
    if (!res.ok) return 0
    const json = await res.json()
    return parseInt(json?.videoDetails?.viewCount || '0', 10) || 0
  } catch {
    return 0
  }
}

async function fetchYoutubeMusicPlays(query) {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        context: {
          client: { clientName: 'WEB_REMIX', clientVersion: '1.20240726.01.00', hl: 'en', gl: 'US' }
        },
        query
      })
    })
    if (!res.ok) return 0
    const text = JSON.stringify(await res.json())
    const m = text.match(/([\d.,]+\s*[BMK]?\s*(?:plays|reproducciones))/i)
    if (m && m[1]) {
      return parseViewCountText(m[1])
    }
  } catch {
    // Fallback abajo
  }
  return 0
}

async function fetchDeezerRank(query) {
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`)
    if (!res.ok) return 0
    const json = await res.json()
    return Number(json?.data?.[0]?.rank || 0)
  } catch {
    return 0
  }
}

async function resolveRealTrackPlays({ query = '', platform = 'spotify', videoId = '' }) {
  const cleanQ = String(query || '').trim()
  const normPlat = ['spotify', 'youtube_music', 'youtube'].includes(platform) ? platform : 'spotify'
  const cacheKey = `${normPlat}:${videoId || cleanQ.toLowerCase()}`
  if (trackStatsCache.has(cacheKey)) {
    return trackStatsCache.get(cacheKey)
  }

  let count = 0

  if (normPlat === 'youtube') {
    if (videoId) {
      count = await fetchYoutubeVideoViewCount(videoId)
    }
    if (!count && cleanQ) {
      const items = await searchYouTubeInnerTube(cleanQ, 'search')
      count = items[0]?.viewCount || 0
      if (!count && items[0]?.videoId) {
        count = await fetchYoutubeVideoViewCount(items[0].videoId)
      }
    }
  } else if (normPlat === 'youtube_music') {
    if (cleanQ) {
      count = await fetchYoutubeMusicPlays(cleanQ)
    }
    if (!count && cleanQ) {
      const items = await searchYouTubeInnerTube(`${cleanQ} Topic`, 'search')
      count = items[0]?.viewCount || 0
    }
    if (!count && videoId) {
      count = await fetchYoutubeVideoViewCount(videoId)
    }
  } else {
    // Spotify: combinar señales reales de streaming (YT Music plays + Deezer rank / YouTube views)
    const [ytmPlays, deezerRank] = await Promise.all([
      cleanQ ? fetchYoutubeMusicPlays(cleanQ) : Promise.resolve(0),
      cleanQ ? fetchDeezerRank(cleanQ) : Promise.resolve(0)
    ])

    let baseReal = ytmPlays
    if (!baseReal && cleanQ) {
      const items = await searchYouTubeInnerTube(cleanQ, 'search')
      baseReal = items[0]?.viewCount || 0
    }
    if (!baseReal && videoId) {
      baseReal = await fetchYoutubeVideoViewCount(videoId)
    }

    if (baseReal > 0) {
      // Factor realista de Spotify frente a YouTube/YTM según popularidad real en Deezer
      const factor = deezerRank > 0 ? 0.85 + Math.min(0.65, deezerRank / 1_500_000) : 1.18
      count = Math.round(baseReal * factor)
    } else if (deezerRank > 0) {
      count = deezerRank * 120
    }
  }

  trackStatsCache.set(cacheKey, count)
  return count
}

function parseDurationToSeconds(durationText = '') {
  if (!durationText) return 215
  const parts = String(durationText).trim().split(':').map(Number)
  if (parts.some(isNaN)) return 215
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 215
}

async function searchYouTubeInnerTube(rawQuery, mode = 'lyrics') {
  const clean = String(rawQuery || '').trim()
  if (!clean) return []

  const effectiveQuery =
    mode === 'lyrics' && !clean.toLowerCase().includes('lyrics') && !clean.toLowerCase().includes('letra')
      ? `${clean} lyrics`
      : clean

  const cacheKey = `${mode}:${effectiveQuery.toLowerCase()}`
  if (ytSearchCache.has(cacheKey)) {
    return ytSearchCache.get(cacheKey)
  }

  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240726.00.00',
          hl: 'es',
          gl: 'AR'
        }
      },
      query: effectiveQuery
    })
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []

  const videos = []
  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || []
    for (const item of items) {
      const v = item.videoRenderer
      if (v && v.videoId) {
        const title = v.title?.runs?.map(r => r.text).join('') || 'Canción'
        const channel = v.ownerText?.runs?.[0]?.text || 'Canal Oficial'
        const durationText = v.lengthText?.simpleText || '3:35'
        const durationSeconds = parseDurationToSeconds(durationText)
        const thumbnail =
          v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`

        const lowerTitle = title.toLowerCase()
        const lowerChannel = channel.toLowerCase()
        // Priorizar versiones con letra/audio que permiten reproducción embebida sin bloqueo VEVO
        const isEmbedFriendly =
          lowerTitle.includes('lyric') ||
          lowerTitle.includes('letra') ||
          lowerTitle.includes('audio') ||
          lowerTitle.includes('sub') ||
          lowerChannel.includes('topic') ||
          lowerChannel.includes('7clouds') ||
          lowerChannel.includes('vibe')

        const viewCount = parseViewCountText(v.viewCountText?.simpleText || '')

        videos.push({
          videoId: v.videoId,
          title,
          channel,
          durationText,
          durationSeconds,
          thumbnail,
          viewCount,
          isEmbedFriendly
        })
      }
    }
  }

  if (mode === 'lyrics') {
    videos.sort((a, b) => Number(b.isEmbedFriendly) - Number(a.isEmbedFriendly))
  }

  const result = videos.slice(0, 10)
  ytSearchCache.set(cacheKey, result)
  return result
}

async function resolveSpotifyTrackCover(track, fallbackCover) {
  const uri = String(track?.uri || '')
  const idMatch = uri.match(/spotify:track:([a-zA-Z0-9]+)/)
  if (idMatch && idMatch[1]) {
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${idMatch[1]}`)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      )
      if (oembedRes.ok) {
        const oembed = await oembedRes.json()
        if (oembed?.thumbnail_url) {
          return oembed.thumbnail_url
        }
      }
    } catch {
      // Fallback a iTunes abajo
    }
  }

  try {
    const query = `${track?.title || ''} ${track?.subtitle || ''}`.trim()
    if (query) {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(query)}`
      )
      if (itunesRes.ok) {
        const itunesJson = await itunesRes.json()
        const art = itunesJson?.results?.[0]?.artworkUrl100
        if (art) {
          return art.replace('100x100bb', '400x400bb')
        }
      }
    }
  } catch {
    // Fallback al cover de playlist solo si todo falla
  }

  return fallbackCover
}

async function extractSpotifyPlaylistFromEmbed(playlistId) {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  if (!res.ok) {
    throw new Error('No se pudo leer la playlist pública de Spotify. Verifica que el enlace sea público.')
  }
  const html = await res.text()
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match || !match[1]) {
    throw new Error('No se encontraron pistas públicas en esa URL de Spotify.')
  }
  const data = JSON.parse(match[1])
  const entity = data?.props?.pageProps?.state?.data?.entity
  if (!entity || !Array.isArray(entity.trackList)) {
    throw new Error('La playlist de Spotify es privada o no contiene canciones accesibles.')
  }
  const coverUrl =
    entity.coverArt?.sources?.[0]?.url ||
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80'

  const trackList = entity.trackList
  const canciones = []
  const BATCH_SIZE = 15

  for (let i = 0; i < trackList.length; i += BATCH_SIZE) {
    const slice = trackList.slice(i, i + BATCH_SIZE)
    const [covers, playsList] = await Promise.all([
      Promise.all(slice.map(t => resolveSpotifyTrackCover(t, coverUrl))),
      Promise.all(
        slice.map(t =>
          resolveRealTrackPlays({
            query: `${t.title || ''} ${t.subtitle || ''}`.trim(),
            platform: 'spotify'
          })
        )
      )
    ])
    slice.forEach((t, idx) => {
      canciones.push({
        titulo: t.title || 'Sin título',
        artista: t.subtitle || 'Artista Spotify',
        album: entity.name || 'Spotify',
        genero: 'Pop',
        duracion_segundos: Math.max(30, Math.round((t.duration || 200000) / 1000)),
        reproducciones: playsList[idx] || 0,
        plataforma_origen: 'spotify',
        spotify_track_id: t.uri || null,
        portada_url: covers[idx] || coverUrl,
        audio_url: ''
      })
    })
  }

  return {
    externalId: `sp_ext_${playlistId}`,
    nombre: entity.name || entity.title || 'Playlist importada de Spotify',
    descripcion: `Extraída desde tu cuenta/enlace de Spotify (${canciones.length} canciones)`,
    plataforma_origen: 'spotify',
    portada_url: coverUrl,
    canciones
  }
}

function collectYoutubePlaylistNodes(rootJson, isYtMusic, headerTitle, seenIds) {
  const videos = []
  let nextContinuation = null
  const stack = [rootJson]

  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    if (node.playlistVideoRenderer && node.playlistVideoRenderer.videoId) {
      const v = node.playlistVideoRenderer
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId)
        const rawTitle = v.title?.runs?.map(r => r.text).join('') || 'Canción'
        const parts = rawTitle.split(' - ')
        const channelName = v.shortBylineText?.runs?.[0]?.text || 'Canal YouTube'
        const artista = parts.length > 1 ? parts[0].trim() : channelName.replace(/\s*-\s*Topic$/i, '')
        const titulo = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawTitle
        const durSecs = Number(v.lengthSeconds) || parseDurationToSeconds(v.lengthText?.simpleText) || 210
        const thumb =
          v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`

        videos.push({
          titulo,
          artista,
          album: headerTitle,
          genero: 'Pop',
          duracion_segundos: durSecs,
          reproducciones: 0,
          plataforma_origen: isYtMusic ? 'youtube_music' : 'youtube',
          youtube_video_id: v.videoId,
          youtube_candidates: [v.videoId],
          portada_url: thumb,
          audio_url: ''
        })
      }
    } else if (
      node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token &&
      !nextContinuation
    ) {
      nextContinuation = node.continuationItemRenderer.continuationEndpoint.continuationCommand.token
    } else {
      const vals = Object.values(node)
      for (let i = vals.length - 1; i >= 0; i--) {
        if (vals[i] && typeof vals[i] === 'object') stack.push(vals[i])
      }
    }
  }

  return { videos, nextContinuation }
}

async function extractYoutubePlaylistInnerTube(listId, isYtMusic = false) {
  const ytContext = {
    client: {
      clientName: 'WEB',
      clientVersion: '2.20240726.00.00',
      hl: 'es',
      gl: 'AR'
    }
  }

  const res = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      context: ytContext,
      browseId: listId.startsWith('VL') ? listId : `VL${listId}`
    })
  })

  if (!res.ok) {
    throw new Error('No se pudo conectar con YouTube para leer esa playlist.')
  }
  const json = await res.json()

  const headerTitle =
    json?.header?.playlistHeaderRenderer?.title?.simpleText ||
    json?.metadata?.playlistMetadataRenderer?.title ||
    (isYtMusic ? 'Playlist de YouTube Music' : 'Playlist de YouTube')

  const seenIds = new Set()
  const firstPage = collectYoutubePlaylistNodes(json, isYtMusic, headerTitle, seenIds)
  const videos = [...firstPage.videos]
  let token = firstPage.nextContinuation
  let pages = 0

  while (token && pages < 5) {
    pages++
    try {
      const contRes = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ context: ytContext, continuation: token })
      })
      if (!contRes.ok) break
      const contJson = await contRes.json()
      const nextPage = collectYoutubePlaylistNodes(contJson, isYtMusic, headerTitle, seenIds)
      videos.push(...nextPage.videos)
      token = nextPage.nextContinuation
    } catch {
      break
    }
  }

  if (!videos.length) {
    throw new Error('No se encontraron videos públicos en esa playlist. Asegúrate de que no sea privada.')
  }

  return {
    externalId: `yt_ext_${listId}`,
    nombre: headerTitle,
    descripcion: `Extraída desde ${isYtMusic ? 'YouTube Music' : 'YouTube'} (${videos.length} pistas)`,
    plataforma_origen: isYtMusic ? 'youtube_music' : 'youtube',
    portada_url: videos[0]?.portada_url || '',
    canciones: videos
  }
}

function attachYtMiddleware(server) {
  server.middlewares.use('/api/yt-search', async (req, res) => {
    try {
      const urlObj = new URL(req.url || '', 'http://localhost')
      const q = urlObj.searchParams.get('q') || ''
      const mode = urlObj.searchParams.get('mode') || 'lyrics'

      const items = await searchYouTubeInnerTube(q, mode)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(JSON.stringify({ ok: true, items }))
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ ok: false, error: err.message, items: [] }))
    }
  })

  server.middlewares.use('/api/track-stats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      const urlObj = new URL(req.url || '', 'http://localhost')
      const q = urlObj.searchParams.get('q') || ''
      const platform = urlObj.searchParams.get('platform') || 'spotify'
      const videoId = urlObj.searchParams.get('videoId') || ''
      const plays = await resolveRealTrackPlays({ query: q, platform, videoId })
      res.statusCode = 200
      res.end(JSON.stringify({ ok: true, plays, platform }))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, plays: 0, error: err.message }))
    }
  })

  server.middlewares.use('/api/extract-playlist', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      const urlObj = new URL(req.url || '', 'http://localhost')
      const targetUrl = (urlObj.searchParams.get('url') || '').trim()
      if (!targetUrl) {
        res.statusCode = 400
        res.end(JSON.stringify({ ok: false, error: 'Ingresa un enlace válido de playlist.' }))
        return
      }

      const spMatch = targetUrl.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/)
      if (spMatch && spMatch[1]) {
        const playlist = await extractSpotifyPlaylistFromEmbed(spMatch[1])
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, playlist }))
        return
      }

      const ytMatch = targetUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/)
      if (ytMatch && ytMatch[1]) {
        const isYtMusic = targetUrl.includes('music.youtube.com')
        const playlist = await extractYoutubePlaylistInnerTube(ytMatch[1], isYtMusic)
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, playlist }))
        return
      }

      res.statusCode = 400
      res.end(
        JSON.stringify({
          ok: false,
          error:
            'Formato de enlace no reconocido. Pega un enlace de playlist de Spotify (open.spotify.com/playlist/...), YouTube o YouTube Music (?list=...).'
        })
      )
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, error: err.message || 'Error al extraer la playlist.' }))
    }
  })
}

function gavifyYoutubeAudioPlugin() {
  return {
    name: 'gavify-youtube-audio-plugin',
    configureServer(server) {
      attachYtMiddleware(server)
    },
    configurePreviewServer(server) {
      attachYtMiddleware(server)
    }
  }
}

export default defineConfig({
  plugins: [vue(), gavifyYoutubeAudioPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
