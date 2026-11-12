<template>
  <main class="connect">
    <div class="connect-top">
      <button class="back btn-icon-flex" @click="goBack">
        <AppIcon name="arrow-left" :size="15" />
        <span>Volver</span>
      </button>
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>
      <span class="tiny">VINCULACIÓN DE CUENTAS MUSICALES</span>
    </div>

    <section class="connect-content connect-wide">
      <div class="connect-icon">
        <AppIcon name="link" :size="20" />
      </div>
      <p class="eyebrow accent">VINCULAR CUENTAS Y EXTRAER PLAYLISTS</p>
      <h1>Conecta tus cuentas de<br /><em>Spotify, YouTube Music y YouTube.</em></h1>
      <p class="connect-lead">
        Hola <strong>{{ auth.currentUser.value?.nombre || 'Usuario' }}</strong>
        ({{ auth.roleInfo.value?.etiqueta }} en <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong>).
        Vincula tus cuentas de streaming para extraer tus playlists y canciones favoritas directamente a Gavify, sin carga manual ni configuraciones técnicas.
      </p>

      <!-- Feedback Messages -->
      <div v-if="mensajeExito" class="connect-alert success">
        <AppIcon name="check" :size="16" /> {{ mensajeExito }}
      </div>
      <div v-if="mensajeError" class="connect-alert error">
        <AppIcon name="alert" :size="16" /> {{ mensajeError }}
      </div>

      <!-- Tarjetas de las 3 Plataformas con Iconos Oficiales -->
      <div class="platforms-grid">
        <!-- 1. SPOTIFY -->
        <div class="platform-card" :class="{ connected: isSpotifyConnected }">
          <div class="platform-top">
            <div class="platform-brand-badge">
              <AppIcon name="spotify" :size="20" />
              <span class="platform-badge spotify-badge">Cuenta de Spotify</span>
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
                @{{ getUsernameHandle('spotify') }}
              </small>
            </div>
          </div>
          <p>Extrae tus playlists personales, canciones guardadas en "Tus Me Gusta" y tus artistas más escuchados.</p>
          
          <div class="platform-actions">
            <button
              v-if="!isSpotifyConnected"
              class="btn-platform btn-spotify btn-icon-flex"
              :disabled="cargando === 'spotify'"
              @click="conectarPlataforma('spotify')"
            >
              <AppIcon name="spotify" :size="16" />
              <span>{{ cargando === 'spotify' ? 'Vinculando cuenta...' : 'Vincular cuenta de Spotify' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-spotify btn-icon-flex"
                :disabled="extrayendo === 'spotify'"
                @click="extraerCatalogoPlataforma('spotify')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'spotify' ? 'Extrayendo playlists...' : 'Extraer playlists de mi cuenta' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('spotify')">
                Desvincular cuenta
              </button>
            </template>
          </div>
        </div>

        <!-- 2. YOUTUBE MUSIC -->
        <div class="platform-card" :class="{ connected: isYtMusicConnected }">
          <div class="platform-top">
            <div class="platform-brand-badge">
              <AppIcon name="youtube_music" :size="20" />
              <span class="platform-badge ytmusic-badge">Cuenta de YT Music</span>
            </div>
            <span class="conn-status" :class="{ active: isYtMusicConnected }">
              {{ isYtMusicConnected ? '● Cuenta vinculada' : '○ Sin vincular' }}
            </span>
          </div>
          <div class="platform-header-row">
            <AppIcon name="youtube_music" :size="32" />
            <div>
              <h3>YouTube Music</h3>
              <small v-if="isYtMusicConnected" class="user-handle">
                @{{ getUsernameHandle('youtube_music') }}
              </small>
            </div>
          </div>
          <p>Importa tu Supermix, canciones que te gustan, mezclas personalizadas y listas creadas en YouTube Music.</p>
          
          <div class="platform-actions">
            <button
              v-if="!isYtMusicConnected"
              class="btn-platform btn-ytmusic btn-icon-flex"
              :disabled="cargando === 'youtube_music'"
              @click="conectarPlataforma('youtube_music')"
            >
              <AppIcon name="youtube_music" :size="16" />
              <span>{{ cargando === 'youtube_music' ? 'Vinculando cuenta...' : 'Vincular cuenta de YT Music' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-ytmusic btn-icon-flex"
                :disabled="extrayendo === 'youtube_music'"
                @click="extraerCatalogoPlataforma('youtube_music')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'youtube_music' ? 'Extrayendo playlists...' : 'Extraer playlists de mi cuenta' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('youtube_music')">
                Desvincular cuenta
              </button>
            </template>
          </div>
        </div>

        <!-- 3. YOUTUBE -->
        <div class="platform-card" :class="{ connected: isYoutubeConnected }">
          <div class="platform-top">
            <div class="platform-brand-badge">
              <AppIcon name="youtube" :size="20" />
              <span class="platform-badge youtube-badge">Cuenta de YouTube</span>
            </div>
            <span class="conn-status" :class="{ active: isYoutubeConnected }">
              {{ isYoutubeConnected ? '● Cuenta vinculada' : '○ Sin vincular' }}
            </span>
          </div>
          <div class="platform-header-row">
            <AppIcon name="youtube" :size="32" />
            <div>
              <h3>YouTube</h3>
              <small v-if="isYoutubeConnected" class="user-handle">
                @{{ getUsernameHandle('youtube') }}
              </small>
            </div>
          </div>
          <p>Extrae videoclips, sesiones en vivo (BZRP, Tiny Desk), remixes y listas de reproducción de tu canal.</p>
          
          <div class="platform-actions">
            <button
              v-if="!isYoutubeConnected"
              class="btn-platform btn-youtube btn-icon-flex"
              :disabled="cargando === 'youtube'"
              @click="conectarPlataforma('youtube')"
            >
              <AppIcon name="youtube" :size="16" />
              <span>{{ cargando === 'youtube' ? 'Vinculando cuenta...' : 'Vincular cuenta de YouTube' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-youtube btn-icon-flex"
                :disabled="extrayendo === 'youtube'"
                @click="extraerCatalogoPlataforma('youtube')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'youtube' ? 'Extrayendo playlists...' : 'Extraer videos y listas de mi cuenta' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('youtube')">
                Desvincular cuenta
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Playlists Disponibles para Extraer de Cuentas Vinculadas -->
      <div v-if="hasAnyConnected" class="account-playlists-preview">
        <div class="preview-header">
          <div>
            <span class="tiny accent">LISTAS DETECTADAS EN TUS CUENTAS</span>
            <h3>Playlists disponibles para extraer a tu Gavify</h3>
          </div>
          <button
            class="primary btn-sm btn-icon-flex"
            :disabled="extrayendoTodo"
            @click="extraerTodasLasPlaylists"
          >
            <AppIcon name="bolt" :size="14" />
            <span>{{ extrayendoTodo ? 'Extrayendo todo...' : 'Extraer todas las playlists vinculadas' }}</span>
          </button>
        </div>

        <div class="playlists-cards-grid">
          <div
            v-for="pl in playlistsDetectadas"
            :key="pl.externalId"
            class="pl-detect-card"
          >
            <img :src="pl.portada_url" :alt="pl.nombre" class="pl-detect-cover" />
            <div class="pl-detect-info">
              <div class="pl-plat-line">
                <AppIcon :name="pl.plataforma_origen" :size="14" />
                <span class="tiny">{{ pl.plataforma_origen === 'youtube_music' ? 'YT Music' : pl.plataforma_origen.toUpperCase() }}</span>
              </div>
              <h4>{{ pl.nombre }}</h4>
              <p>{{ pl.descripcion }}</p>
              <small>{{ pl.canciones.length }} canciones</small>
            </div>
            <button
              class="btn-extract-one"
              :disabled="extrayendoId === pl.externalId"
              @click="extraerUnaPlaylist(pl)"
            >
              <AppIcon name="plus" :size="14" />
              <span>{{ extrayendoId === pl.externalId ? 'Extrayendo...' : 'Extraer' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="connect-bottom-btns">
        <button class="primary" @click="irAlDashboard">
          Ir al Resumen y Biblioteca
        </button>
        <button class="outline" @click="irAGestorMusica">
          Abrir Explorador Musical
        </button>
      </div>

      <small class="privacy">
        Tus cuentas y canciones se gestionan bajo políticas de aislamiento por organización ({{ auth.currentUser.value?.organizacion_nombre }}).
      </small>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import { musicApiService } from '@/services/musicApis'
import { dbService } from '@/services/db'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const auth = useAuth()

const cargando = ref('')
const extrayendo = ref('')
const extrayendoTodo = ref(false)
const extrayendoId = ref('')
const mensajeExito = ref('')
const mensajeError = ref('')

const isSpotifyConnected = computed(() => auth.currentUser.value?.spotifyConnected ?? false)
const isYtMusicConnected = computed(() => auth.currentUser.value?.ytMusicConnected ?? false)
const isYoutubeConnected = computed(() => auth.currentUser.value?.youtubeConnected ?? false)

const hasAnyConnected = computed(() => {
  return isSpotifyConnected.value || isYtMusicConnected.value || isYoutubeConnected.value
})

function getUsernameHandle(platform) {
  const nombre = auth.currentUser.value?.nombre || 'usuario'
  const clean = nombre.toLowerCase().replace(/\s+/g, '_')
  return `${clean}_${platform === 'youtube_music' ? 'ytmusic' : platform}`
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

async function conectarPlataforma(platform) {
  mensajeExito.value = ''
  mensajeError.value = ''
  cargando.value = platform
  try {
    await auth.connectPlatform(platform)
    const nombres = {
      spotify: 'Spotify',
      youtube_music: 'YouTube Music',
      youtube: 'YouTube'
    }
    mensajeExito.value = `¡Cuenta de ${nombres[platform]} vinculada exitosamente! Ya puedes extraer tus playlists directamente a tu biblioteca.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    cargando.value = ''
  }
}

async function desconectarPlataforma(platform) {
  await auth.disconnectPlatform(platform)
  mensajeExito.value = 'Cuenta desvinculada correctamente.'
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
    mensajeExito.value = `✓ Playlist "${pl.nombre}" (${pl.canciones.length} canciones) extraída e importada correctamente a tu Gavify.`
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
      total += (pl.canciones || []).length
    }
    mensajeExito.value = `✓ Se extrajeron todas las ${playlistsDetectadas.value.length} playlists y ${total} canciones de tus cuentas conectadas.`
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
.connect-wide {
  max-width: 980px !important;
  margin-top: 6vh !important;
}

.connect-lead {
  max-width: 640px !important;
  margin: 0 auto 28px !important;
}

.connect-alert {
  padding: 12px 16px;
  border-radius: 6px;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;
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

.btn-spotify:hover {
  filter: brightness(1.1);
}

.btn-ytmusic {
  background: #ff4e45;
  color: #fff;
}

.btn-ytmusic:hover {
  filter: brightness(1.1);
}

.btn-youtube {
  background: #e62117;
  color: #fff;
}

.btn-youtube:hover {
  filter: brightness(1.1);
}

.btn-disconnect {
  background: none;
  border: 1px solid #3c443b;
  color: var(--muted);
  font-size: 11px;
  padding: 7px;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-disconnect:hover {
  color: var(--red);
  border-color: var(--red);
}

/* Sección de Playlists Detectadas */
.account-playlists-preview {
  margin-top: 32px;
  padding: 24px;
  background: #141713;
  border: 1px solid #282f26;
  border-radius: 18px;
  text-align: left;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  gap: 16px;
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

.btn-extract-one:hover {
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
}

.btn-sm {
  padding: 8px 14px;
  font-size: 11px;
}

@media (max-width: 860px) {
  .platforms-grid {
    grid-template-columns: 1fr;
  }
  .playlists-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
