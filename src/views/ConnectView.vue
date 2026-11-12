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
      <span class="tiny">CONEXIÓN DE APIS MUSICALES</span>
    </div>

    <section class="connect-content connect-wide">
      <div class="connect-icon">
        <AppIcon name="link" :size="20" />
      </div>
      <p class="eyebrow accent">VINCULAR Y EXTRAER BIBLIOTECA</p>
      <h1>Conecta tus cuentas de<br /><em>Spotify, YouTube Music y YouTube.</em></h1>
      <p class="connect-lead">
        Hola <strong>{{ auth.currentUser.value?.nombre || 'Usuario' }}</strong>
        ({{ auth.roleInfo.value?.etiqueta }} en <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong>).
        Conecta tus plataformas para extraer tus canciones y playlists automáticamente sin tener que cargarlas a mano.
      </p>

      <!-- Feedback Messages -->
      <div v-if="mensajeExito" class="connect-alert success">
        <AppIcon name="check" :size="16" /> {{ mensajeExito }}
      </div>
      <div v-if="mensajeError" class="connect-alert error">
        <AppIcon name="alert" :size="16" /> {{ mensajeError }}
      </div>

      <!-- Tarjetas de las 3 Plataformas -->
      <div class="platforms-grid">
        <!-- 1. SPOTIFY -->
        <div class="platform-card" :class="{ connected: isSpotifyConnected }">
          <div class="platform-top">
            <span class="platform-badge spotify-badge">Spotify Web API</span>
            <span class="conn-status" :class="{ active: isSpotifyConnected }">
              {{ isSpotifyConnected ? 'Conectado' : 'Sin conectar' }}
            </span>
          </div>
          <h3>Spotify</h3>
          <p>Sincroniza tus canciones guardadas, artistas top y playlists mediante OAuth 2.0 PKCE.</p>
          <div class="platform-actions">
            <button
              v-if="!isSpotifyConnected"
              class="btn-platform btn-spotify btn-icon-flex"
              :disabled="cargando === 'spotify'"
              @click="conectarPlataforma('spotify')"
            >
              <AppIcon name="link" :size="14" />
              <span>{{ cargando === 'spotify' ? 'Conectando...' : 'Conectar Spotify' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-spotify btn-icon-flex"
                :disabled="extrayendo === 'spotify'"
                @click="extraerCatalogoPlataforma('spotify')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'spotify' ? 'Extrayendo...' : 'Extraer canciones de Spotify' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('spotify')">
                Desconectar
              </button>
            </template>
          </div>
        </div>

        <!-- 2. YOUTUBE MUSIC -->
        <div class="platform-card" :class="{ connected: isYtMusicConnected }">
          <div class="platform-top">
            <span class="platform-badge ytmusic-badge">YouTube Music API</span>
            <span class="conn-status" :class="{ active: isYtMusicConnected }">
              {{ isYtMusicConnected ? 'Conectado' : 'Sin conectar' }}
            </span>
          </div>
          <h3>YouTube Music</h3>
          <p>Extrae tu Supermix, canciones con "Me gusta", álbumes y listas de reproducción de YT Music.</p>
          <div class="platform-actions">
            <button
              v-if="!isYtMusicConnected"
              class="btn-platform btn-ytmusic btn-icon-flex"
              :disabled="cargando === 'youtube_music'"
              @click="conectarPlataforma('youtube_music')"
            >
              <AppIcon name="link" :size="14" />
              <span>{{ cargando === 'youtube_music' ? 'Conectando...' : 'Conectar YouTube Music' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-ytmusic btn-icon-flex"
                :disabled="extrayendo === 'youtube_music'"
                @click="extraerCatalogoPlataforma('youtube_music')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'youtube_music' ? 'Extrayendo...' : 'Extraer de YouTube Music' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('youtube_music')">
                Desconectar
              </button>
            </template>
          </div>
        </div>

        <!-- 3. YOUTUBE -->
        <div class="platform-card" :class="{ connected: isYoutubeConnected }">
          <div class="platform-top">
            <span class="platform-badge youtube-badge">YouTube Data API v3</span>
            <span class="conn-status" :class="{ active: isYoutubeConnected }">
              {{ isYoutubeConnected ? 'Conectado' : 'Sin conectar' }}
            </span>
          </div>
          <h3>YouTube</h3>
          <p>Extrae videoclips musicales, sesiones en vivo (BZRP, Tiny Desk, remixes) y listas de tu canal.</p>
          <div class="platform-actions">
            <button
              v-if="!isYoutubeConnected"
              class="btn-platform btn-youtube btn-icon-flex"
              :disabled="cargando === 'youtube'"
              @click="conectarPlataforma('youtube')"
            >
              <AppIcon name="play" :size="14" />
              <span>{{ cargando === 'youtube' ? 'Conectando...' : 'Conectar YouTube' }}</span>
            </button>
            <template v-else>
              <button
                class="btn-platform btn-youtube btn-icon-flex"
                :disabled="extrayendo === 'youtube'"
                @click="extraerCatalogoPlataforma('youtube')"
              >
                <AppIcon name="bolt" :size="14" />
                <span>{{ extrayendo === 'youtube' ? 'Extrayendo...' : 'Extraer videos de YouTube' }}</span>
              </button>
              <button class="btn-disconnect" @click="desconectarPlataforma('youtube')">
                Desconectar
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Configuración opcional de API Keys / Tokens Reales -->
      <div class="api-config-box">
        <button class="outline btn-sm btn-icon-flex" style="margin: 0 auto;" @click="mostrarConfigApi = !mostrarConfigApi">
          <AppIcon name="link" :size="14" />
          <span>{{ mostrarConfigApi ? 'Ocultar configuración de credenciales API' : 'Configurar API Keys / Tokens OAuth (Opcional)' }}</span>
        </button>

        <div v-if="mostrarConfigApi" class="api-config-form">
          <p class="tiny">CREDENCIALES OPCIONALES PARA CONSULTA DIRECTA A ENDPOINTS OFICIALES</p>
          <div class="config-grid">
            <div>
              <label>Spotify Client ID / Bearer Token</label>
              <input
                v-model="apiConfig.spotifyAccessToken"
                type="password"
                placeholder="Token OAuth de Spotify Web API (opcional)"
              />
            </div>
            <div>
              <label>YouTube Data API v3 Key</label>
              <input
                v-model="apiConfig.youtubeApiKey"
                type="password"
                placeholder="AIzaSy... (Google Cloud YouTube API Key)"
              />
            </div>
          </div>
          <button class="primary btn-sm" @click="guardarCredencialesApi">
            Guardar credenciales API
          </button>
        </div>
      </div>

      <div class="connect-bottom-btns">
        <button class="primary" @click="irAlDashboard">
          Ir al Resumen y Biblioteca
        </button>
        <button class="outline" @click="irAGestorMusica">
          Abrir Buscador y Extractor en Vivo
        </button>
      </div>

      <small class="privacy">
        Tus datos extraídos se vinculan exclusivamente a tu organización ({{ auth.currentUser.value?.organizacion_nombre }}) bajo políticas RLS.
      </small>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import { musicApiService, getExternalApiConfig, saveExternalApiConfig } from '@/services/musicApis'
import { dbService } from '@/services/db'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const auth = useAuth()

const cargando = ref('')
const extrayendo = ref('')
const mensajeExito = ref('')
const mensajeError = ref('')
const mostrarConfigApi = ref(false)
const apiConfig = ref(getExternalApiConfig())

const isSpotifyConnected = computed(() => auth.currentUser.value?.spotifyConnected ?? false)
const isYtMusicConnected = computed(() => auth.currentUser.value?.ytMusicConnected ?? false)
const isYoutubeConnected = computed(() => auth.currentUser.value?.youtubeConnected ?? false)

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
    mensajeExito.value = `¡Cuenta de ${nombres[platform]} vinculada correctamente a ${auth.currentUser.value?.organizacion_nombre}! Ahora puedes extraer tu música en 1 clic.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    cargando.value = ''
  }
}

async function desconectarPlataforma(platform) {
  await auth.disconnectPlatform(platform)
  mensajeExito.value = 'Plataforma desconectada.'
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
    mensajeExito.value = `✓ Se extrajeron ${catalogo.playlists.length} playlist(s) y ${totalCanciones} canciones desde ${catalogo.nombre} hacia la organización "${auth.currentUser.value?.organizacion_nombre}" sin carga manual.`
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    extrayendo.value = ''
  }
}

function guardarCredencialesApi() {
  saveExternalApiConfig(apiConfig.value)
  mensajeExito.value = 'Credenciales de API guardadas correctamente para consultas en vivo.'
  mostrarConfigApi.value = false
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
}

.platform-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.06em;
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
}

.conn-status.active {
  color: var(--lime);
  font-weight: 700;
}

.platform-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
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
  justify-content: center;
}

.btn-spotify {
  background: #1ed760;
  color: #111912;
}

.btn-ytmusic {
  background: #ff4e45;
  color: #fff;
}

.btn-youtube {
  background: #e62117;
  color: #fff;
}

.btn-disconnect {
  background: none;
  border: 1px solid #3c443b;
  color: var(--muted);
  font-size: 11px;
  padding: 7px;
  border-radius: 999px;
}

.api-config-box {
  margin-top: 24px;
}

.api-config-form {
  max-width: 680px;
  margin: 14px auto 0;
  padding: 18px;
  background: #1b1e1a;
  border: 1px solid var(--line);
  border-radius: 16px;
  text-align: left;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 12px 0;
}

.config-grid label {
  display: block;
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.config-grid input {
  width: 100%;
  background: #121512;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 9px 12px;
  font-size: 12px;
  border-radius: 4px;
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
  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
