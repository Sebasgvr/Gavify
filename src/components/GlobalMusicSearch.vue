<template>
  <transition name="search-panel-fade">
    <div v-if="isOpen" class="global-search-backdrop" @click.self="$emit('close')">
      <section class="global-search-modal panel">
        <div class="global-search-head">
          <div>
            <span class="tiny accent">BUSCADOR MULTI-PLATAFORMA EN TIEMPO REAL</span>
            <h3>Elige la plataforma y busca cualquier canción o artista</h3>
          </div>
          <button type="button" class="close-search-btn" title="Cerrar buscador (Esc)" @click="$emit('close')">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <!-- Selector Multi-Plataforma: elige Todas, 2 o 1 plataforma -->
        <div class="platform-tabs">
          <button
            type="button"
            class="plat-tab"
            :class="{ active: todasSeleccionadas }"
            @click="seleccionarTodasLasPlataformas"
          >
            <span>Todas</span>
          </button>
          <button
            v-for="plat in plataformasExtractor"
            :key="plat.id"
            type="button"
            class="plat-tab"
            :class="{ active: plataformasActivas.includes(plat.id) }"
            @click="togglePlataforma(plat.id)"
          >
            <AppIcon :name="plat.id" :size="18" />
            <span>{{ plat.nombre }}</span>
          </button>
        </div>

        <!-- Mensajes -->
        <div v-if="mensaje" class="alert-box alert-success">
          <AppIcon name="check" :size="16" />
          <div class="alert-text">{{ mensaje }}</div>
          <button class="alert-close" @click="mensaje = ''">
            <AppIcon name="close" :size="14" />
          </button>
        </div>
        <div v-if="errorMensaje" class="alert-box alert-error">
          <AppIcon name="alert" :size="16" />
          <div class="alert-text">{{ errorMensaje }}</div>
          <button class="alert-close" @click="errorMensaje = ''">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <!-- Búsqueda en Vivo -->
        <div class="extractor-search-area">
          <div class="live-input-box">
            <AppIcon name="search" :size="16" />
            <input
              ref="inputRef"
              v-model="consultaApi"
              type="text"
              placeholder="Artista, canción, álbum..."
              @keydown.esc="$emit('close')"
            />
            <span v-if="buscandoApi" class="live-status">Buscando...</span>
            <button
              v-if="consultaApi"
              type="button"
              class="search-clear-x"
              title="Borrar búsqueda"
              @click="limpiarBusqueda"
            >
              <AppIcon name="close" :size="13" />
            </button>
          </div>

          <!-- Sugerencias rápidas -->
          <div class="quick-search-chips">
            <span class="tiny">POPULARES:</span>
            <button
              v-for="sug in sugerenciasBusqueda"
              :key="sug"
              type="button"
              class="chip-btn"
              @click="buscarSugerencia(sug)"
            >
              {{ sug }}
            </button>
          </div>

          <div v-if="buscandoApi && !resultadosApi.length" class="empty-state">
            <p>Buscando en {{ etiquetaPlataformasActivas }}...</p>
          </div>

          <div v-else-if="resultadosApi.length" class="api-results-list">
            <div class="api-results-head">
              <span class="tiny">RESULTADOS EN {{ etiquetaPlataformasActivas.toUpperCase() }} ({{ resultadosApi.length }})</span>
            </div>

            <div class="api-cards-grid">
              <div v-for="item in resultadosApi" :key="item.external_id" class="api-track-card">
                <VinylThumb :src="item.portada_url" :alt="item.titulo" :size="48" />
                <div class="api-track-info">
                  <div class="api-track-title-wrap">
                    <MarqueeText :text="item.titulo" class="api-track-title" />
                  </div>
                  <div class="api-track-artist-wrap">
                    <MarqueeText :text="item.artista + (item.album ? ' • ' + item.album : '')" class="api-track-artist" />
                  </div>
                  <div class="api-track-badges">
                    <span :class="['origin-badge', `origin-${item.plataforma_origen || 'spotify'}`]">
                      {{ etiquetaPlataforma(item.plataforma_origen) }}
                    </span>
                    <span class="genre-pill">{{ item.genero }}</span>
                    <span class="tiny">{{ formatearDuracion(item.duracion_segundos) }}</span>
                  </div>
                </div>
                <div class="api-track-actions">
                  <button
                    type="button"
                    class="icon-play-btn"
                    title="Escuchar canción entera"
                    @click="reproducirCancion(item, resultadosApi)"
                  >
                    <AppIcon name="play" :size="15" />
                  </button>
                  <button
                    type="button"
                    class="icon-add-btn"
                    title="Agregar canción a una playlist (+)"
                    @click="abrirModalAgregar(item)"
                  >
                    <AppIcon name="plus" :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal para añadir canción a una playlist -->
      <AddToPlaylistModal
        :is-open="modalAgregarAbierto"
        :track="cancionParaAgregar"
        @close="modalAgregarAbierto = false"
        @saved="onCancionGuardadaEnPlaylist"
      />
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import VinylThumb from '@/components/VinylThumb.vue'
import MarqueeText from '@/components/MarqueeText.vue'
import AddToPlaylistModal from '@/components/AddToPlaylistModal.vue'
import { musicApiService } from '@/services/musicApis'
import { dbService } from '@/services/db'
import { usePlayer } from '@/services/player'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'update:query'])

const player = usePlayer()

const plataformasExtractor = [
  { id: 'spotify', nombre: 'Spotify' },
  { id: 'youtube_music', nombre: 'YouTube Music' },
  { id: 'youtube', nombre: 'YouTube' }
]
const plataformasActivas = ref(['spotify'])
const consultaApi = ref('')
const resultadosApi = ref([])
const buscandoApi = ref(false)
const mensaje = ref('')
const errorMensaje = ref('')
const inputRef = ref(null)

const modalAgregarAbierto = ref(false)
const cancionParaAgregar = ref(null)

const sugerenciasBusqueda = [
  'Coldplay',
  'Duki',
  'Bizarrap',
  'The Weeknd',
  'Soda Stereo',
  'Arctic Monkeys',
  'Maroon 5',
  'Miley Cyrus'
]

const todasSeleccionadas = computed(() => plataformasActivas.value.length === plataformasExtractor.length)

const etiquetaPlataformasActivas = computed(() => {
  if (todasSeleccionadas.value) return 'Todas las plataformas'
  return plataformasExtractor
    .filter(p => plataformasActivas.value.includes(p.id))
    .map(p => p.nombre)
    .join(' + ')
})

let debounceTimer = null

function limpiarBusqueda() {
  consultaApi.value = ''
  resultadosApi.value = []
  emit('update:query', '')
}

function seleccionarTodasLasPlataformas() {
  plataformasActivas.value = plataformasExtractor.map(p => p.id)
  if (consultaApi.value.trim()) buscarEnApi()
}

function togglePlataforma(platId) {
  const actual = [...plataformasActivas.value]
  if (actual.includes(platId)) {
    if (actual.length > 1) {
      plataformasActivas.value = actual.filter(id => id !== platId)
    }
  } else {
    plataformasActivas.value = [...actual, platId]
  }
  if (consultaApi.value.trim()) buscarEnApi()
}

watch(
  () => props.isOpen,
  async open => {
    if (open) {
      if (props.initialQuery && props.initialQuery.trim()) {
        consultaApi.value = props.initialQuery.trim()
      }
      if (consultaApi.value.trim() && !resultadosApi.value.length) {
        buscarEnApi()
      }
      await nextTick()
      inputRef.value?.focus()
    } else {
      // Al salir del buscador se borra lo escrito y los resultados
      limpiarBusqueda()
      mensaje.value = ''
      errorMensaje.value = ''
    }
  }
)

watch(
  () => props.initialQuery,
  val => {
    if (typeof val === 'string' && val.trim() !== consultaApi.value.trim()) {
      consultaApi.value = val
    }
  }
)

watch(consultaApi, val => {
  emit('update:query', val)
  clearTimeout(debounceTimer)
  if (!val.trim()) {
    resultadosApi.value = []
    return
  }
  debounceTimer = setTimeout(() => {
    buscarEnApi()
  }, 300)
})

function buscarSugerencia(sug) {
  consultaApi.value = sug
  buscarEnApi()
}

async function buscarEnApi() {
  if (!consultaApi.value.trim()) return
  buscandoApi.value = true
  errorMensaje.value = ''
  try {
    resultadosApi.value = await musicApiService.searchTracksAcrossPlatforms(
      consultaApi.value,
      plataformasActivas.value
    )
  } catch (err) {
    errorMensaje.value = 'Error al consultar la plataforma: ' + err.message
  } finally {
    buscandoApi.value = false
  }
}

function abrirModalAgregar(track) {
  cancionParaAgregar.value = { ...track }
  modalAgregarAbierto.value = true
}

function onCancionGuardadaEnPlaylist({ playlist, track }) {
  mensaje.value = `✓ "${track.titulo}" se guardó en tu playlist "${playlist.nombre}".`
}

async function importarPlaylistCompleta(pl) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    await dbService.extractPlaylistFromApi(pl)
    mensaje.value = `✓ Playlist "${pl.nombre}" (${pl.canciones.length} canciones) importada a tus Playlists.`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function reproducirCancion(song, queue = []) {
  player.playTrack(song, queue.length ? queue : resultadosApi.value)
}

function etiquetaPlataforma(plat) {
  if (plat === 'spotify') return 'Spotify'
  if (plat === 'youtube_music') return 'YT Music'
  if (plat === 'youtube') return 'YouTube'
  return 'Spotify'
}

function formatearDuracion(seg) {
  const s = Number(seg) || 0
  const mins = Math.floor(s / 60)
  const rem = s % 60
  return `${mins}:${String(rem).padStart(2, '0')}`
}
</script>

<style scoped>
.global-search-backdrop {
  position: fixed;
  inset: 0;
  top: 74px;
  background: rgba(8, 10, 8, 0.78);
  backdrop-filter: blur(8px);
  z-index: 80;
  padding: 20px 32px 110px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.global-search-modal {
  width: 100%;
  max-width: 1220px;
  background: #171b16;
  border: 1px solid #2b342a;
  border-radius: 20px;
  padding: 24px 28px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.72);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.global-search-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.global-search-head h3 {
  margin: 4px 0 0;
  font-size: 20px;
}

.close-search-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #333c31;
  background: #222821;
  color: var(--cream);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.close-search-btn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.platform-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.plat-tab {
  background: #111411;
  border: 1px solid #2d342c;
  color: var(--cream);
  padding: 9px 16px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.plat-tab.active {
  border-color: var(--lime);
  background: #222a21;
  color: #ffffff;
}

.extractor-mode-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-pill {
  background: transparent;
  border: 1px solid #2d342c;
  color: var(--muted);
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.mode-pill.active {
  background: var(--lime);
  border-color: var(--lime);
  color: #111610;
  font-weight: 700;
}

.live-input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0f120f;
  border: 1px solid #2e362c;
  border-radius: 999px;
  padding: 10px 16px;
}

.live-input-box input {
  flex: 1;
  background: none;
  border: 0;
  color: var(--cream);
  font-size: 14px;
  outline: none;
}

.live-status {
  font-size: 11px;
  color: var(--lime);
  font-weight: 700;
}

.search-clear-x {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--cream);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.search-clear-x:hover {
  background: rgba(255, 255, 255, 0.16);
}

.quick-search-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.chip-btn {
  background: #1d221c;
  border: 1px solid #2f382e;
  color: var(--cream);
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  cursor: pointer;
}

.chip-btn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.api-results-list {
  margin-top: 14px;
}

.api-results-head {
  margin-bottom: 10px;
}

.api-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.api-track-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #121612;
  border: 1px solid #252c24;
  border-radius: 14px;
  padding: 10px 12px;
  min-width: 0;
}

.api-track-img {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.api-track-img.empty {
  background: #202620;
  display: grid;
  place-items: center;
  color: var(--lime);
}

.api-track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.api-track-title-wrap,
.api-track-artist-wrap {
  min-width: 0;
  max-width: 100%;
}

.api-track-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.api-track-artist {
  font-size: 11px;
  color: var(--muted);
}

.api-track-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.origin-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.origin-spotify {
  background: rgba(30, 215, 96, 0.16);
  color: #1ed760;
}

.origin-youtube_music {
  background: rgba(255, 78, 69, 0.16);
  color: #ff6e66;
}

.origin-youtube {
  background: rgba(255, 0, 0, 0.16);
  color: #ff6b6b;
}

.genre-pill {
  font-size: 10px;
  background: #1f251e;
  color: var(--cream);
  padding: 2px 8px;
  border-radius: 999px;
}

.api-track-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 0;
  background: rgba(30, 215, 96, 0.16);
  color: #1ed760;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.icon-play-btn:hover {
  background: #1ed760;
  color: #0b0d0b;
}

.icon-add-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 0;
  background: var(--lime);
  color: #111610;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.icon-add-btn:hover {
  filter: brightness(1.1);
}

.synced-playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.synced-pl-card {
  background: #121612;
  border: 1px solid #262e25;
  border-radius: 14px;
  padding: 16px;
}

.synced-pl-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.synced-pl-head h4 {
  margin: 4px 0;
  font-size: 15px;
}

.synced-pl-head p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
}

.alert-success {
  background: rgba(184, 223, 109, 0.14);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.alert-error {
  background: rgba(232, 121, 93, 0.14);
  border: 1px solid var(--red);
  color: var(--red);
}

.alert-text {
  flex: 1;
}

.alert-close {
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.search-panel-fade-enter-active,
.search-panel-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.search-panel-fade-enter-from,
.search-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1120px) {
  .api-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .global-search-backdrop {
    padding: 14px 14px 110px;
  }
  .api-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
