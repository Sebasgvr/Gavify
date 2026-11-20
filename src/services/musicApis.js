/**
 * GAVIFY SAAS - SERVICIO DE INTEGRACIÓN Y EXTRACCIÓN CON APIS EXTERNAS
 * Conecta con:
 * 1. Spotify Web API (OAuth 2.0 PKCE + Búsqueda + Extracción de Playlists y Canciones)
 * 2. YouTube Music API (Sincronización de Biblioteca, Mixes y Pistas)
 * 3. YouTube Data API v3 / InnerTube (Extracción de Videos Musicales, Audio Completo y Listas)
 */

const API_KEYS_STORAGE_PREFIX = 'gavify_external_api_config'

function getApiConfigStorageKey() {
  try {
    const rawUser = localStorage.getItem('gavify_current_user')
    const user = rawUser ? JSON.parse(rawUser) : null
    const userId = user?.id ? String(user.id) : 'anon'
    return `${API_KEYS_STORAGE_PREFIX}_${userId}`
  } catch {
    return `${API_KEYS_STORAGE_PREFIX}_anon`
  }
}

export function getExternalApiConfig() {
  try {
    const raw = localStorage.getItem(getApiConfigStorageKey())
    const saved = raw ? JSON.parse(raw) : {}
    return {
      spotifyClientId: saved.spotifyClientId || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
      spotifyAccessToken: saved.spotifyAccessToken || '',
      spotifyRefreshToken: saved.spotifyRefreshToken || '',
      spotifyTokenExpiresAt: Number(saved.spotifyTokenExpiresAt) || 0,
      youtubeClientId:
        saved.youtubeClientId ||
        import.meta.env.VITE_YOUTUBE_CLIENT_ID ||
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '',
      youtubeApiKey: saved.youtubeApiKey || import.meta.env.VITE_YOUTUBE_API_KEY || '',
      youtubeAccessToken: saved.youtubeAccessToken || ''
    }
  } catch {
    return {
      spotifyClientId: '',
      spotifyAccessToken: '',
      spotifyRefreshToken: '',
      spotifyTokenExpiresAt: 0,
      youtubeClientId: '',
      youtubeApiKey: '',
      youtubeAccessToken: ''
    }
  }
}

export function saveExternalApiConfig(config) {
  const current = getExternalApiConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(getApiConfigStorageKey(), JSON.stringify(updated))
  return updated
}

// Catálogos y Playlists pre-sincronizadas de las cuentas conectadas (Spotify, YouTube Music y YouTube)
// Cada canción incluye IDs reales de reproducción completa de YouTube / YouTube Music
// Sin playlists falsas pre-cargadas: las playlists se extraen únicamente desde enlaces o cuentas reales
export const CATALOGOS_SINCRONIZADOS = {
  spotify: { nombre: 'Spotify', color: '#1ed760', playlists: [] },
  youtube_music: { nombre: 'YouTube Music', color: '#ff4e45', playlists: [] },
  youtube: { nombre: 'YouTube', color: '#ff0000', playlists: [] }
}

export const musicApiService = {
  async getSpotifyClientId() {
    const config = getExternalApiConfig()
    if (config.spotifyClientId && config.spotifyClientId !== 'your-spotify-client-id') {
      return config.spotifyClientId
    }
    try {
      const res = await fetch('/api/spotify-config')
      if (res.ok) {
        const data = await res.json()
        if (data?.clientId) return data.clientId
      }
    } catch {}
    return ''
  },

  async startSpotifyPkceAuth() {
    const clientId = await this.getSpotifyClientId()
    if (!clientId) {
      throw new Error('Falta configurar SPOTIFY_CLIENT_ID en .env para iniciar sesión real con Spotify.')
    }

    const randomBytes = new Uint8Array(48)
    crypto.getRandomValues(randomBytes)
    const verifier = btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const redirectUri = `${window.location.origin}/connect`
    sessionStorage.setItem('spotify_pkce_verifier', verifier)
    sessionStorage.setItem('spotify_pkce_client_id', clientId)
    sessionStorage.setItem('spotify_pkce_redirect_uri', redirectUri)

    const scopes =
      'streaming user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-read-email user-read-private'
    const authUrl = new URL('https://accounts.spotify.com/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    authUrl.searchParams.set('code_challenge', challenge)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('show_dialog', 'true')

    window.location.href = authUrl.toString()
  },

  async completeSpotifyPkceCallback(code) {
    const verifier = sessionStorage.getItem('spotify_pkce_verifier')
    const clientId = sessionStorage.getItem('spotify_pkce_client_id') || (await this.getSpotifyClientId())
    const redirectUri = sessionStorage.getItem('spotify_pkce_redirect_uri') || `${window.location.origin}/connect`

    if (!verifier || !clientId) {
      throw new Error('La sesión de autorización de Spotify expiró. Intenta conectar nuevamente.')
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    })

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || 'No se pudo obtener el token de Spotify.')
    }

    const cfg = getExternalApiConfig()
    const expiresInMs = (Number(tokenJson.expires_in) || 3600) * 1000
    saveExternalApiConfig({
      ...cfg,
      spotifyAccessToken: tokenJson.access_token,
      spotifyRefreshToken: tokenJson.refresh_token || cfg.spotifyRefreshToken || '',
      spotifyTokenExpiresAt: Date.now() + expiresInMs
    })

    sessionStorage.removeItem('spotify_pkce_verifier')
    sessionStorage.removeItem('spotify_pkce_client_id')
    sessionStorage.removeItem('spotify_pkce_redirect_uri')

    // Obtener perfil real del usuario en Spotify
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    })
    const me = meRes.ok ? await meRes.json() : {}

    return {
      accessToken: tokenJson.access_token,
      profile: {
        id: me.id || null,
        displayName: me.display_name || me.email || 'Usuario Spotify',
        email: me.email || ''
      }
    }
  },

  async ensureValidSpotifyToken() {
    const cfg = getExternalApiConfig()
    if (!cfg.spotifyAccessToken) return ''

    const needsRefresh =
      cfg.spotifyRefreshToken &&
      (!cfg.spotifyTokenExpiresAt || Date.now() >= cfg.spotifyTokenExpiresAt - 120_000)

    if (!needsRefresh) return cfg.spotifyAccessToken

    try {
      const clientId = await this.getSpotifyClientId()
      if (!clientId) return cfg.spotifyAccessToken
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: cfg.spotifyRefreshToken
        })
      })
      if (!res.ok) return cfg.spotifyAccessToken
      const json = await res.json()
      if (json.access_token) {
        const expiresInMs = (Number(json.expires_in) || 3600) * 1000
        saveExternalApiConfig({
          spotifyAccessToken: json.access_token,
          spotifyRefreshToken: json.refresh_token || cfg.spotifyRefreshToken,
          spotifyTokenExpiresAt: Date.now() + expiresInMs
        })
        return json.access_token
      }
    } catch {
      // ignore network error and keep current token
    }
    return cfg.spotifyAccessToken
  },

  async fetchMySpotifyPlaylists() {
    const token = await this.ensureValidSpotifyToken()
    if (!token) return []
    const playlists = []
    let nextUrl = 'https://api.spotify.com/v1/me/playlists?limit=50'
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) break
      const json = await res.json()
      for (const p of json.items || []) {
        if (!p || !p.id) continue
        const totalCanciones = p.tracks?.total ?? p.items?.total ?? null
        playlists.push({
          id: p.id,
          nombre: p.name,
          descripcion: p.description || '',
          total: totalCanciones,
          portada_url: p.images?.[0]?.url || '',
          url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
          plataforma_origen: 'spotify'
        })
      }
      nextUrl = json.next || null
    }
    return playlists
  },

  /**
   * Resuelve los IDs reales de reproducción completa en YouTube para cualquier canción
   */
  async resolveYoutubeCandidates(query) {
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}&mode=lyrics`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          return data.items
        }
      }
    } catch (e) {
      console.warn('Could not resolve YouTube candidates from local middleware:', e)
    }
    return []
  },

  async searchTracks(platform = 'spotify', query = '') {
    return this.searchTracksLive(query, platform)
  },

  async searchTracksLive(query, platform = 'spotify') {
    const cleanQuery = (query || '').trim()
    if (!cleanQuery) return []

    const config = getExternalApiConfig()

    // 1. Si es Spotify y el usuario ingresó un Access Token de Spotify Web API
    if (platform === 'spotify' && config.spotifyAccessToken) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQuery)}&type=track&limit=50`,
          { headers: { Authorization: `Bearer ${config.spotifyAccessToken}` } }
        )
        if (res.ok) {
          const json = await res.json()
          return (json.tracks?.items || []).map(item => ({
            external_id: item.id,
            titulo: item.name,
            artista: item.artists?.map(a => a.name).join(', ') || 'Artista',
            album: item.album?.name || 'Single',
            genero: 'Pop',
            duracion_segundos: Math.round((item.duration_ms || 215000) / 1000),
            reproducciones: Math.floor((item.popularity || 50) * 1.5),
            portada_url: item.album?.images?.[0]?.url || '',
            audio_url: '',
            preview_url: item.preview_url || null,
            plataforma_origen: 'spotify',
            spotify_track_id: item.uri || `spotify:track:${item.id}`,
            external_url: item.external_urls?.spotify || null
          }))
        }
      } catch (e) {
        console.warn('Spotify API direct call fallback to live public catalog:', e)
      }
    }

    // 2. Si el usuario selecciona YouTube o YouTube Music directamente, buscamos en vivo en YouTube
    if (platform === 'youtube' || platform === 'youtube_music') {
      try {
        const ytQuery = platform === 'youtube_music' ? `${cleanQuery} official audio` : cleanQuery
        const ytRes = await fetch(`/api/yt-search?q=${encodeURIComponent(ytQuery)}&mode=search`)
        if (ytRes.ok) {
          const ytJson = await ytRes.json()
          if (Array.isArray(ytJson.items) && ytJson.items.length > 0) {
            return ytJson.items.map(v => {
              const rawTitle = v.title || 'Canción'
              const parts = rawTitle.split(' - ')
              const artista = parts.length > 1 ? parts[0].trim() : (v.channel || 'Artista')
              const titulo = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawTitle
              return {
                external_id: `${platform === 'youtube_music' ? 'ytm' : 'yt'}_${v.videoId}`,
                titulo,
                artista,
                album: platform === 'youtube_music' ? 'YouTube Music' : 'YouTube Oficial',
                genero: 'Música',
                duracion_segundos: v.durationSeconds || 215,
                reproducciones: v.viewCount || 0,
                portada_url: v.thumbnail,
                audio_url: '',
                preview_url: null,
                plataforma_origen: platform,
                youtube_video_id: v.videoId,
                ytmusic_track_id: platform === 'youtube_music' ? v.videoId : null,
                youtube_candidates: [v.videoId],
                external_url:
                  platform === 'youtube_music'
                    ? `https://music.youtube.com/watch?v=${v.videoId}`
                    : `https://www.youtube.com/watch?v=${v.videoId}`
              }
            })
          }
        }
      } catch (e) {
        console.warn('Direct YouTube search fallback:', e)
      }
    }

    // 3. Búsqueda en vivo universal (metadatos oficiales de artista, álbum y portada HD + resolución de canción completa real)
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?media=music&entity=song&limit=200&term=${encodeURIComponent(cleanQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const vistos = new Set()
          const baseTracks = []
          for (const track of data.results) {
            const titulo = (track.trackName || 'Sin título').trim()
            const artista = (track.artistName || 'Artista desconocido').trim()
            const clave = `${titulo.toLowerCase()}|${artista.toLowerCase()}`
            if (vistos.has(clave)) continue
            vistos.add(clave)

            const highResCover = track.artworkUrl100
              ? track.artworkUrl100.replace('100x100bb', '400x400bb')
              : ''
            const hashId = String(track.trackId || Math.floor(Math.random() * 999999))
            baseTracks.push({
              external_id: `${platform}_${hashId}`,
              titulo,
              artista,
              album: track.collectionName || 'Single',
              genero: this.normalizeGenre(track.primaryGenreName),
              duracion_segundos: Math.round((track.trackTimeMillis || 215000) / 1000),
              reproducciones: 0,
              portada_url: highResCover,
              audio_url: '',
              preview_url: platform === 'spotify' ? (track.previewUrl || null) : null,
              plataforma_origen: platform,
              spotify_track_id: null,
              ytmusic_track_id: platform === 'youtube_music' ? `ytm_track_${hashId}` : null,
              youtube_video_id: null,
              external_url: track.trackViewUrl || null
            })
          }
          return baseTracks
        }
      }
    } catch (err) {
      console.warn('Live search offline fallback:', err)
    }

    return []
  },

  async searchTracksAcrossPlatforms(query, platforms = ['spotify']) {
    const cleanQuery = (query || '').trim()
    if (!cleanQuery) return []
    const active = Array.isArray(platforms) && platforms.length ? platforms : ['spotify']
    const lists = await Promise.all(active.map(p => this.searchTracksLive(cleanQuery, p)))
    const merged = []
    const maxLen = Math.max(0, ...lists.map(l => l.length))
    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        if (list[i]) merged.push(list[i])
      }
    }
    return merged
  },

  normalizeGenre(rawGenre = '') {
    const g = rawGenre.toLowerCase()
    if (g.includes('indie')) return 'Indie Pop'
    if (g.includes('rock') || g.includes('metal')) return 'Rock'
    if (g.includes('alternat')) return 'Alternativo'
    if (g.includes('r&b') || g.includes('soul')) return 'R&B'
    if (g.includes('dance') || g.includes('electr') || g.includes('house')) return 'Electrónica'
    if (g.includes('urbano') || g.includes('latino') || g.includes('reggaeton') || g.includes('trap')) return 'Trap / Urbano'
    if (g.includes('hip-hop') || g.includes('rap')) return 'Hip Hop'
    if (g.includes('jazz')) return 'Jazz / Soul'
    if (g.includes('pop')) return 'Pop'
    return 'Pop'
  },

  getSyncedCatalogByPlatform(platform = 'spotify') {
    return CATALOGOS_SINCRONIZADOS[platform] || CATALOGOS_SINCRONIZADOS.spotify
  },

  async fetchRealTrackPlays(track, platformOverride = null) {
    if (!track) return 0
    const platform = platformOverride || track.plataforma_origen || 'spotify'
    const query = `${track.titulo || ''} ${track.artista || ''}`.trim()
    if (!query && !track.youtube_video_id) return 0
    try {
      const params = new URLSearchParams({
        q: query,
        platform
      })
      if (track.youtube_video_id) {
        params.set('videoId', track.youtube_video_id)
      }
      const res = await fetch(`/api/track-stats?${params.toString()}`)
      if (!res.ok) return 0
      const data = await res.json()
      return Number(data?.plays || 0)
    } catch {
      return 0
    }
  },

  async extractPlaylistByUrl(playlistUrl) {
    const cleanUrl = String(playlistUrl || '').trim()
    if (!cleanUrl) {
      throw new Error('Pega el enlace de tu playlist de Spotify, YouTube Music o YouTube.')
    }
    const config = getExternalApiConfig()
    const params = new URLSearchParams({ url: cleanUrl })
    if (config.spotifyAccessToken) {
      params.set('spotifyToken', config.spotifyAccessToken)
    }
    const res = await fetch(`/api/extract-playlist?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok || !data.playlist) {
      throw new Error(data.error || 'No se pudo extraer esa playlist. Verifica que el enlace sea público.')
    }
    return data.playlist
  },

  async getGoogleClientId() {
    const config = getExternalApiConfig()
    if (config.youtubeClientId && !config.youtubeClientId.startsWith('your-')) {
      return config.youtubeClientId
    }
    try {
      const res = await fetch('/api/google-config')
      const data = await res.json().catch(() => ({}))
      if (data?.configured && data?.clientId) {
        saveExternalApiConfig({ youtubeClientId: data.clientId })
        return data.clientId
      }
    } catch {
      // Ignorar si no responde
    }
    return ''
  },

  async startGoogleYoutubeAuth(platform = 'youtube_music') {
    const clientId = await this.getGoogleClientId()
    if (!clientId) {
      throw new Error(
        'Falta configurar GOOGLE_CLIENT_ID (o VITE_YOUTUBE_CLIENT_ID) en .env / Netlify para conectar tu cuenta de Google y YouTube Music.'
      )
    }

    const redirectUri = `${window.location.origin}/connect`
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scopes,
      include_granted_scopes: 'true',
      prompt: 'consent',
      state: `google:${platform}`
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  },

  async completeGoogleYoutubeCallback(hashString = '') {
    const cleanHash = String(hashString || '').replace(/^#/, '')
    const params = new URLSearchParams(cleanHash)
    const accessToken = params.get('access_token')
    const grantedScope = params.get('scope') || ''
    const state = params.get('state') || 'google:youtube_music'
    const platform = state.startsWith('google:') ? state.slice(7) : 'youtube_music'

    if (!accessToken) {
      throw new Error('Google no devolvió un token de acceso válido.')
    }

    if (grantedScope && !grantedScope.includes('youtube')) {
      saveExternalApiConfig({ youtubeAccessToken: '' })
      throw new Error(
        'Faltó marcar el permiso de YouTube en Google. Vuelve a conectar y tilda la casilla "Ver tu cuenta de YouTube" antes de darle a Continuar.'
      )
    }

    saveExternalApiConfig({ youtubeAccessToken: accessToken })

    let profile = { id: `google_${Date.now()}`, displayName: 'Cuenta Google / YouTube', email: '' }
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (profileRes.ok) {
        const data = await profileRes.json()
        profile = {
          id: data.id || profile.id,
          displayName: data.name || data.email || profile.displayName,
          email: data.email || ''
        }
      }
    } catch {
      // Continuar con el perfil por defecto
    }

    return { accessToken, profile, platform }
  },

  async fetchMyYoutubePlaylists() {
    const { youtubeAccessToken } = getExternalApiConfig()
    if (!youtubeAccessToken) return []

    const all = []
    let pageToken = ''

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50'
      })
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`, {
        headers: { Authorization: `Bearer ${youtubeAccessToken}` }
      })

      if (res.status === 401) {
        saveExternalApiConfig({ youtubeAccessToken: '' })
        return []
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData?.error?.message || ''
        if (res.status === 403 && msg.toLowerCase().includes('insufficient')) {
          saveExternalApiConfig({ youtubeAccessToken: '' })
          throw new Error(
            'Faltó el permiso de YouTube (youtube.readonly). Haz clic en "Cambiar cuenta" y asegúrate de tildar la casilla de YouTube en la pantalla de Google (y de tenerlo agregado en Google Auth Platform → Acceso a los datos).'
          )
        }
        throw new Error(msg || 'No se pudieron obtener tus playlists de YouTube / YT Music.')
      }

      const data = await res.json()
      for (const item of data.items || []) {
        const thumbs = item.snippet?.thumbnails || {}
        const cover =
          thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || ''
        all.push({
          id: item.id,
          nombre: item.snippet?.title || 'Playlist de YouTube',
          total: item.contentDetails?.itemCount ?? 0,
          portada: cover,
          url: `https://music.youtube.com/playlist?list=${item.id}`,
          youtubeUrl: `https://www.youtube.com/playlist?list=${item.id}`
        })
      }
      pageToken = data.nextPageToken || ''
    } while (pageToken)

    return all
  },

  async extractYoutubePlaylistWithToken(playlistMeta, platform = 'youtube_music') {
    const { youtubeAccessToken } = getExternalApiConfig()
    if (!youtubeAccessToken) {
      throw new Error('Tu sesión de Google / YouTube expiró. Vuelve a vincular tu cuenta.')
    }

    const playlistId = typeof playlistMeta === 'string' ? playlistMeta : playlistMeta.id
    const items = []
    let pageToken = ''

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50'
      })
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`, {
        headers: { Authorization: `Bearer ${youtubeAccessToken}` }
      })

      if (res.status === 401) {
        saveExternalApiConfig({ youtubeAccessToken: '' })
        throw new Error('Tu sesión de Google expiró. Vuelve a conectar tu cuenta.')
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData?.error?.message || ''
        if (res.status === 403 && msg.toLowerCase().includes('insufficient')) {
          saveExternalApiConfig({ youtubeAccessToken: '' })
          throw new Error(
            'Faltó el permiso de YouTube (youtube.readonly). Haz clic en "Cambiar cuenta" y tilda la casilla de YouTube al autorizar.'
          )
        }
        throw new Error(msg || 'No se pudieron leer las canciones de la playlist.')
      }

      const data = await res.json()
      for (const entry of data.items || []) {
        const snippet = entry.snippet || {}
        const videoId = entry.contentDetails?.videoId || snippet.resourceId?.videoId || ''
        if (!videoId) continue
        const title = snippet.title || ''
        if (title === 'Deleted video' || title === 'Private video') continue
        const thumbs = snippet.thumbnails || {}
        const portada =
          thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || ''
        const artista = (snippet.videoOwnerChannelTitle || 'Artista').replace(/\s*-\s*Topic$/i, '').trim()

        items.push({
          videoId,
          titulo: title,
          artista,
          portada
        })
      }
      pageToken = data.nextPageToken || ''
    } while (pageToken)

    // Obtener duraciones en lotes de 50
    const durationMap = new Map()
    for (let i = 0; i < items.length; i += 50) {
      const batchIds = items.slice(i, i + 50).map((it) => it.videoId).join(',')
      try {
        const vRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(batchIds)}`,
          { headers: { Authorization: `Bearer ${youtubeAccessToken}` } }
        )
        if (vRes.ok) {
          const vData = await vRes.json()
          for (const v of vData.items || []) {
            const iso = v.contentDetails?.duration || ''
            const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
            if (m) {
              const secs =
                Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
              durationMap.set(v.id, secs)
            }
          }
        }
      } catch {
        // Ignorar error de duración y usar fallback
      }
    }

    const canciones = items.map((it) => ({
      titulo: it.titulo,
      artista: it.artista,
      album: platform === 'youtube_music' ? 'YouTube Music' : 'YouTube',
      duracion_seg: durationMap.get(it.videoId) || 195,
      portada_url: it.portada,
      youtube_video_id: it.videoId,
      plataforma_origen: platform,
      genero: 'Música',
      reproducciones: 0
    }))

    return {
      nombre: typeof playlistMeta === 'object' ? playlistMeta.nombre : 'Playlist de YouTube',
      plataforma_origen: platform,
      portada_url:
        (typeof playlistMeta === 'object' && playlistMeta.portada) ||
        canciones[0]?.portada_url ||
        '',
      canciones
    }
  }
}
