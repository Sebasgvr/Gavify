<template>
  <main class="connect connect-embedded">
    <section class="connect-content connect-wide">
      <div class="connect-head-centered">
        <h1>Conectar Spotify y YouTube</h1>
        <p class="connect-lead">
          Vincula tus cuentas para importar tus playlists y escuchar sin límites.
        </p>
      </div>

      <!-- Feedback Messages -->
      <div v-if="mensajeExito" class="connect-alert success">
        <AppIcon name="check" :size="16" /> {{ mensajeExito }}
      </div>
      <div v-if="mensajeError" class="connect-alert error">
        <AppIcon name="alert" :size="16" /> {{ mensajeError }}
      </div>

      <!-- Tarjetas de las 3 Apps con Iconos Oficiales -->
      <div class="platforms-grid">
        <!-- 1. SPOTIFY -->
        <div class="platform-card" :class="{ connected: isSpotifyConnected }">
          <div class="platform-top">
            <div class="platform-brand-badge">
              <AppIcon name="spotify" :size="20" />
              <span class="platform-badge spotify-badge">App Spotify</span>
            </div>
            <span class="conn-status" :class="{ active: isSpotifyConnected }">
              {{ isSpotifyConnected ? '● Cuenta vinculada' : '○ Sin vincular' }}
            </span>
          </div>
          <div class="platform-header-row">
            <AppIcon name="spotify" :size="32" />
            <div>
              <h3>Spotify</h3>
              <small v-if="isSpotifyConnected" class="user-handle">
                {{ getUsernameHandle('spotify') }}
              </small>
            </div>
          </div>
          <p>Vincula tu cuenta de Spotify para extraer tus playlists personales, favoritos y mezclas guardadas.</p>

          <div class="platform-actions">
            <button
              v-if="!isSpotifyConnected"
              class="btn-platform btn-spotify btn-icon-flex"
              :disabled="cargando === 'spotify'"
              @click="iniciarOAuthSpotify"
            >
              <AppIcon name="spotify" :size="16" />
              <span>Conectar con mi cuenta de Spotify</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-spotify btn-icon-flex"
                :disabled="cargando === 'spotify'"
                @click="cargarMisPlaylistsSpotify"
              >
                <AppIcon name="bolt" :size="14" />
                <span>Cargar mis playlists de Spotify</span>
              </button>
              <div class="connected-sub-actions">
                <button class="btn-relink" @click="iniciarOAuthSpotify">
                  Re-conectar Spotify
                </button>
                <button class="btn-disconnect" @click="desconectarPlataforma('spotify')">
                  Desvincular
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 2. YOUTUBE MUSIC & YOUTUBE (CUENTA GOOGLE UNIFICADA) -->
        <div class="platform-card" :class="{ connected: isYtMusicConnected || isYoutubeConnected }">
          <div class="platform-top">
            <div class="platform-brand-badge">
              <AppIcon name="youtube_music" :size="20" />
              <AppIcon name="youtube" :size="20" />
              <span class="platform-badge ytmusic-badge">YT Music &amp; YouTube</span>
            </div>
            <span class="conn-status" :class="{ active: isYtMusicConnected || isYoutubeConnected }">
              {{ isYtMusicConnected || isYoutubeConnected ? '● Cuenta vinculada' : '○ Sin vincular' }}
            </span>
          </div>
          <div class="platform-header-row">
            <div style="display:flex;align-items:center;gap:6px;">
              <AppIcon name="youtube_music" :size="30" />
              <AppIcon name="youtube" :size="30" />
            </div>
            <div>
              <h3>YouTube Music y YouTube</h3>
              <small v-if="isYtMusicConnected || isYoutubeConnected" class="user-handle">
                {{ getUsernameHandle('youtube_music') || getUsernameHandle('youtube') }}
              </small>
            </div>
          </div>
          <p>Conecta una sola vez tu cuenta de Google para importar tus listas de YouTube Music y YouTube.</p>

          <div class="platform-actions">
            <button
              v-if="!isYtMusicConnected && !isYoutubeConnected"
              class="btn-platform btn-ytmusic btn-icon-flex"
              :disabled="cargando === 'youtube_music' || cargando === 'youtube'"
              @click="iniciarOAuthGoogle('youtube_music')"
            >
              <AppIcon name="youtube_music" :size="16" />
              <span>{{ cargando === 'youtube_music' ? 'Conectando...' : 'Conectar con Google (YT Music / YouTube)' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-ytmusic btn-icon-flex"
                :disabled="cargando === 'youtube_music'"
                @click="cargarMisPlaylistsYoutube('youtube_music')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>Cargar mis playlists de YouTube / YT Music</span>
              </button>
              <div class="connected-sub-actions">
                <button class="btn-relink" @click="iniciarOAuthGoogle('youtube_music')">
                  Cambiar cuenta
                </button>
                <button class="btn-disconnect" @click="desconectarGoogle">
                  Desvincular
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Extractor Directo de Playlists Públicas por Enlace + Listas Reales Sincronizadas -->
      <div class="account-playlists-preview">
        <!-- Barra para pegar enlace público de playlist de Spotify, YT Music o YouTube -->
        <div class="url-extractor-box">
          <div class="url-extractor-head">
            <span class="tiny accent">IMPORTAR PLAYLISTS PÚBLICAS</span>
            <h4>Importa cualquier playlist pública de Spotify, YouTube Music o YouTube por enlace</h4>
          </div>
          <div class="url-extractor-row">
            <div class="url-input-wrap">
              <input
                v-model="urlPlaylistInput"
                type="url"
                placeholder="Ej: https://open.spotify.com/playlist/... o https://music.youtube.com/playlist?list=..."
                class="url-input"
                @keyup.enter="extraerPorEnlace"
              />
              <button
                v-if="urlPlaylistInput"
                type="button"
                class="input-clear-x"
                title="Borrar"
                @click="urlPlaylistInput = ''"
              >
                <AppIcon name="close" :size="13" />
              </button>
            </div>
            <button
              class="primary btn-sm btn-icon-flex"
              :disabled="!urlPlaylistInput.trim() || extrayendoUrl"
              @click="extraerPorEnlace"
            >
              <AppIcon name="bolt" :size="14" />
              <span>{{ extrayendoUrl ? 'Extrayendo canciones...' : 'Extraer playlist' }}</span>
            </button>
          </div>
        </div>

        <!-- Playlists reales obtenidas directamente desde la cuenta de Spotify conectada -->
        <template v-if="misPlaylistsSpotify.length">
          <div class="preview-divider"></div>
          <div class="preview-header">
            <div>
              <span class="tiny accent">CUENTA DE SPOTIFY CONECTADA</span>
              <h3>Tus playlists en Spotify ({{ misPlaylistsSpotify.length }})</h3>
            </div>
          </div>
          <div class="playlists-cards-grid">
            <div
              v-for="pl in misPlaylistsSpotify"
              :key="pl.id"
              class="pl-detect-card"
            >
              <img
                v-if="pl.portada_url"
                :src="pl.portada_url"
                :alt="pl.nombre"
                class="pl-detect-cover"
              />
              <div v-else class="pl-detect-cover pl-cover-empty">
                <AppIcon name="spotify" :size="20" />
              </div>
              <div class="pl-detect-info">
                <div class="pl-plat-line">
                  <AppIcon name="spotify" :size="14" />
                  <span class="tiny">SPOTIFY</span>
                </div>
                <h4>{{ pl.nombre }}</h4>
                <p>{{ pl.descripcion || 'Playlist de tu cuenta de Spotify' }}</p>
                <small>{{ pl.total > 0 ? `${pl.total} canciones reales` : 'Lista de tu cuenta Spotify' }}</small>
              </div>
              <button
                class="btn-extract-one"
                :disabled="extrayendoUrl"
                @click="extraerPlaylistSpotifyDirecta(pl.url)"
              >
                <AppIcon name="plus" :size="14" />
                <span>Extraer</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Playlists detectadas directamente desde la cuenta real de Google / YouTube Music -->
        <template v-if="misPlaylistsYoutube.length">
          <div class="preview-divider"></div>
          <div class="preview-header">
            <div>
              <span class="tiny accent">CUENTA DE GOOGLE / YOUTUBE CONECTADA</span>
              <h3>Tus playlists en YouTube Music y YouTube ({{ misPlaylistsYoutube.length }})</h3>
            </div>
          </div>
          <div class="playlists-cards-grid">
            <div
              v-for="pl in misPlaylistsYoutube"
              :key="pl.id"
              class="pl-detect-card"
            >
              <img
                v-if="pl.portada"
                :src="pl.portada"
                :alt="pl.nombre"
                class="pl-detect-cover"
              />
              <div v-else class="pl-detect-cover pl-cover-empty">
                <AppIcon name="youtube_music" :size="20" />
              </div>
              <div class="pl-detect-info">
                <div class="pl-plat-line">
                  <AppIcon name="youtube_music" :size="14" />
                  <span class="tiny">YT MUSIC / YOUTUBE</span>
                </div>
                <h4>{{ pl.nombre }}</h4>
                <p>Playlist de tu cuenta de Google</p>
                <small>{{ pl.total > 0 ? `${pl.total} canciones reales` : 'Lista de tu cuenta Google' }}</small>
              </div>
              <button
                class="btn-extract-one"
                :disabled="extrayendoUrl"
                @click="extraerPlaylistYoutubeDirecta(pl)"
              >
                <AppIcon name="plus" :size="14" />
                <span>Extraer</span>
              </button>
            </div>
          </div>
        </template>

        <div class="preview-divider"></div>

        <div class="preview-header">
          <div>
            <span class="tiny accent">TUS PLAYLISTS REALES SINCRONIZADAS</span>
            <h3>Playlists extraídas en tu cuenta ({{ playlistsReales.length }})</h3>
          </div>
        </div>

        <div v-if="!playlistsReales.length" class="empty-real-playlists">
          <p>Todavía no extrajiste ninguna playlist real. Pega el enlace público de una playlist de Spotify, YouTube Music o YouTube arriba para importarla con todas sus canciones reales.</p>
        </div>

        <div v-else class="playlists-cards-grid">
          <div
            v-for="pl in playlistsReales"
            :key="pl.id"
            class="pl-detect-card"
          >
            <img
              v-if="pl.portada_url"
              :src="pl.portada_url"
              :alt="pl.nombre"
              class="pl-detect-cover"
            />
            <div v-else class="pl-detect-cover pl-cover-empty">
              <AppIcon name="music" :size="20" />
            </div>
            <div class="pl-detect-info">
              <div class="pl-plat-line">
                <AppIcon :name="pl.plataforma_origen" :size="14" />
                <span class="tiny">{{ pl.plataforma_origen === 'youtube_music' ? 'YT Music' : (pl.plataforma_origen || 'Gavify').toUpperCase() }}</span>
              </div>
              <h4>{{ pl.nombre }}</h4>
              <p>{{ pl.descripcion || 'Playlist sincronizada' }}</p>
              <small>{{ pl.total_canciones || 0 }} {{ pl.total_canciones === 1 ? 'canción' : 'canciones' }}</small>
            </div>
            <button
              class="btn-extract-one done"
              @click="router.push({ path: '/playlists', query: { id: pl.id } })"
            >
              <span>Abrir</span>
            </button>
          </div>
        </div>
      </div>

      <div class="connect-bottom-btns">
        <button class="primary" @click="router.push('/playlists')">
          Ver mis Playlists
        </button>
        <button class="outline" @click="irAlDashboard">
          Ir al Resumen
        </button>
        <button class="outline" @click="irAGestorMusica">
          Abrir Explorador Musical
        </button>
      </div>

      <small class="privacy">
        Las playlists extraídas pertenecen exclusivamente a tu cuenta ({{ auth.currentUser.value?.nombre }}).
      </small>
    </section>

    <!-- MODAL INTERACTIVO PARA VINCULAR CUENTA REAL -->
    <div v-if="modalPlataforma" class="modal-backdrop" @click.self="modalPlataforma = null">
      <div class="link-modal">
        <div class="link-modal-head">
          <div class="link-modal-title-row">
            <AppIcon :name="modalPlataforma" :size="28" />
            <div>
              <span class="tiny accent">VINCULAR APP EXTERNA</span>
              <h3>Conectar cuenta de {{ nombrePlataformaModal }}</h3>
            </div>
          </div>
          <button class="modal-close-x" @click="modalPlataforma = null">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <p class="link-modal-desc">
          Ingresa tu usuario o correo de <strong>{{ nombrePlataformaModal }}</strong> para autorizar la lectura de tus playlists en Gavify.
        </p>

        <div class="link-modal-form">
          <div class="field-group">
            <label>Usuario, correo o @handle de {{ nombrePlataformaModal }} *</label>
            <input
              v-model="formLink.handle"
              type="text"
              :placeholder="placeholderHandleModal"
              @keyup.enter="confirmarVinculacionCuenta"
            />
          </div>

          <div class="field-group">
            <label>Enlace de una playlist tuya para extraer ahora (Opcional)</label>
            <input
              v-model="formLink.playlistUrl"
              type="url"
              :placeholder="placeholderUrlModal"
            />
            <small class="field-hint">
              Si pegas aquí el enlace público de una playlist de {{ nombrePlataformaModal }}, Gavify importará todas sus canciones automáticamente al vincular.
            </small>
          </div>

          <div v-if="errorModal" class="connect-alert error" style="margin-bottom: 10px;">
            <AppIcon name="alert" :size="15" /> {{ errorModal }}
          </div>

          <div class="link-modal-btns">
            <button
              class="btn-platform btn-icon-flex"
              :class="claseBotonModal"
              :disabled="!formLink.handle.trim() || cargando === modalPlataforma"
              @click="confirmarVinculacionCuenta"
            >
              <AppIcon :name="modalPlataforma" :size="16" />
              <span>
                {{
                  cargando === modalPlataforma
                    ? 'Vinculando cuenta...'
                    : `Autorizar y vincular ${nombrePlataformaModal}`
                }}
              </span>
            </button>
            <button class="outline" @click="modalPlataforma = null">Cancelar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PANTALLA DE CARGA CON DISCO DE VINILO GIRANDO -->
    <div v-if="cargando || extrayendoUrl" class="vinyl-loading-screen">
      <div class="vinyl-loading-card">
        <div class="loading-vinyl-disc">
          <span class="loading-vinyl-label">G</span>
        </div>
        <h3>{{ extrayendoUrl ? 'Extrayendo canciones de tu playlist...' : 'Conectando tu cuenta...' }}</h3>
        <p>Por favor espera unos segundos mientras sincronizamos tus pistas reales.</p>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/services/auth'
import { musicApiService, getExternalApiConfig, saveExternalApiConfig } from '@/services/musicApis'
import { dbService } from '@/services/db'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const cargando = ref('')
const extrayendoUrl = ref(false)
const urlPlaylistInput = ref('')
const playlistsReales = ref([])
const misPlaylistsSpotify = ref([])
const misPlaylistsYoutube = ref([])
const mensajeExito = ref('')
const mensajeError = ref('')

async function cargarPlaylistsReales() {
  try {
    const todas = await dbService.getPlaylists()
    playlistsReales.value = todas.filter(
      p => p.tipo !== 'favoritos' && (p.nombre || '').toLowerCase() !== 'tus me gusta'
    )
  } catch {
    playlistsReales.value = []
  }
}

async function iniciarOAuthSpotify() {
  mensajeExito.value = ''
  mensajeError.value = ''
  cargando.value = 'spotify'
  try {
    await musicApiService.startSpotifyPkceAuth()
  } catch (err) {
    cargando.value = ''
    mensajeError.value = err.message
  }
}

async function cargarMisPlaylistsSpotify() {
  mensajeExito.value = ''
  mensajeError.value = ''
  cargando.value = 'spotify'
  try {
    const listas = await musicApiService.fetchMySpotifyPlaylists()
    if (!listas.length) {
      // Si el token expiró o aún no inició OAuth real, pedir autorización
      await iniciarOAuthSpotify()
      return
    }
    misPlaylistsSpotify.value = listas
    mensajeExito.value = `✓ Se cargaron ${listas.length} playlists reales de tu cuenta de Spotify.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    cargando.value = ''
  }
}

async function extraerPlaylistSpotifyDirecta(playlistUrl) {
  urlPlaylistInput.value = playlistUrl
  await extraerPorEnlace()
}

async function iniciarOAuthGoogle(platform = 'youtube_music') {
  mensajeExito.value = ''
  mensajeError.value = ''
  cargando.value = platform
  try {
    await musicApiService.startGoogleYoutubeAuth(platform)
  } catch (err) {
    cargando.value = ''
    mensajeError.value = err.message
  }
}

async function desconectarGoogle() {
  await desconectarPlataforma('youtube_music')
  await desconectarPlataforma('youtube')
  misPlaylistsYoutube.value = []
}

async function cargarMisPlaylistsYoutube(platform = 'youtube_music') {
  mensajeExito.value = ''
  mensajeError.value = ''
  cargando.value = platform
  try {
    const listas = await musicApiService.fetchMyYoutubePlaylists()
    if (!listas.length) {
      await iniciarOAuthGoogle(platform)
      return
    }
    misPlaylistsYoutube.value = listas
    mensajeExito.value = `✓ Se cargaron ${listas.length} playlists reales de tu cuenta de Google / YouTube.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    cargando.value = ''
  }
}

async function extraerPlaylistYoutubeDirecta(playlistMeta) {
  mensajeError.value = ''
  mensajeExito.value = ''
  extrayendoUrl.value = true
  try {
    const extracted = await musicApiService.extractYoutubePlaylistWithToken(
      playlistMeta,
      isYtMusicConnected.value ? 'youtube_music' : 'youtube'
    )
    const saved = await dbService.extractPlaylistFromApi(extracted)
    await cargarPlaylistsReales()
    window.dispatchEvent(new CustomEvent('gavify:library-updated'))
    const summary = saved?._syncSummary
    if (summary && summary.existed) {
      mensajeExito.value =
        summary.addedCount > 0
          ? `✓ Playlist "${extracted.nombre}" actualizada: se agregaron ${summary.addedCount} canciones nuevas y se mantuvieron ${summary.skippedCount} que ya tenías.`
          : `✓ Playlist "${extracted.nombre}" ya estaba al día (${summary.totalCount} canciones sin duplicados).`
    } else {
      mensajeExito.value = `✓ Playlist "${extracted.nombre}" extraída con ${extracted.canciones.length} canciones reales.`
    }
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendoUrl.value = false
  }
}

onMounted(async () => {
  await cargarPlaylistsReales()

  // 1. Detectar callback OAuth de Google / YouTube Music (#access_token=...)
  const rawHash = window.location.hash || ''
  if (rawHash.includes('access_token=') || rawHash.includes('error=')) {
    const hashParams = new URLSearchParams(rawHash.replace(/^#/, ''))
    const hashError = hashParams.get('error')
    if (hashError) {
      mensajeError.value = 'Autorización de Google / YouTube Music cancelada o denegada.'
      router.replace('/connect')
      return
    }
    if (hashParams.get('access_token')) {
      const state = hashParams.get('state') || 'google:youtube_music'
      const platform = state.startsWith('google:') ? state.slice(7) : 'youtube_music'
      cargando.value = platform
      try {
        const { profile } = await musicApiService.completeGoogleYoutubeCallback(rawHash)
        const handle = profile.email || profile.displayName || 'Cuenta Google'
        await auth.connectPlatform('youtube_music', profile.id, { handle })
        await auth.connectPlatform('youtube', profile.id, { handle })
        const listas = await musicApiService.fetchMyYoutubePlaylists()
        misPlaylistsYoutube.value = listas
        mensajeExito.value = `¡Cuenta real de Google / YouTube Music (${profile.displayName}) conectada! Se detectaron ${listas.length} playlists listas para extraer.`
      } catch (err) {
        mensajeError.value = err.message
      } finally {
        cargando.value = ''
        router.replace('/connect')
      }
      return
    }
  }

  // 2. Detectar callback OAuth PKCE de Spotify (?code=...)
  const oauthCode = typeof route.query.code === 'string' ? route.query.code : ''
  const oauthError = typeof route.query.error === 'string' ? route.query.error : ''

  if (oauthError) {
    mensajeError.value = 'Autorización de Spotify cancelada o denegada.'
    router.replace('/connect')
    return
  }

  if (oauthCode) {
    cargando.value = 'spotify'
    try {
      const { profile } = await musicApiService.completeSpotifyPkceCallback(oauthCode)
      await auth.connectPlatform('spotify', profile.id, {
        handle: profile.displayName || profile.email || 'Cuenta Spotify'
      })
      const listas = await musicApiService.fetchMySpotifyPlaylists()
      misPlaylistsSpotify.value = listas
      mensajeExito.value = `¡Cuenta real de Spotify (${profile.displayName}) conectada! Se detectaron ${listas.length} playlists listas para extraer sin límite de canciones.`
    } catch (err) {
      mensajeError.value = err.message
    } finally {
      cargando.value = ''
      router.replace('/connect')
    }
    return
  }

  if (isSpotifyConnected.value && getExternalApiConfig().spotifyAccessToken) {
    misPlaylistsSpotify.value = await musicApiService.fetchMySpotifyPlaylists()
  }
  if ((isYtMusicConnected.value || isYoutubeConnected.value) && getExternalApiConfig().youtubeAccessToken) {
    misPlaylistsYoutube.value = await musicApiService.fetchMyYoutubePlaylists()
  }
})

// Modal de vinculación
const modalPlataforma = ref(null)
const errorModal = ref('')
const formLink = ref({
  handle: '',
  playlistUrl: ''
})

const isSpotifyConnected = computed(() => auth.currentUser.value?.spotifyConnected ?? false)
const isYtMusicConnected = computed(() => auth.currentUser.value?.ytMusicConnected ?? false)
const isYoutubeConnected = computed(() => auth.currentUser.value?.youtubeConnected ?? false)

const hasAnyConnected = computed(() => {
  return isSpotifyConnected.value || isYtMusicConnected.value || isYoutubeConnected.value
})

const nombrePlataformaModal = computed(() => {
  if (modalPlataforma.value === 'spotify') return 'Spotify'
  if (modalPlataforma.value === 'youtube_music') return 'YouTube Music'
  if (modalPlataforma.value === 'youtube') return 'YouTube'
  return ''
})

const placeholderHandleModal = computed(() => {
  const email = auth.currentUser.value?.email || 'tu_usuario@correo.com'
  if (modalPlataforma.value === 'spotify') return `Ej: @seba_music o ${email}`
  if (modalPlataforma.value === 'youtube_music') return `Ej: ${email} o @canal_ytm`
  return `Ej: @tu_canal_youtube o ${email}`
})

const placeholderUrlModal = computed(() => {
  if (modalPlataforma.value === 'spotify') return 'https://open.spotify.com/playlist/...'
  if (modalPlataforma.value === 'youtube_music') return 'https://music.youtube.com/playlist?list=...'
  return 'https://www.youtube.com/playlist?list=...'
})

const claseBotonModal = computed(() => {
  if (modalPlataforma.value === 'spotify') return 'btn-spotify'
  if (modalPlataforma.value === 'youtube_music') return 'btn-ytmusic'
  return 'btn-youtube'
})

function getUsernameHandle(platform) {
  const u = auth.currentUser.value
  if (!u) return ''
  if (platform === 'spotify' && u.spotifyHandle) return u.spotifyHandle
  if (platform === 'youtube_music' && u.ytMusicHandle) return u.ytMusicHandle
  if (platform === 'youtube' && u.youtubeHandle) return u.youtubeHandle
  const clean = (u.nombre || 'usuario').toLowerCase().replace(/\s+/g, '_')
  return `@${clean}_${platform === 'youtube_music' ? 'ytmusic' : platform}`
}

const playlistsDetectadas = computed(() => {
  const list = []
  if (isSpotifyConnected.value) {
    const cat = musicApiService.getSyncedCatalogByPlatform('spotify')
    if (cat?.playlists) list.push(...cat.playlists)
  }
  if (isYtMusicConnected.value) {
    const cat = musicApiService.getSyncedCatalogByPlatform('youtube_music')
    if (cat?.playlists) list.push(...cat.playlists)
  }
  if (isYoutubeConnected.value) {
    const cat = musicApiService.getSyncedCatalogByPlatform('youtube')
    if (cat?.playlists) list.push(...cat.playlists)
  }
  return list
})

function goBack() {
  router.push('/dashboard')
}

function abrirModalVincular(platform) {
  errorModal.value = ''
  const handleActual =
    platform === 'spotify'
      ? auth.currentUser.value?.spotifyHandle
      : platform === 'youtube_music'
        ? auth.currentUser.value?.ytMusicHandle
        : auth.currentUser.value?.youtubeHandle

  formLink.value = {
    handle: handleActual || auth.currentUser.value?.email || `@${(auth.currentUser.value?.nombre || 'usuario').toLowerCase().replace(/\s+/g, '_')}`,
    playlistUrl: '',
    spotifyToken: platform === 'spotify' ? getExternalApiConfig().spotifyAccessToken || '' : ''
  }
  modalPlataforma.value = platform
}

async function confirmarVinculacionCuenta() {
  const platform = modalPlataforma.value
  if (!platform) return
  if (!formLink.value.handle.trim()) {
    errorModal.value = 'Ingresa tu usuario, @handle o correo para vincular la cuenta.'
    return
  }

  mensajeExito.value = ''
  mensajeError.value = ''
  errorModal.value = ''
  cargando.value = platform

  try {
    if (platform === 'spotify' && formLink.value.spotifyToken?.trim()) {
      const cfg = getExternalApiConfig()
      saveExternalApiConfig({ ...cfg, spotifyAccessToken: formLink.value.spotifyToken.trim() })
    }

    await auth.connectPlatform(platform, null, {
      handle: formLink.value.handle.trim(),
      playlistUrl: formLink.value.playlistUrl.trim()
    })

    let extraMsg = ''
    if (formLink.value.playlistUrl.trim()) {
      const playlistExtraida = await musicApiService.extractPlaylistByUrl(formLink.value.playlistUrl.trim())
      await dbService.extractPlaylistFromApi(playlistExtraida)
      await cargarPlaylistsReales()
      extraMsg = ` y se extrajo la playlist "${playlistExtraida.nombre}" (${playlistExtraida.canciones.length} canciones)`
    }

    mensajeExito.value = `¡Cuenta de ${nombrePlataformaModal.value} (${formLink.value.handle.trim()}) vinculada exitosamente${extraMsg}!`
    modalPlataforma.value = null
  } catch (err) {
    errorModal.value = err.message
  } finally {
    cargando.value = ''
  }
}

async function desconectarPlataforma(platform) {
  await auth.disconnectPlatform(platform)
  if (platform === 'spotify') {
    misPlaylistsSpotify.value = []
    const cfg = getExternalApiConfig()
    saveExternalApiConfig({ ...cfg, spotifyAccessToken: '' })
  }
  mensajeExito.value = 'App desvinculada correctamente.'
}

async function extraerPorEnlace() {
  if (!urlPlaylistInput.value.trim()) return
  mensajeExito.value = ''
  mensajeError.value = ''
  extrayendoUrl.value = true
  try {
    const playlistExtraida = await musicApiService.extractPlaylistByUrl(urlPlaylistInput.value.trim())
    const resultado = await dbService.extractPlaylistFromApi(playlistExtraida)
    await cargarPlaylistsReales()
    window.dispatchEvent(new CustomEvent('gavify:library-updated'))
    const sync = resultado?._syncSummary
    if (sync?.isUpdate) {
      if (sync.addedCount > 0) {
        mensajeExito.value = `✓ Playlist "${playlistExtraida.nombre}" actualizada: se agregaron ${sync.addedCount} canciones nuevas (${sync.skippedCount} ya estaban cargadas).`
      } else {
        mensajeExito.value = `✓ Playlist "${playlistExtraida.nombre}" ya está al día (${sync.skippedCount} canciones ya cargadas).`
      }
    } else {
      mensajeExito.value = `✓ Playlist "${playlistExtraida.nombre}" (${playlistExtraida.canciones.length} canciones) extraída y guardada en tus Playlists.`
    }
    urlPlaylistInput.value = ''
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendoUrl.value = false
  }
}

async function extraerCatalogoPlataforma(platform) {
  mensajeExito.value = ''
  mensajeError.value = ''
  extrayendo.value = platform
  try {
    const catalogo = musicApiService.getSyncedCatalogByPlatform(platform)
    let totalCanciones = 0
    for (const pl of catalogo.playlists) {
      await dbService.extractPlaylistFromApi(pl)
      extraidasIds.value.add(pl.externalId)
      totalCanciones += (pl.canciones || []).length
    }
    mensajeExito.value = `✓ Se extrajeron exitosamente ${catalogo.playlists.length} playlist(s) y ${totalCanciones} canciones desde tu cuenta de ${catalogo.nombre}.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendo.value = ''
  }
}

async function extraerUnaPlaylist(pl) {
  mensajeExito.value = ''
  mensajeError.value = ''
  extrayendoId.value = pl.externalId
  try {
    await dbService.extractPlaylistFromApi(pl)
    extraidasIds.value.add(pl.externalId)
    mensajeExito.value = `✓ Playlist "${pl.nombre}" (${pl.canciones.length} canciones) extraída e importada a tus Playlists.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendoId.value = ''
  }
}

async function extraerTodasLasPlaylists() {
  mensajeExito.value = ''
  mensajeError.value = ''
  extrayendoTodo.value = true
  try {
    let total = 0
    for (const pl of playlistsDetectadas.value) {
      await dbService.extractPlaylistFromApi(pl)
      extraidasIds.value.add(pl.externalId)
      total += (pl.canciones || []).length
    }
    mensajeExito.value = `✓ Se extrajeron todas las ${playlistsDetectadas.value.length} playlists y ${total} canciones de tus apps conectadas.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendoTodo.value = false
  }
}

function irAlDashboard() {
  router.push('/dashboard')
}

function irAGestorMusica() {
  router.push('/musica')
}
</script>

<style scoped>
.connect-embedded {
  min-height: auto !important;
  padding: 12px 0 40px !important;
  background: transparent !important;
}

.connect-wide {
  max-width: 980px !important;
  margin: 0 auto !important;
}

.connect-head-centered {
  text-align: center;
  margin: 0 auto 22px;
}

.connect-head-centered h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.connect-lead {
  max-width: 560px !important;
  margin: 0 auto !important;
  text-align: center;
}

.connect-alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin: 0 auto 20px;
  max-width: 720px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.connect-alert.success {
  background: rgba(184, 223, 109, 0.15);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.connect-alert.error {
  background: rgba(232, 121, 93, 0.15);
  border: 1px solid var(--red);
  color: var(--red);
}

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 18px;
  margin-top: 20px;
  text-align: left;
}

.platform-card {
  background: #1b1e1a;
  border: 1px solid #30362f;
  padding: 22px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  transition: border-color 0.2s;
}

.platform-card.connected {
  border-color: var(--lime);
  background: #1d241b;
}

.platform-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.platform-brand-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.platform-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.spotify-badge {
  background: rgba(30, 215, 96, 0.15);
  color: #1ed760;
}

.ytmusic-badge {
  background: rgba(255, 78, 69, 0.15);
  color: #ff4e45;
}

.youtube-badge {
  background: rgba(255, 0, 0, 0.15);
  color: #ff4d4d;
}

.conn-status {
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
}

.conn-status.active {
  color: var(--lime);
  font-weight: 700;
}

.platform-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.user-handle {
  font-size: 11px;
  color: var(--lime);
  font-family: monospace;
  word-break: break-all;
}

.platform-card p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
}

.platform-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.connected-sub-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-platform {
  border: 0;
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-spotify {
  background: #1ed760;
  color: #111912;
}

.btn-spotify:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-ytmusic {
  background: #ff4e45;
  color: #fff;
}

.btn-ytmusic:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-youtube {
  background: #e62117;
  color: #fff;
}

.btn-youtube:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-relink {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #3c443b;
  color: var(--cream);
  font-size: 11px;
  padding: 7px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-relink:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.btn-disconnect {
  background: none;
  border: 1px solid #3c443b;
  color: var(--muted);
  font-size: 11px;
  padding: 7px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-disconnect:hover {
  color: var(--red);
  border-color: var(--red);
}

/* Sección de Extractor URL + Playlists Detectadas */
.account-playlists-preview {
  margin-top: 32px;
  padding: 24px;
  background: #141713;
  border: 1px solid #282f26;
  border-radius: 18px;
  text-align: left;
}

.url-extractor-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.url-extractor-head h4 {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 700;
}

.url-extractor-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.url-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.url-input {
  width: 100%;
  background: #0e110e;
  border: 1px solid #313a30;
  color: var(--cream);
  padding: 11px 38px 11px 14px;
  border-radius: 999px;
  font-size: 13px;
  outline: none;
}

.input-clear-x {
  position: absolute;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--cream);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.input-clear-x:hover {
  background: rgba(255, 255, 255, 0.16);
}

.empty-real-playlists {
  padding: 18px;
  border-radius: 12px;
  background: #181c17;
  border: 1px dashed #2e362c;
  color: var(--muted);
  font-size: 13px;
}

.empty-real-playlists p {
  margin: 0;
}

.pl-cover-empty {
  display: grid;
  place-items: center;
  background: #232a22;
  color: var(--lime);
}

.url-input:focus {
  border-color: var(--lime);
}

.preview-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 22px 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.preview-header h3 {
  margin: 4px 0 0;
  font-size: 18px;
}

.playlists-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.pl-detect-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1c201a;
  border: 1px solid #2d352a;
  padding: 12px;
  border-radius: 12px;
}

.pl-detect-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.pl-detect-info {
  flex: 1;
  min-width: 0;
}

.pl-plat-line {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  margin-bottom: 2px;
}

.pl-detect-info h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-detect-info p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-detect-info small {
  display: block;
  font-size: 10px;
  color: var(--lime);
  margin-top: 2px;
}

.btn-extract-one {
  background: var(--lime);
  color: #121811;
  border: 0;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  transition: 0.2s;
}

.btn-extract-one.done {
  background: rgba(184, 223, 109, 0.16);
  color: var(--lime);
  border: 1px solid rgba(184, 223, 109, 0.4);
}

.btn-extract-one:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.03);
}

.btn-extract-one:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connect-bottom-btns {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 28px;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 10px 16px;
  font-size: 12px;
}

/* Modal de Vinculación de Cuenta */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 900;
  padding: 20px;
}

.link-modal {
  width: 100%;
  max-width: 480px;
  background: #171b16;
  border: 1px solid #2e362c;
  border-radius: 20px;
  padding: 24px;
  text-align: left;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

.link-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.link-modal-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.link-modal-title-row h3 {
  margin: 2px 0 0;
  font-size: 18px;
}

.modal-close-x {
  background: #232922;
  border: 1px solid #343d33;
  color: var(--muted);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.link-modal-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 14px 0 18px;
  line-height: 1.5;
}

.link-modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cream);
  font-weight: 700;
}

.field-group input {
  background: #0e110e;
  border: 1px solid #313a30;
  color: var(--cream);
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
}

.field-group input:focus {
  border-color: var(--lime);
}

.field-hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.link-modal-btns {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.link-modal-btns .btn-platform {
  flex: 1;
}

/* Pantalla de carga con disco de vinilo girando */
.vinyl-loading-screen {
  position: fixed;
  inset: 0;
  background: rgba(9, 12, 9, 0.86);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.vinyl-loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  max-width: 380px;
}

.vinyl-loading-card h3 {
  margin: 4px 0 0;
  font-size: 19px;
  color: #ffffff;
}

.vinyl-loading-card p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.loading-vinyl-disc {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  background: repeating-radial-gradient(circle, #30362f 0 2px, #202520 3px 6.5px);
  box-shadow: 0 0 0 1px #596156, 0 18px 45px rgba(0, 0, 0, 0.75);
  display: grid;
  place-items: center;
  animation: connect-vinyl-spin 2.4s linear infinite;
}

.loading-vinyl-label {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #c8a14d;
  border: 6px solid #9b7e40;
  display: grid;
  place-items: center;
  font: 800 18px 'Plus Jakarta Sans', sans-serif;
  color: #161a16;
}

@keyframes connect-vinyl-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .platforms-grid {
    grid-template-columns: 1fr;
  }
  .playlists-cards-grid {
    grid-template-columns: 1fr;
  }
  .url-extractor-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
