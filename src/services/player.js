import { ref, computed } from 'vue'
import { getExternalApiConfig, musicApiService } from './musicApis'

// Diccionario instantáneo de respaldo para canciones conocidas (Video oficial + alternativas embebibles)
const KNOWN_SONG_CANDIDATES = {
  'as it was': ['H5v3kku4y6Q', 'Qfm6nfz1QNQ', 'EsY5kRIBM8Y'],
  'blinding lights': ['4NRXx6U8ABQ', 'XwxLwG2_Sxk', '13pZOoLr46M'],
  'flowers': ['G7KNmW9a75Y', 'iawgB2CDCrw', 'o1dfTZS8E90'],
  'calm down': ['WcIcVapfqXw', 'G-D80U_u3sk', 'XCXobyGlAzc'],
  'bzrp music sessions #52': ['A_g3lMcWVy0', 'tJWWJiVYiUA', 'lI3Q9_hg7zA'],
  'midnight city': ['dX3k_QDnzHE', '8zf7Ht4hqsc', '1D2ItvuOlV4'],
  'breezeblocks': ['rVeMiVU77wo', 'pHx252Gfdms', 'nPlXdFwWcV4'],
  'starboy': ['34Na4j8AVgA', 'xizN47Box_Y', 'lMihSJwIGTA'],
  'do i wanna know?': ['bpOSxM0rNPM', 'PUL2mVdt3xo', 'lPe5zInLju4'],
  'de música ligera': ['IibXYWSBpZw', 'VwTQ6Mt2kt4', 'mzlj5Lnapeg'],
  'de musica ligera': ['IibXYWSBpZw', 'VwTQ6Mt2kt4', 'mzlj5Lnapeg'],
  'viva la vida': ['dvgZkm1xWPE', 'y4zdDXPYo0I', 'BA-YR8ptlK0'],
  'the scientist': ['RB-RcX5DS5A', 'QSVfXaFNFho', 'mzTew3e0Ygk'],
  'yellow': ['yKNxeF4KMsY', '7PDUO3l8xiM'],
  'she will be loved': ['nIjVuRTm-dc', 'Towlyz-3vYA', 'OqkD30kxLMQ']
}

const SAVED_SONGS_KEY = 'gavify_saved_songs_v1'
const PLAYER_STATE_KEY = 'gavify_player_state_v1'
const LISTENING_HISTORY_PREFIX = 'gavify_listening_history'
const candidateMemoryCache = new Map()
const lyricsMemoryCache = new Map()

function getListeningHistoryKey() {
  try {
    const rawUser = localStorage.getItem('gavify_current_user')
    const user = rawUser ? JSON.parse(rawUser) : null
    const userId = user?.id ? String(user.id) : 'anon'
    return `${LISTENING_HISTORY_PREFIX}_${userId}`
  } catch {
    return `${LISTENING_HISTORY_PREFIX}_anon`
  }
}

function loadListeningHistory() {
  try {
    const raw = localStorage.getItem(getListeningHistoryKey())
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const listeningHistory = ref(loadListeningHistory())

function refreshListeningHistoryForCurrentUser() {
  listeningHistory.value = loadListeningHistory()
}

function recordListeningEvent(track) {
  if (!track || !track.titulo) return
  try {
    const key = getListeningHistoryKey()
    const current = loadListeningHistory()
    const entry = {
      id: track.id || track.external_id || `${track.titulo}_${track.artista}`,
      titulo: track.titulo,
      artista: track.artista || 'Artista',
      genero: track.genero || 'Pop',
      portada_url: track.portada_url || '',
      plataforma_origen: track.plataforma_origen || 'spotify',
      duracion_segundos: Number(track.duracion_segundos) || 215,
      spotify_track_id: track.spotify_track_id || null,
      youtube_video_id: track.youtube_video_id || null,
      external_id: track.external_id || null,
      external_url: track.external_url || null,
      playedAt: new Date().toISOString()
    }
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const updated = [entry, ...current]
      .filter(item => new Date(item.playedAt).getTime() >= cutoff)
      .slice(0, 500)
    localStorage.setItem(key, JSON.stringify(updated))
    listeningHistory.value = updated
  } catch {
    // ignore storage quota
  }
}

function loadSavedPlayerState() {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePlayerState() {
  try {
    if (!currentTrack.value) {
      localStorage.removeItem(PLAYER_STATE_KEY)
      return
    }
    localStorage.setItem(
      PLAYER_STATE_KEY,
      JSON.stringify({
        currentTrack: currentTrack.value,
        queue: queue.value.slice(0, 100),
        currentIndex: currentIndex.value,
        currentTime: Math.floor(currentTime.value || 0),
        duration: Number(duration.value) || Number(currentTrack.value?.duracion_segundos) || 215,
        isShuffle: isShuffle.value,
        isRepeat: isRepeat.value,
        isRepeatOne: isRepeatOne.value,
        volume: volume.value,
        isMuted: isMuted.value
      })
    )
  } catch {
    // ignore storage quota
  }
}

function clearSavedPlayerState() {
  try {
    localStorage.removeItem(PLAYER_STATE_KEY)
  } catch {}
}

function loadSavedIds() {
  try {
    const raw = localStorage.getItem(SAVED_SONGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function isValidYoutubeId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id)
}

const _restoredState = loadSavedPlayerState()
const currentTrack = ref(_restoredState?.currentTrack || null)
const queue = ref(Array.isArray(_restoredState?.queue) ? _restoredState.queue : [])
const currentIndex = ref(typeof _restoredState?.currentIndex === 'number' ? _restoredState.currentIndex : -1)
const isPlaying = ref(false)
const isLoadingStream = ref(false)
const isShuffle = ref(Boolean(_restoredState?.isShuffle))
const shuffleOrder = ref([])
const isRepeat = ref(Boolean(_restoredState?.isRepeat))
const isRepeatOne = ref(Boolean(_restoredState?.isRepeatOne))
const showQueue = ref(false)
const isQueueExpanded = ref(false)
const volume = ref(typeof _restoredState?.volume === 'number' ? _restoredState.volume : 0.85)
const isMuted = ref(Boolean(_restoredState?.isMuted))
const currentTime = ref(Number(_restoredState?.currentTime) || 0)
const duration = ref(Number(_restoredState?.duration) || 0)
const savedTrackIds = ref(loadSavedIds())
const saveFeedback = ref('')
let needsStreamReloadOnResume = Boolean(_restoredState?.currentTrack)

// Estado de Ventana de Video (Chiquita vs Expandida ocupando el cuadro de interfaz)
const showMiniVideo = ref(false)
const isVideoExpanded = ref(false)

// Estado de Letras (API LRCLIB / Lyrics.ovh)
const showLyrics = ref(false)
const isLyricsExpanded = ref(false)
const isLoadingLyrics = ref(false)
const plainLyrics = ref('')
const syncedLyrics = ref([]) // [{ time: number, text: string }]

const activeEngine = ref('youtube') // 'youtube' | 'html5' | 'spotify'

let audioInstance = null
let ytPlayer = null
let ytApiReadyPromise = null
let ytTimeInterval = null
let streamWatchdogTimer = null
let currentCandidateIds = []
let currentCandidateIndex = 0
let activePlayRequestId = 0

// Spotify Web Playback SDK (reproducción directa para cuentas Spotify Premium)
let spotifyPlayer = null
let spotifyDeviceId = ''
let spotifyReadyPromise = null
let spotifyPremiumBlocked = false
let spotifyTimeInterval = null
let lastSpotifyPositionMs = 0
let lastSpotifyTokenUsed = ''

function resetSpotifySdkSession() {
  stopSpotifyTimePolling()
  if (spotifyPlayer && typeof spotifyPlayer.disconnect === 'function') {
    try {
      spotifyPlayer.disconnect()
    } catch {}
  }
  spotifyPlayer = null
  spotifyDeviceId = ''
  spotifyReadyPromise = null
  spotifyPremiumBlocked = false
  lastSpotifyPositionMs = 0
}

function extractSpotifyTrackId(track) {
  if (!track) return ''
  const rawId = String(track.spotify_track_id || '').trim()
  if (rawId) {
    const uriMatch = rawId.match(/spotify:track:([a-zA-Z0-9]{22})/)
    if (uriMatch) return uriMatch[1]
    if (/^[a-zA-Z0-9]{22}$/.test(rawId)) return rawId
  }
  const ext = String(track.external_id || '').trim()
  if (ext.startsWith('spotify_') && /^[a-zA-Z0-9]{22}$/.test(ext.slice(8))) {
    return ext.slice(8)
  }
  const url = String(track.external_url || '').trim()
  const urlMatch = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/)
  return urlMatch ? urlMatch[1] : ''
}

async function resolveSpotifyTrackIdOnTheFly(track, token) {
  const existing = extractSpotifyTrackId(track)
  if (existing) return existing
  if (!token || !track?.titulo) return ''
  try {
    const q = `track:${track.titulo} artist:${track.artista || ''}`.trim()
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return ''
    const data = await res.json()
    const foundId = data?.tracks?.items?.[0]?.id || ''
    if (foundId) {
      track.spotify_track_id = `spotify:track:${foundId}`
    }
    return foundId
  } catch {
    return ''
  }
}

function startSpotifyTimePolling() {
  if (spotifyTimeInterval) clearInterval(spotifyTimeInterval)
  spotifyTimeInterval = setInterval(() => {
    if (activeEngine.value === 'spotify' && isPlaying.value) {
      currentTime.value = Math.min(duration.value || 360, (currentTime.value || 0) + 0.5)
    }
  }, 500)
}

function stopSpotifyTimePolling() {
  if (spotifyTimeInterval) {
    clearInterval(spotifyTimeInterval)
    spotifyTimeInterval = null
  }
}

function ensureSpotifyPlayer() {
  if (typeof window === 'undefined') return Promise.resolve('')
  const token = getExternalApiConfig().spotifyAccessToken
  if (token !== lastSpotifyTokenUsed) {
    resetSpotifySdkSession()
    lastSpotifyTokenUsed = token || ''
  }
  if (!token || spotifyPremiumBlocked) return Promise.resolve('')
  if (spotifyPlayer && spotifyDeviceId) return Promise.resolve(spotifyDeviceId)
  if (spotifyReadyPromise) return spotifyReadyPromise

  spotifyReadyPromise = new Promise(resolve => {
    const timeout = setTimeout(() => {
      resolve(spotifyDeviceId || '')
    }, 8000)

    const initSdk = () => {
      if (!window.Spotify?.Player) {
        clearTimeout(timeout)
        resolve('')
        return
      }
      spotifyPlayer = new window.Spotify.Player({
        name: 'Gavify Web Player',
        getOAuthToken: cb => {
          cb(getExternalApiConfig().spotifyAccessToken || '')
        },
        volume: isMuted.value ? 0 : volume.value
      })

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        spotifyDeviceId = device_id
        clearTimeout(timeout)
        resolve(device_id)
      })

      spotifyPlayer.addListener('not_ready', () => {
        spotifyDeviceId = ''
      })

      spotifyPlayer.addListener('account_error', () => {
        // Cuenta Spotify gratuita: el SDK exige Premium
        spotifyPremiumBlocked = true
        spotifyDeviceId = ''
        clearTimeout(timeout)
        resolve('')
      })

      spotifyPlayer.addListener('authentication_error', () => {
        spotifyDeviceId = ''
        clearTimeout(timeout)
        resolve('')
      })

      spotifyPlayer.addListener('player_state_changed', state => {
        if (!state || activeEngine.value !== 'spotify') return
        const posMs = Number(state.position) || 0
        const durMs = Number(state.duration) || 0
        currentTime.value = posMs / 1000
        if (durMs > 0) duration.value = durMs / 1000

        const ended =
          state.paused &&
          posMs === 0 &&
          lastSpotifyPositionMs > 1500 &&
          !state.loading
        lastSpotifyPositionMs = posMs

        if (ended) {
          isPlaying.value = false
          handleTrackEnded()
          return
        }

        isPlaying.value = !state.paused
        isLoadingStream.value = Boolean(state.loading)
      })

      spotifyPlayer.connect().then(ok => {
        if (!ok) {
          clearTimeout(timeout)
          resolve('')
        }
      })
    }

    if (window.Spotify?.Player) {
      initSdk()
    } else {
      const prevReady = window.onSpotifyWebPlaybackSDKReady
      window.onSpotifyWebPlaybackSDKReady = () => {
        if (typeof prevReady === 'function') prevReady()
        initSdk()
      }
      if (!document.getElementById('gavify-spotify-sdk-script')) {
        const script = document.createElement('script')
        script.id = 'gavify-spotify-sdk-script'
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.head.appendChild(script)
      }
    }
  })

  return spotifyReadyPromise
}

async function playSpotifyTrack(track, requestId) {
  const token = (await musicApiService.ensureValidSpotifyToken()) || getExternalApiConfig().spotifyAccessToken
  if (token !== lastSpotifyTokenUsed) {
    resetSpotifySdkSession()
    lastSpotifyTokenUsed = token || ''
  }
  if (!token || spotifyPremiumBlocked) return false

  const trackId = await resolveSpotifyTrackIdOnTheFly(track, token)
  if (requestId !== activePlayRequestId) return true
  if (!trackId) return false

  const deviceId = await ensureSpotifyPlayer()
  if (requestId !== activePlayRequestId) return true
  if (!deviceId) return false

  try {
    if (typeof spotifyPlayer?.activateElement === 'function') {
      try {
        await spotifyPlayer.activateElement()
      } catch {}
    }

    const triggerPlay = () =>
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`]
        })
      })

    let res = await triggerPlay()
    if (res.status === 404) {
      // El dispositivo recién conectado puede tardar unos ms en registrarse en Spotify
      await new Promise(r => setTimeout(r, 750))
      if (requestId !== activePlayRequestId) return true
      res = await triggerPlay()
    }

    if (res.status === 403) {
      // Cuenta gratuita o sin Premium activo
      spotifyPremiumBlocked = true
      saveFeedback.value = 'Spotify requiere Premium para audio completo directo; usando respaldo.'
      setTimeout(() => {
        if (saveFeedback.value.startsWith('Spotify requiere Premium')) saveFeedback.value = ''
      }, 3500)
      return false
    }
    if (res.status === 401) {
      // Token vencido o sin scope 'streaming'
      saveFeedback.value = 'Re-conecta Spotify en Apps Conectadas para activar audio directo Premium.'
      setTimeout(() => {
        if (saveFeedback.value.startsWith('Re-conecta Spotify')) saveFeedback.value = ''
      }, 4000)
      return false
    }
    if (!res.ok) return false

    activeEngine.value = 'spotify'
    lastSpotifyPositionMs = 0
    updateYoutubeContainerVisibility()
    startSpotifyTimePolling()
    isPlaying.value = true
    isLoadingStream.value = false
    if (showMiniVideo.value) {
      loadVideoPreviewForCurrentTrack()
    }
    return true
  } catch {
    return false
  }
}

function clearStreamWatchdog() {
  if (streamWatchdogTimer) {
    clearTimeout(streamWatchdogTimer)
    streamWatchdogTimer = null
  }
}

async function tryNextYoutubeCandidateOrSkip(requestId = activePlayRequestId) {
  clearStreamWatchdog()
  if (requestId !== activePlayRequestId || activeEngine.value !== 'youtube') return

  if (currentCandidateIndex + 1 < currentCandidateIds.length && ytPlayer?.loadVideoById) {
    currentCandidateIndex += 1
    const nextVid = currentCandidateIds[currentCandidateIndex]
    try {
      startStreamWatchdog(requestId)
      ytPlayer.loadVideoById(nextVid)
      return
    } catch {}
  }

  const track = currentTrack.value

  // Respaldo automático con Spotify Premium si YouTube bloqueó todos los videos del tema
  if (track && getExternalApiConfig().spotifyAccessToken && !spotifyPremiumBlocked) {
    const playedViaSpotify = await playSpotifyTrack(track, requestId)
    if (requestId !== activePlayRequestId) return
    if (playedViaSpotify) {
      saveFeedback.value = 'Video bloqueado en YouTube; reproduciendo desde tu Spotify Premium.'
      setTimeout(() => {
        if (saveFeedback.value.startsWith('Video bloqueado en YouTube')) saveFeedback.value = ''
      }, 3200)
      return
    }
  }

  const previewUrl = track?.preview_url || track?.audio_url
  const isSpotifyOrCustom =
    (track?.plataforma_origen || '').toLowerCase() === 'spotify' || isCustomUploadedAudio(track)
  if (isSpotifyOrCustom && previewUrl && !previewUrl.includes('soundhelix.com')) {
    fallbackToHtml5Preview()
    return
  }

  isLoadingStream.value = false
  isPlaying.value = false
  if (queue.value.length > 1) {
    saveFeedback.value = 'Audio no disponible en YouTube, pasando al siguiente...'
    setTimeout(() => {
      if (saveFeedback.value.startsWith('Audio no disponible')) saveFeedback.value = ''
    }, 2600)
    nextTrack()
  }
}

function startStreamWatchdog(requestId = activePlayRequestId) {
  clearStreamWatchdog()
  streamWatchdogTimer = setTimeout(() => {
    if (requestId !== activePlayRequestId || activeEngine.value !== 'youtube') return
    const state = ytPlayer?.getPlayerState?.()
    // Si sigue sin reproducir (1 = PLAYING, 2 = PAUSED), probar otro video o avanzar
    if (state !== 1 && state !== 2) {
      tryNextYoutubeCandidateOrSkip(requestId)
    }
  }, 6500)
}

function ensureHtml5Audio() {
  if (!audioInstance && typeof window !== 'undefined') {
    audioInstance = new Audio()
    audioInstance.preload = 'metadata'
    audioInstance.volume = volume.value

    audioInstance.addEventListener('timeupdate', () => {
      if (activeEngine.value === 'html5') {
        currentTime.value = audioInstance.currentTime || 0
      }
    })

    audioInstance.addEventListener('loadedmetadata', () => {
      if (activeEngine.value === 'html5') {
        duration.value = audioInstance.duration || currentTrack.value?.duracion_segundos || 210
      }
    })

    audioInstance.addEventListener('play', () => {
      if (activeEngine.value === 'html5') {
        isPlaying.value = true
        isLoadingStream.value = false
      }
    })

    audioInstance.addEventListener('pause', () => {
      if (activeEngine.value === 'html5') {
        isPlaying.value = false
      }
    })

    audioInstance.addEventListener('ended', () => {
      if (activeEngine.value === 'html5') {
        handleTrackEnded()
      }
    })
  }
  return audioInstance
}

function ensureYoutubeContainer() {
  if (typeof document === 'undefined') return null
  let host = document.getElementById('gavify-yt-engine-wrapper')
  if (!host) {
    host = document.createElement('div')
    host.id = 'gavify-yt-engine-wrapper'

    // Barra superior de la ventana de video (con botón Agrandar/Achicar y Cerrar)
    const header = document.createElement('div')
    header.id = 'gavify-yt-window-header'
    header.style.cssText =
      'height:42px;padding:0 14px;background:#121612;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:10px;color:#e7ece6;font-family:"Plus Jakarta Sans","Inter",sans-serif;font-size:12px;font-weight:600;'

    const titleSpan = document.createElement('span')
    titleSpan.id = 'gavify-yt-window-title'
    titleSpan.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;'
    titleSpan.textContent = 'Video oficial'

    const actionsWrap = document.createElement('div')
    actionsWrap.style.cssText = 'display:flex;align-items:center;gap:6px;'

    const expandBtn = document.createElement('button')
    expandBtn.id = 'gavify-yt-expand-btn'
    expandBtn.type = 'button'
    expandBtn.style.cssText =
      'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:#e7ece6;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;'
    expandBtn.innerHTML = '<span>Agrandar</span>'
    expandBtn.addEventListener('click', () => {
      toggleExpandVideo()
    })

    const closeBtn = document.createElement('button')
    closeBtn.id = 'gavify-yt-close-btn'
    closeBtn.type = 'button'
    closeBtn.style.cssText =
      'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:#e7ece6;border-radius:50%;width:26px;height:26px;font-size:12px;cursor:pointer;display:grid;place-items:center;'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Cerrar ventana de video'
    closeBtn.addEventListener('click', () => {
      showMiniVideo.value = false
      isVideoExpanded.value = false
      updateYoutubeContainerVisibility()
    })

    actionsWrap.appendChild(expandBtn)
    actionsWrap.appendChild(closeBtn)
    header.appendChild(titleSpan)
    header.appendChild(actionsWrap)

    const body = document.createElement('div')
    body.id = 'gavify-yt-window-body'
    body.style.cssText = 'width:100%;height:calc(100% - 42px);background:#000;position:relative;'

    const inner = document.createElement('div')
    inner.id = 'gavify-yt-player-iframe'
    inner.style.cssText = 'width:100%;height:100%;'

    body.appendChild(inner)
    host.appendChild(header)
    host.appendChild(body)
    document.body.appendChild(host)

    window.addEventListener('resize', () => {
      if (showMiniVideo.value) updateYoutubeContainerVisibility()
    })
  }
  updateYoutubeContainerVisibility()
  return host
}

function updateYoutubeContainerVisibility() {
  if (typeof document === 'undefined') return
  const host = document.getElementById('gavify-yt-engine-wrapper')
  if (!host) return

  const titleEl = document.getElementById('gavify-yt-window-title')
  if (titleEl && currentTrack.value) {
    titleEl.textContent = `${currentTrack.value.titulo} — ${currentTrack.value.artista}`
  }

  const expandBtn = document.getElementById('gavify-yt-expand-btn')
  if (expandBtn) {
    expandBtn.innerHTML = isVideoExpanded.value ? '<span>Achicar</span>' : '<span>Agrandar</span>'
  }

  const iframeEl = host.querySelector('iframe')
  if (iframeEl) {
    iframeEl.style.width = '100%'
    iframeEl.style.height = '100%'
    iframeEl.style.border = '0'
    iframeEl.style.display = 'block'
  }

  if (showMiniVideo.value && currentTrack.value) {
    if (isVideoExpanded.value) {
      // Ocupa todo el cuadro de interfaz menos el panel lateral (248px en desktop / 78px en mobile) y menos el reproductor inferior (90px)
      const sidebarWidth = window.innerWidth <= 980 ? 78 : 248
      host.style.cssText = `
        position: fixed;
        top: 0;
        left: ${sidebarWidth}px;
        right: 0;
        bottom: 90px;
        width: calc(100vw - ${sidebarWidth}px);
        height: calc(100vh - 90px);
        opacity: 1;
        pointer-events: auto;
        z-index: 930;
        overflow: hidden;
        border-radius: 0;
        background: #0b0d0b;
        box-shadow: 0 0 40px rgba(0,0,0,0.85);
        border-left: 1px solid rgba(255,255,255,0.08);
        transition: all 0.22s ease;
      `
    } else {
      // Ventana chiquita flotante arriba a la derecha del reproductor
      host.style.cssText = `
        position: fixed;
        right: 24px;
        bottom: 104px;
        width: 340px;
        height: 234px;
        opacity: 1;
        pointer-events: auto;
        z-index: 940;
        overflow: hidden;
        border-radius: 16px;
        background: #0b0d0b;
        box-shadow: 0 18px 42px rgba(0,0,0,0.8);
        border: 1px solid rgba(255,255,255,0.14);
        transition: all 0.22s ease;
      `
    }
  } else {
    host.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 104px;
      width: 1px;
      height: 1px;
      opacity: 0.01;
      pointer-events: none;
      z-index: 930;
      overflow: hidden;
    `
  }
}

function startYtTimePolling() {
  if (ytTimeInterval) clearInterval(ytTimeInterval)
  ytTimeInterval = setInterval(() => {
    if (activeEngine.value === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      try {
        const state = ytPlayer.getPlayerState?.()
        if (state === 1) {
          const cur = Number(ytPlayer.getCurrentTime()) || 0
          const dur = Number(ytPlayer.getDuration()) || 0
          currentTime.value = cur
          if (dur > 0) {
            duration.value = dur
          }
        }
      } catch {
        // ignore transient iframe state errors
      }
    }
  }, 250)
}

function ensureYoutubePlayer() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  ensureYoutubeContainer()

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    return Promise.resolve(ytPlayer)
  }

  if (ytApiReadyPromise) {
    return ytApiReadyPromise
  }

  ytApiReadyPromise = new Promise(resolve => {
    const createInstance = () => {
      ensureYoutubeContainer()
      ytPlayer = new window.YT.Player('gavify-yt-player-iframe', {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            try {
              ytPlayer.setVolume(Math.round(volume.value * 100))
              if (isMuted.value) ytPlayer.mute()
            } catch {}
            updateYoutubeContainerVisibility()
            startYtTimePolling()
            resolve(ytPlayer)
          },
          onStateChange: event => {
            if (activeEngine.value !== 'youtube') return
            const YTS = window.YT?.PlayerState || { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 }
            if (event.data === YTS.PLAYING) {
              clearStreamWatchdog()
              isPlaying.value = true
              isLoadingStream.value = false
              const dur = Number(ytPlayer.getDuration?.()) || 0
              if (dur > 0) duration.value = dur
            } else if (event.data === YTS.PAUSED) {
              clearStreamWatchdog()
              isPlaying.value = false
            } else if (event.data === YTS.BUFFERING) {
              isLoadingStream.value = true
            } else if (event.data === YTS.ENDED) {
              clearStreamWatchdog()
              handleTrackEnded()
            }
          },
          onError: () => {
            if (activeEngine.value !== 'youtube') {
              // Si estamos en Spotify mostrando video paralelo, probar otro candidato en silencio sin cortar Spotify
              if (showMiniVideo.value && currentCandidateIndex + 1 < currentCandidateIds.length && ytPlayer?.loadVideoById) {
                currentCandidateIndex += 1
                try {
                  ytPlayer.mute()
                  ytPlayer.loadVideoById({
                    videoId: currentCandidateIds[currentCandidateIndex],
                    startSeconds: Math.floor(currentTime.value || 0)
                  })
                } catch {}
              } else if (showMiniVideo.value) {
                const titleEl = document.getElementById('gavify-yt-window-title')
                if (titleEl) titleEl.textContent = 'Video no disponible en YouTube para esta canción'
              }
              return
            }
            tryNextYoutubeCandidateOrSkip(activePlayRequestId)
          }
        }
      })
    }

    if (window.YT && window.YT.Player) {
      createInstance()
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback()
        createInstance()
      }
      if (!document.getElementById('gavify-yt-iframe-script')) {
        const tag = document.createElement('script')
        tag.id = 'gavify-yt-iframe-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }
  })

  return ytApiReadyPromise
}

function fallbackToHtml5Preview() {
  const track = currentTrack.value
  const previewUrl = track?.preview_url || track?.audio_url
  if (previewUrl && !previewUrl.includes('soundhelix.com')) {
    activeEngine.value = 'html5'
    updateYoutubeContainerVisibility()
    const audio = ensureHtml5Audio()
    if (audio) {
      audio.src = previewUrl
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  } else {
    isLoadingStream.value = false
  }
}

function replayCurrentTrack() {
  seekTo(0)
  if (activeEngine.value === 'spotify' && spotifyPlayer) {
    try {
      spotifyPlayer.seek(0)
      spotifyPlayer.resume()
      isPlaying.value = true
    } catch {}
  } else if (activeEngine.value === 'youtube' && ytPlayer) {
    try {
      ytPlayer.seekTo(0, true)
      ytPlayer.playVideo()
      isPlaying.value = true
    } catch {}
  } else if (audioInstance) {
    audioInstance.currentTime = 0
    audioInstance.play().catch(() => {})
    isPlaying.value = true
  }
}

function handleTrackEnded() {
  if (isRepeatOne.value) {
    replayCurrentTrack()
  } else if (isRepeat.value) {
    nextTrack()
  } else if (currentIndex.value < queue.value.length - 1) {
    nextTrack()
  } else {
    isPlaying.value = false
    seekTo(0)
  }
}

async function resolveYoutubeCandidatesForTrack(track) {
  const candidates = []

  if (Array.isArray(track.youtube_candidates)) {
    for (const id of track.youtube_candidates) {
      if (isValidYoutubeId(id) && !candidates.includes(id)) {
        candidates.push(id)
      }
    }
  }

  if (isValidYoutubeId(track.youtube_video_id) && !candidates.includes(track.youtube_video_id)) {
    candidates.push(track.youtube_video_id)
  }

  const query = `${track.artista || ''} ${track.titulo || ''}`.trim()
  const cacheKey = query.toLowerCase()
  const titleKey = String(track.titulo || '').trim().toLowerCase()

  if (candidateMemoryCache.has(cacheKey)) {
    for (const id of candidateMemoryCache.get(cacheKey)) {
      if (!candidates.includes(id)) candidates.push(id)
    }
    if (KNOWN_SONG_CANDIDATES[titleKey]) {
      for (const id of KNOWN_SONG_CANDIDATES[titleKey]) {
        if (!candidates.includes(id)) candidates.push(id)
      }
    }
    return candidates
  }

  if (query) {
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}&mode=lyrics`)
      if (res.ok) {
        const data = await res.json()
        const fetchedIds = (data.items || [])
          .map(item => item.videoId)
          .filter(isValidYoutubeId)

        if (fetchedIds.length > 0) {
          candidateMemoryCache.set(cacheKey, fetchedIds)
          for (const id of fetchedIds) {
            if (!candidates.includes(id)) candidates.push(id)
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch live YouTube candidates:', e)
    }
  }

  if (KNOWN_SONG_CANDIDATES[titleKey]) {
    for (const id of KNOWN_SONG_CANDIDATES[titleKey]) {
      if (!candidates.includes(id)) candidates.push(id)
    }
  }

  return candidates
}

/**
 * Parseador de letras sincronizadas LRC ([mm:ss.xx] texto)
 */
function parseSyncedLyrics(lrcText = '') {
  if (!lrcText) return []
  const lines = lrcText.split('\n')
  const parsed = []
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/
  for (const line of lines) {
    const m = line.match(regex)
    if (m) {
      const mins = Number(m[1]) || 0
      const secs = Number(m[2]) || 0
      const ms = m[3] ? Number(m[3].padEnd(3, '0')) / 1000 : 0
      const text = m[4].trim()
      if (text) {
        parsed.push({
          time: mins * 60 + secs + ms,
          text
        })
      }
    }
  }
  return parsed
}

/**
 * Obtiene la letra real de la canción desde LRCLIB API (y Lyrics.ovh como respaldo)
 */
async function fetchLyricsForTrack(track) {
  if (!track) return
  const cleanTitle = String(track.titulo || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .trim()
  const cleanArtist = String(track.artista || '')
    .split(',')[0]
    .trim()

  const cacheKey = `${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`
  if (lyricsMemoryCache.has(cacheKey)) {
    const cached = lyricsMemoryCache.get(cacheKey)
    plainLyrics.value = cached.plain
    syncedLyrics.value = cached.synced
    return
  }

  isLoadingLyrics.value = true
  plainLyrics.value = ''
  syncedLyrics.value = []

  try {
    // 1. Consulta en LRCLIB API (soporta letras sincronizadas y texto plano)
    const q = encodeURIComponent(`${cleanArtist} ${cleanTitle}`)
    const res = await fetch(`https://lrclib.net/api/search?q=${q}`)
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        const best = items.find(i => i.syncedLyrics || i.plainLyrics) || items[0]
        const plain = best?.plainLyrics || ''
        const synced = parseSyncedLyrics(best?.syncedLyrics || '')
        if (plain || synced.length) {
          plainLyrics.value = plain
          syncedLyrics.value = synced
          lyricsMemoryCache.set(cacheKey, { plain, synced })
          isLoadingLyrics.value = false
          return
        }
      }
    }

    // 2. Respaldo con api.lyrics.ovh
    const ovhRes = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`
    )
    if (ovhRes.ok) {
      const ovhData = await ovhRes.json()
      if (ovhData?.lyrics) {
        plainLyrics.value = ovhData.lyrics.trim()
        syncedLyrics.value = []
        lyricsMemoryCache.set(cacheKey, { plain: plainLyrics.value, synced: [] })
        isLoadingLyrics.value = false
        return
      }
    }
  } catch (e) {
    console.warn('Error obteniendo letras desde API:', e)
  }

  plainLyrics.value = `No se encontraron letras registradas en la API para "${track.titulo}" de ${track.artista}.`
  syncedLyrics.value = []
  isLoadingLyrics.value = false
}

function getTrackKey(track) {
  if (!track) return ''
  return track.id || track.external_id || `${track.titulo}_${track.artista}`
}

function isCustomUploadedAudio(track) {
  const url = String(track?.audio_url || '')
  if (!url || url.includes('soundhelix.com')) return false
  return url.startsWith('data:audio') || url.startsWith('blob:') || Boolean(track?.audio_ruta)
}

async function playTrack(track, trackList = null, options = {}) {
  if (!track) return
  const requestId = ++activePlayRequestId
  const preserveOrder = Boolean(options?.preserveOrder)
  const exactIndex = typeof options?.exactIndex === 'number' ? options.exactIndex : -1

  if (Array.isArray(trackList) && trackList.length > 0 && !preserveOrder) {
    queue.value = trackList.map(item => (item.canciones ? item.canciones : item)).filter(Boolean)
    const key = getTrackKey(track)
    const idx = exactIndex >= 0 && exactIndex < queue.value.length
      ? exactIndex
      : queue.value.findIndex(t => getTrackKey(t) === key)
    currentIndex.value = idx !== -1 ? idx : 0
    if (isShuffle.value) {
      regenerateShuffleOrder()
    }
  } else if (queue.value.length === 0) {
    queue.value = [track]
    currentIndex.value = 0
    if (isShuffle.value) {
      regenerateShuffleOrder()
    }
  } else if (exactIndex >= 0 && exactIndex < queue.value.length) {
    currentIndex.value = exactIndex
  } else {
    const key = getTrackKey(track)
    const existingIdx = queue.value.findIndex(t => getTrackKey(t) === key)
    if (existingIdx !== -1) {
      currentIndex.value = existingIdx
    } else {
      queue.value.push(track)
      currentIndex.value = queue.value.length - 1
      if (isShuffle.value && !preserveOrder) {
        regenerateShuffleOrder()
      }
    }
  }

  currentTrack.value = { ...track }
  needsStreamReloadOnResume = false
  currentTime.value = 0
  duration.value = Number(track.duracion_segundos) || 215
  isLoadingStream.value = true
  savePlayerState()
  recordListeningEvent(track)

  // Cargar letras de la canción automáticamente desde la API de letras
  fetchLyricsForTrack(track)

  const audio = ensureHtml5Audio()
  if (audio) {
    audio.pause()
  }
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    try {
      ytPlayer.stopVideo()
    } catch {}
  }
  if (spotifyPlayer && typeof spotifyPlayer.pause === 'function') {
    try {
      spotifyPlayer.pause()
    } catch {}
  }
  stopSpotifyTimePolling()

  if (isCustomUploadedAudio(track)) {
    activeEngine.value = 'html5'
    updateYoutubeContainerVisibility()
    if (audio) {
      audio.src = track.audio_url
      audio.currentTime = 0
      audio.play().catch(err => {
        console.warn('Error playing uploaded audio:', err)
        isLoadingStream.value = false
      })
    }
    return
  }

  // Si la canción es de Spotify y el usuario tiene sesión Spotify conectada con Premium, reproducir directo desde Spotify
  if ((track.plataforma_origen || '').toLowerCase() === 'spotify') {
    const playedOnSpotify = await playSpotifyTrack(track, requestId)
    if (requestId !== activePlayRequestId) return
    if (playedOnSpotify) return
  }

  activeEngine.value = 'youtube'
  updateYoutubeContainerVisibility()

  const [playerInstance, candidates] = await Promise.all([
    ensureYoutubePlayer(),
    resolveYoutubeCandidatesForTrack(track)
  ])

  if (requestId !== activePlayRequestId) return

  if (playerInstance && candidates.length > 0) {
    currentCandidateIds = candidates
    currentCandidateIndex = 0
    try {
      playerInstance.setVolume(Math.round(volume.value * 100))
      if (isMuted.value) {
        playerInstance.mute()
      } else {
        playerInstance.unMute()
      }
      startStreamWatchdog(requestId)
      playerInstance.loadVideoById(currentCandidateIds[0])
      isPlaying.value = true
      return
    } catch (e) {
      console.warn('YouTube player loadVideoById fallback:', e)
    }
  }

  tryNextYoutubeCandidateOrSkip(requestId)
}

async function togglePlay() {
  if (!currentTrack.value) return
  if (needsStreamReloadOnResume) {
    const resumeAt = Number(currentTime.value) || 0
    const trackToResume = currentTrack.value
    needsStreamReloadOnResume = false
    await playTrack(trackToResume, queue.value)
    if (resumeAt > 2) {
      setTimeout(() => seekTo(resumeAt), 700)
    }
    return
  }
  if (activeEngine.value === 'spotify' && spotifyPlayer) {
    try {
      await spotifyPlayer.togglePlay()
      isPlaying.value = !isPlaying.value
      savePlayerState()
    } catch {}
    return
  }
  if (activeEngine.value === 'youtube' && ytPlayer) {
    const state = ytPlayer.getPlayerState?.()
    if (state === 1) {
      ytPlayer.pauseVideo()
      isPlaying.value = false
      savePlayerState()
    } else {
      ytPlayer.playVideo()
      isPlaying.value = true
    }
    return
  }

  const audio = ensureHtml5Audio()
  if (!audio) return
  if (audio.paused) {
    audio.play().catch(() => {})
  } else {
    audio.pause()
    savePlayerState()
  }
}

function nextTrack() {
  if (!queue.value.length) return
  let nextIdx = 0
  if (isShuffle.value && queue.value.length > 1) {
    if (!shuffleOrder.value.length || shuffleOrder.value.length !== queue.value.length) {
      regenerateShuffleOrder()
    }
    const currentPos = shuffleOrder.value.indexOf(currentIndex.value)
    if (currentPos !== -1 && currentPos + 1 < shuffleOrder.value.length) {
      nextIdx = shuffleOrder.value[currentPos + 1]
    } else {
      // Fin del orden aleatorio
      if (isRepeat.value) {
        regenerateShuffleOrder()
        nextIdx = shuffleOrder.value[0] !== currentIndex.value ? shuffleOrder.value[0] : (shuffleOrder.value[1] || 0)
      } else {
        isPlaying.value = false
        seekTo(0)
        return
      }
    }
  } else {
    nextIdx = (currentIndex.value + 1) % queue.value.length
  }
  currentIndex.value = nextIdx
  playTrack(queue.value[nextIdx], null, { preserveOrder: true, exactIndex: nextIdx })
}

function prevTrack() {
  if (currentTime.value > 3) {
    seekTo(0)
    return
  }
  if (!queue.value.length) return
  let prevIdx = 0
  if (isShuffle.value && queue.value.length > 1 && shuffleOrder.value.length === queue.value.length) {
    const currentPos = shuffleOrder.value.indexOf(currentIndex.value)
    if (currentPos > 0) {
      prevIdx = shuffleOrder.value[currentPos - 1]
    } else {
      prevIdx = shuffleOrder.value[shuffleOrder.value.length - 1]
    }
  } else {
    prevIdx = (currentIndex.value - 1 + queue.value.length) % queue.value.length
  }
  currentIndex.value = prevIdx
  playTrack(queue.value[prevIdx], null, { preserveOrder: true, exactIndex: prevIdx })
}

function playTrackAt(index) {
  if (!queue.value.length) return
  if (index < 0 || index >= queue.value.length) return
  currentIndex.value = index
  playTrack(queue.value[index], null, { preserveOrder: true, exactIndex: index })
}

function seekTo(seconds) {
  if (!currentTrack.value) return
  const target = Math.max(0, Math.min(Number(seconds) || 0, duration.value || 360))
  currentTime.value = target

  if (activeEngine.value === 'spotify' && spotifyPlayer && typeof spotifyPlayer.seek === 'function') {
    try {
      spotifyPlayer.seek(Math.round(target * 1000))
    } catch {}
    return
  }

  if (activeEngine.value === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
    try {
      ytPlayer.seekTo(target, true)
    } catch {}
    return
  }

  const audio = ensureHtml5Audio()
  if (audio) {
    audio.currentTime = target
  }
}

function setVolume(val) {
  const v = Math.max(0, Math.min(1, Number(val)))
  volume.value = v
  isMuted.value = v === 0

  if (spotifyPlayer && typeof spotifyPlayer.setVolume === 'function') {
    try {
      spotifyPlayer.setVolume(v)
    } catch {}
  }

  if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
    try {
      ytPlayer.setVolume(Math.round(v * 100))
      if (v === 0) ytPlayer.mute()
      else ytPlayer.unMute()
    } catch {}
  }

  const audio = ensureHtml5Audio()
  if (audio) {
    audio.volume = v
    audio.muted = v === 0
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (spotifyPlayer && typeof spotifyPlayer.setVolume === 'function') {
    try {
      spotifyPlayer.setVolume(isMuted.value ? 0 : volume.value)
    } catch {}
  }
  if (ytPlayer) {
    try {
      if (isMuted.value) ytPlayer.mute()
      else ytPlayer.unMute()
    } catch {}
  }
  const audio = ensureHtml5Audio()
  if (audio) {
    audio.muted = isMuted.value
  }
}

function regenerateShuffleOrder() {
  const n = queue.value.length
  if (n <= 1) {
    shuffleOrder.value = n === 1 ? [0] : []
    return
  }
  const cur = currentIndex.value
  const indices = []
  for (let i = 0; i < n; i++) {
    if (i !== cur) indices.push(i)
  }
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  shuffleOrder.value = cur >= 0 ? [cur, ...indices] : indices
}

function toggleShuffle() {
  isShuffle.value = !isShuffle.value
  if (isShuffle.value) {
    regenerateShuffleOrder()
  }
  savePlayerState()
}

function toggleRepeat() {
  if (!isRepeat.value && !isRepeatOne.value) {
    // Apagado -> Repetir lista completa
    isRepeat.value = true
    isRepeatOne.value = false
  } else if (isRepeat.value && !isRepeatOne.value) {
    // Repetir lista -> Repetir 1 canción (el mismo tema)
    isRepeat.value = false
    isRepeatOne.value = true
  } else {
    // Repetir 1 -> Apagado
    isRepeat.value = false
    isRepeatOne.value = false
  }
  savePlayerState()
}

function toggleRepeatOne() {
  isRepeatOne.value = !isRepeatOne.value
  if (isRepeatOne.value) {
    isRepeat.value = false
  }
  savePlayerState()
}

function toggleQueue() {
  showQueue.value = !showQueue.value
}

function toggleExpandQueue() {
  isQueueExpanded.value = !isQueueExpanded.value
}

async function loadVideoPreviewForCurrentTrack() {
  const track = currentTrack.value
  if (!track || !showMiniVideo.value) return
  const titleEl = document.getElementById('gavify-yt-window-title')
  if (titleEl) titleEl.textContent = `Buscando video para "${track.titulo}"...`

  const [playerInstance, candidates] = await Promise.all([
    ensureYoutubePlayer(),
    resolveYoutubeCandidatesForTrack(track)
  ])
  if (!showMiniVideo.value || currentTrack.value?.titulo !== track.titulo) return

  if (playerInstance && candidates.length > 0) {
    currentCandidateIds = candidates
    currentCandidateIndex = 0
    try {
      playerInstance.mute()
      playerInstance.loadVideoById({
        videoId: candidates[0],
        startSeconds: Math.floor(currentTime.value || 0)
      })
      if (!isPlaying.value) {
        setTimeout(() => {
          try {
            if (!isPlaying.value) playerInstance.pauseVideo()
          } catch {}
        }, 400)
      }
      if (titleEl) titleEl.textContent = `${track.titulo} — ${track.artista} (Video disponible)`
      return
    } catch {}
  }

  if (titleEl) titleEl.textContent = `Video no disponible en YouTube para "${track.titulo}"`
}

function toggleMiniVideo() {
  showMiniVideo.value = !showMiniVideo.value
  if (showMiniVideo.value) {
    // Al abrir el video siempre arranca en la ventana chiquita
    isVideoExpanded.value = false
    if (isLyricsExpanded.value) {
      showLyrics.value = false
    }
    if (activeEngine.value !== 'youtube') {
      loadVideoPreviewForCurrentTrack()
    }
  } else if (activeEngine.value !== 'youtube' && ytPlayer?.pauseVideo) {
    try {
      ytPlayer.pauseVideo()
    } catch {}
  }
  updateYoutubeContainerVisibility()
}

function toggleExpandVideo() {
  isVideoExpanded.value = !isVideoExpanded.value
  if (isVideoExpanded.value) {
    showLyrics.value = false
  }
  updateYoutubeContainerVisibility()
}

function toggleLyrics() {
  showLyrics.value = !showLyrics.value
  if (showLyrics.value && isVideoExpanded.value) {
    isVideoExpanded.value = false
    updateYoutubeContainerVisibility()
  }
  if (showLyrics.value && currentTrack.value && !plainLyrics.value && !isLoadingLyrics.value) {
    fetchLyricsForTrack(currentTrack.value)
  }
}

function toggleExpandLyrics() {
  isLyricsExpanded.value = !isLyricsExpanded.value
}

function isTrackSaved(track) {
  const key = getTrackKey(track)
  return key ? savedTrackIds.value.includes(key) : false
}

function toggleSaveTrack(track = currentTrack.value, onSaveCallback = null) {
  if (!track) return
  const key = getTrackKey(track)
  if (!key) return
  const idx = savedTrackIds.value.indexOf(key)
  if (idx !== -1) {
    savedTrackIds.value.splice(idx, 1)
    isCurrentSaved.value = false
    saveFeedback.value = 'Quitada de tus canciones guardadas'
  } else {
    savedTrackIds.value.push(key)
    isCurrentSaved.value = true
    saveFeedback.value = 'Guardada en tu biblioteca'
    if (typeof onSaveCallback === 'function') {
      onSaveCallback(track)
    }
  }
  localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedTrackIds.value))
  setTimeout(() => {
    saveFeedback.value = ''
  }, 2400)
}

function stopAllPlayback() {
  clearStreamWatchdog()
  stopSpotifyTimePolling()
  if (spotifyPlayer && typeof spotifyPlayer.pause === 'function') {
    try {
      spotifyPlayer.pause()
    } catch {}
  }
  const audio = ensureHtml5Audio()
  if (audio) {
    audio.pause()
    audio.src = ''
  }
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    try {
      ytPlayer.stopVideo()
    } catch {}
  }
  isPlaying.value = false
  isLoadingStream.value = false
  currentTime.value = 0
  duration.value = 0
}

function removeCurrentTrack() {
  stopAllPlayback()
  if (queue.value.length > 1 && currentIndex.value !== -1) {
    queue.value.splice(currentIndex.value, 1)
    if (currentIndex.value >= queue.value.length) {
      currentIndex.value = 0
    }
    playTrack(queue.value[currentIndex.value])
  } else {
    queue.value = []
    currentIndex.value = -1
    currentTrack.value = null
    needsStreamReloadOnResume = false
    clearSavedPlayerState()
    showMiniVideo.value = false
    isVideoExpanded.value = false
    showLyrics.value = false
    updateYoutubeContainerVisibility()
  }
}

function closePlayer() {
  stopAllPlayback()
  currentTrack.value = null
  queue.value = []
  currentIndex.value = -1
  needsStreamReloadOnResume = false
  clearSavedPlayerState()
  showMiniVideo.value = false
  isVideoExpanded.value = false
  showLyrics.value = false
  updateYoutubeContainerVisibility()
}

const isCurrentSaved = ref(false)

export function usePlayer() {
  return {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isLoadingStream,
    isShuffle,
    shuffleOrder,
    regenerateShuffleOrder,
    isRepeat,
    isRepeatOne,
    showQueue,
    isQueueExpanded,
    volume,
    isMuted,
    currentTime,
    duration,
    isCurrentSaved,
    saveFeedback,
    showMiniVideo,
    isVideoExpanded,
    showLyrics,
    isLyricsExpanded,
    isLoadingLyrics,
    plainLyrics,
    syncedLyrics,
    playTrack,
    playTrackAt,
    replayCurrentTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleRepeatOne,
    toggleQueue,
    toggleExpandQueue,
    toggleMiniVideo,
    toggleExpandVideo,
    toggleLyrics,
    toggleExpandLyrics,
    isTrackSaved,
    toggleSaveTrack,
    removeCurrentTrack,
    closePlayer,
    listeningHistory,
    refreshListeningHistoryForCurrentUser
  }
}
