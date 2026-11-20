const ytSearchCache = new Map()
const trackStatsCache = new Map()
let spotifyAppTokenCache = { token: '', expiresAt: 0 }

async function getAutomaticSpotifyToken() {
  const now = Date.now()
  if (spotifyAppTokenCache.token && spotifyAppTokenCache.expiresAt > now) {
    return spotifyAppTokenCache.token
  }

  const clientId = (process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID || '').trim()
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || process.env.VITE_SPOTIFY_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret || clientId === 'your-spotify-client-id') {
    return ''
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (data?.access_token) {
      const ttlMs = Math.max(60, (Number(data.expires_in) || 3600) - 60) * 1000
      spotifyAppTokenCache = {
        token: data.access_token,
        expiresAt: now + ttlMs
      }
      return data.access_token
    }
  } catch {
    // Fallback al embed público si falla
  }
  return ''
}

export function parseDurationToSeconds(durationText = '') {
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

export function parseViewCountText(raw = '') {
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

export async function fetchYoutubeVideoViewCount(videoId) {
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

export async function fetchYoutubeMusicPlays(query) {
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

export async function fetchDeezerRank(query) {
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`)
    if (!res.ok) return 0
    const json = await res.json()
    return Number(json?.data?.[0]?.rank || 0)
  } catch {
    return 0
  }
}

export async function resolveRealTrackPlays({ query = '', platform = 'spotify', videoId = '' }) {
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
      const factor = deezerRank > 0 ? 0.85 + Math.min(0.65, deezerRank / 1_500_000) : 1.18
      count = Math.round(baseReal * factor)
    } else if (deezerRank > 0) {
      count = deezerRank * 120
    }
  }

  trackStatsCache.set(cacheKey, count)
  return count
}

async function isVideoEmbeddable(videoId) {
  if (!videoId) return false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }
    )
    clearTimeout(timer)
    if (res.status === 401 || res.status === 403 || res.status === 404) return false
    return true
  } catch {
    return true
  }
}

export async function searchYouTubeInnerTube(rawQuery, mode = 'lyrics') {
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
  const seenVideoIds = new Set()
  let continuationToken = null

  function extractFromSections(secList = []) {
    let nextTok = null
    for (const sec of secList) {
      const items = sec?.itemSectionRenderer?.contents || []
      for (const item of items) {
        const v = item.videoRenderer
        if (v && v.videoId && !seenVideoIds.has(v.videoId)) {
          seenVideoIds.add(v.videoId)
          const title = v.title?.runs?.map(r => r.text).join('') || 'Canción'
          const channel = v.ownerText?.runs?.[0]?.text || 'Canal Oficial'
          const durationText = v.lengthText?.simpleText || '3:35'
          const durationSeconds = parseDurationToSeconds(durationText)
          const thumbnail =
            v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`

          const lowerTitle = title.toLowerCase()
          const lowerChannel = channel.toLowerCase()
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
      if (sec?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token && !nextTok) {
        nextTok = sec.continuationItemRenderer.continuationEndpoint.continuationCommand.token
      }
    }
    return nextTok
  }

  continuationToken = extractFromSections(sections)

  if (mode === 'search' && continuationToken) {
    let page = 0
    while (continuationToken && page < 2) {
      page++
      try {
        const contRes = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
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
            continuation: continuationToken
          })
        })
        if (!contRes.ok) break
        const contData = await contRes.json()
        const contItems =
          contData?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems || []
        continuationToken = extractFromSections(contItems)
      } catch {
        break
      }
    }
  }

  if (mode === 'lyrics') {
    videos.sort((a, b) => Number(b.isEmbedFriendly) - Number(a.isEmbedFriendly))
  }

  // Pre-filtrar videos que permiten reproducción embebida (evita Error 101/150 en el reproductor)
  const checkLimit = mode === 'lyrics' ? 10 : 12
  const head = videos.slice(0, checkLimit)
  const tail = videos.slice(checkLimit)
  const checks = await Promise.all(head.map(v => isVideoEmbeddable(v.videoId)))
  const embeddableHead = head.filter((_, idx) => checks[idx])
  const filteredVideos = embeddableHead.length > 0 ? [...embeddableHead, ...tail] : videos

  const result = mode === 'lyrics' ? filteredVideos.slice(0, 10) : filteredVideos
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
      // Fallback abajo
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
    // Fallback abajo
  }

  return fallbackCover
}

export async function extractSpotifyPlaylistFromEmbed(playlistId, spotifyToken = '') {
  // 1. Token automático del servidor (Client Credentials) o token OAuth del usuario: pagina TODAS las canciones sin límite
  const effectiveToken = (spotifyToken || '').trim() || (await getAutomaticSpotifyToken())
  if (effectiveToken) {
    const headers = { Authorization: `Bearer ${effectiveToken}` }
    const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers })
    if (plRes.status === 401 && spotifyToken) {
      throw new Error(
        'Tu sesión de Spotify expiró (dura 1 hora). Haz clic en "Re-conectar Spotify" para renovarla y extraer todas las canciones.'
      )
    }
    if (plRes.ok) {
      const plData = await plRes.json()
      const coverUrl =
        plData?.images?.[0]?.url ||
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80'
      const canciones = []
      let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&offset=0`
      let usedFallbackTracksEndpoint = false

      while (nextUrl) {
        let pageRes = await fetch(nextUrl, { headers })
        if (!pageRes.ok && !usedFallbackTracksEndpoint) {
          usedFallbackTracksEndpoint = true
          nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&offset=0`
          pageRes = await fetch(nextUrl, { headers })
        }
        if (!pageRes.ok) break
        const pageJson = await pageRes.json()
        for (const item of pageJson.items || []) {
          const t = item?.track || item?.item
          if (!t || !t.name) continue
          canciones.push({
            titulo: t.name,
            artista: (t.artists || []).map(a => a.name).join(', ') || 'Artista Spotify',
            album: t.album?.name || plData.name || 'Spotify',
            genero: 'Pop',
            duracion_segundos: Math.max(30, Math.round((t.duration_ms || 200000) / 1000)),
            reproducciones: 0,
            plataforma_origen: 'spotify',
            spotify_track_id: t.uri || `spotify:track:${t.id}`,
            portada_url: t.album?.images?.[0]?.url || coverUrl,
            audio_url: ''
          })
        }
        nextUrl = pageJson.next || null
      }
      if (canciones.length > 0) {
        return {
          externalId: `sp_ext_${playlistId}`,
          nombre: plData.name || 'Playlist importada de Spotify',
          descripcion: `Extraída completa desde Spotify (${canciones.length} canciones)`,
          plataforma_origen: 'spotify',
          portada_url: coverUrl,
          canciones
        }
      }
    }
  }

  // 2. Fallback público vía embed (hasta 100 pistas públicas si no hay token OAuth)
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
    } else if (node.musicResponsiveListItemRenderer) {
      const m = node.musicResponsiveListItemRenderer
      const videoId =
        m.playlistItemData?.videoId ||
        m.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId)
        const flexCols = m.flexColumns || []
        const titleRuns = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
        const artistRuns = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
        const durRuns = m.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || []

        const titulo = titleRuns.map(r => r.text).join('').trim() || 'Canción'
        const artistaRaw = artistRuns
          .map(r => r.text)
          .join('')
          .split('•')[0]
          .trim()
        const artista = artistaRaw || 'Artista YouTube Music'
        const durText = durRuns.map(r => r.text).join('').trim()
        const durSecs = parseDurationToSeconds(durText)
        const thumb =
          m.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

        videos.push({
          titulo,
          artista,
          album: headerTitle,
          genero: 'Pop',
          duracion_segundos: durSecs,
          reproducciones: 0,
          plataforma_origen: isYtMusic ? 'youtube_music' : 'youtube',
          youtube_video_id: videoId,
          youtube_candidates: [videoId],
          portada_url: thumb,
          audio_url: ''
        })
      }
    } else if (
      node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token &&
      !nextContinuation
    ) {
      nextContinuation = node.continuationItemRenderer.continuationEndpoint.continuationCommand.token
    } else if (node.nextContinuationData?.continuation && !nextContinuation) {
      nextContinuation = node.nextContinuationData.continuation
    } else {
      const vals = Object.values(node)
      for (let i = vals.length - 1; i >= 0; i--) {
        if (vals[i] && typeof vals[i] === 'object') stack.push(vals[i])
      }
    }
  }

  return { videos, nextContinuation }
}

async function fetchYoutubeBrowsePlaylist(listId, isYtMusic, useRemixEndpoint) {
  const endpoint = useRemixEndpoint
    ? 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false'
    : 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false'

  const ytContext = useRemixEndpoint
    ? {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240726.01.00',
          hl: 'es',
          gl: 'AR'
        }
      }
    : {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240726.00.00',
          hl: 'es',
          gl: 'AR'
        }
      }

  const res = await fetch(endpoint, {
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

  if (!res.ok) return null
  const json = await res.json()

  const headerTitle =
    json?.header?.musicDetailHeaderRenderer?.title?.runs?.map(r => r.text).join('') ||
    json?.header?.musicResponsiveHeaderRenderer?.title?.runs?.map(r => r.text).join('') ||
    json?.header?.playlistHeaderRenderer?.title?.simpleText ||
    json?.metadata?.playlistMetadataRenderer?.title ||
    (isYtMusic ? 'Playlist de YouTube Music' : 'Playlist de YouTube')

  const seenIds = new Set()
  const firstPage = collectYoutubePlaylistNodes(json, isYtMusic, headerTitle, seenIds)
  const videos = [...firstPage.videos]
  let token = firstPage.nextContinuation
  let pages = 0

  while (token && pages < 50) {
    pages++
    try {
      const contRes = await fetch(endpoint, {
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

  return { headerTitle, videos }
}

export async function extractYoutubePlaylistInnerTube(listId, isYtMusic = false) {
  let result = null
  if (isYtMusic) {
    result = await fetchYoutubeBrowsePlaylist(listId, true, true)
  }
  if (!result || !result.videos.length) {
    result = await fetchYoutubeBrowsePlaylist(listId, isYtMusic, false)
  }
  if (!result || !result.videos.length) {
    throw new Error('No se encontraron videos públicos en esa playlist. Asegúrate de que no sea privada.')
  }

  return {
    externalId: `yt_ext_${listId}`,
    nombre: result.headerTitle,
    descripcion: `Extraída desde ${isYtMusic ? 'YouTube Music' : 'YouTube'} (${result.videos.length} pistas)`,
    plataforma_origen: isYtMusic ? 'youtube_music' : 'youtube',
    portada_url: result.videos[0]?.portada_url || '',
    canciones: result.videos
  }
}
