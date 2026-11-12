<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="cerrar">
    <div class="add-playlist-modal">
      <!-- CABECERA: Track Preview & Close -->
      <div class="modal-header">
        <div class="track-preview-box">
          <img
            v-if="track?.portada_url"
            :src="track.portada_url"
            :alt="track?.titulo"
            class="track-preview-img"
          />
          <div v-else class="track-preview-img empty">
            <AppIcon name="music" :size="20" />
          </div>
          <div class="track-preview-text">
            <span class="preview-eyebrow">GUARDAR EN PLAYLIST</span>
            <div class="preview-title-wrap">
              <MarqueeText :text="track?.titulo || 'Canción'" class="preview-title" />
            </div>
            <div class="preview-artist-wrap">
              <MarqueeText :text="track?.artista || 'Artista'" class="preview-artist" />
            </div>
          </div>
        </div>
        <button class="modal-close-btn" @click="cerrar" title="Cerrar">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <!-- MENSAJES DE ESTADO / FEEDBACK -->
      <div v-if="mensajeExito" class="modal-alert modal-alert-success">
        <AppIcon name="check" :size="16" />
        <span>{{ mensajeExito }}</span>
      </div>
      <div v-if="mensajeError" class="modal-alert modal-alert-error">
        <AppIcon name="alert" :size="16" />
        <span>{{ mensajeError }}</span>
      </div>

      <!-- CUERPO: LISTA DE PLAYLISTS DISPONIBLES -->
      <div class="modal-body">
        <!-- CASO 1: Si no tiene ninguna playlist creada -->
        <div v-if="!cargando && !playlists.length && !mostrandoCrearInline" class="no-playlists-box">
          <div class="no-pl-icon">
            <AppIcon name="playlist" :size="32" />
          </div>
          <h4>No tienes ninguna playlist aún</h4>
          <p>Crea tu primera playlist para guardar tus canciones y organizar tu biblioteca.</p>
          <button class="primary btn-create-first" @click="mostrandoCrearInline = true">
            <AppIcon name="plus" :size="16" />
            <span>Crear mi primera playlist</span>
          </button>
        </div>

        <!-- CASO 2: Tiene playlists existentes -->
        <div v-else-if="!cargando" class="playlists-picker-area">
          <div class="picker-section-head">
            <span>Elige en qué playlist quieres guardarla:</span>
            <button
              v-if="!mostrandoCrearInline"
              class="btn-new-inline"
              @click="mostrandoCrearInline = true"
            >
              <AppIcon name="plus" :size="14" />
              <span>Nueva playlist</span>
            </button>
          </div>

          <!-- FORMULARIO INLINE PARA CREAR PLAYLIST EN EL ACTO -->
          <div v-if="mostrandoCrearInline" class="inline-create-card">
            <div class="inline-create-head">
              <strong>Nueva playlist</strong>
              <button class="text-btn" @click="mostrandoCrearInline = false">Cancelar</button>
            </div>
            <div class="inline-inputs">
              <input
                v-model="nuevoNombre"
                type="text"
                placeholder="Nombre de la playlist (ej. Favoritas, Gym, Chill)..."
                class="inline-name-input"
                @keyup.enter="crearYGuardar"
              />
              <div class="inline-switch-row">
                <span class="inline-switch-label">
                  {{ nuevaEsPublica ? 'Pública' : 'Privada' }}
                </span>
                <label class="switch-control">
                  <input v-model="nuevaEsPublica" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <button
              class="primary btn-save-inline"
              :disabled="!nuevoNombre.trim() || guardando"
              @click="crearYGuardar"
            >
              <AppIcon v-if="!guardando" name="check" :size="15" />
              <span>{{ guardando ? 'Guardando en BD...' : 'Crear y guardar canción aquí' }}</span>
            </button>
          </div>

          <!-- LISTA DE PLAYLISTS -->
          <div class="pl-list-scroll">
            <div
              v-for="pl in playlists"
              :key="pl.id"
              class="pl-picker-row"
              :class="{ 'in-playlist': estaEnPlaylist(pl.id) }"
              @click="toggleCancionEnPlaylist(pl)"
            >
              <div class="pl-row-left">
                <img
                  v-if="pl.portada_url"
                  :src="pl.portada_url"
                  :alt="pl.nombre"
                  class="pl-row-thumb"
                />
                <div v-else class="pl-row-thumb empty-thumb">
                  <AppIcon name="music" :size="16" />
                </div>
                <div class="pl-row-text">
                  <strong class="pl-row-name">{{ pl.nombre }}</strong>
                  <small class="pl-row-count">
                    {{ pl.total_canciones || 0 }} {{ pl.total_canciones === 1 ? 'canción' : 'canciones' }}
                    • {{ pl.es_publica ? 'Pública' : 'Privada' }}
                  </small>
                </div>
              </div>

              <div class="pl-row-action">
                <span v-if="guardandoPlId === pl.id" class="saving-chip">
                  Guardando...
                </span>
                <button
                  v-else-if="estaEnPlaylist(pl.id)"
                  class="btn-already-in"
                  title="Ya está en esta playlist (haz clic para quitarla)"
                >
                  <AppIcon name="check" :size="14" />
                  <span>En esta lista</span>
                </button>
                <button
                  v-else
                  class="btn-add-to-pl"
                  title="Guardar en esta playlist"
                >
                  <AppIcon name="plus" :size="14" />
                  <span>Guardar aquí</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cargando" class="loading-state">
          <p>Cargando tus playlists...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { dbService } from '../services/db'
import { useAuth } from '../services/auth'
import AppIcon from './AppIcon.vue'
import MarqueeText from './MarqueeText.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  track: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'song-added'])

const auth = useAuth()
const cargando = ref(false)
const guardando = ref(false)
const guardandoPlId = ref(null)
const playlists = ref([])
const playlistsConEstaCancion = ref(new Set())
const mostrandoCrearInline = ref(false)
const nuevoNombre = ref('')
const nuevaEsPublica = ref(false)
const mensajeExito = ref('')
const mensajeError = ref('')

async function cargarPlaylistsYEstado() {
  if (!auth.isAuthenticated.value) return
  cargando.value = true
  mensajeExito.value = ''
  mensajeError.value = ''
  try {
    const listas = await dbService.getPlaylists()
    playlists.value = listas

    // Verificar en cuáles listas ya está esta canción
    const setIds = new Set()
    if (props.track) {
      for (const pl of listas) {
        const canciones = await dbService.getCancionesByPlaylist(pl.id)
        const existe = canciones.some(
          c =>
            c.id === props.track.id ||
            (c.titulo?.toLowerCase() === props.track.titulo?.toLowerCase() &&
              c.artista?.toLowerCase() === props.track.artista?.toLowerCase())
        )
        if (existe) {
          setIds.add(pl.id)
        }
      }
    }
    playlistsConEstaCancion.value = setIds
  } catch (err) {
    mensajeError.value = 'No se pudieron cargar tus playlists: ' + err.message
  } finally {
    cargando.value = false
  }
}

function estaEnPlaylist(playlistId) {
  return playlistsConEstaCancion.value.has(playlistId)
}

async function toggleCancionEnPlaylist(pl) {
  if (guardandoPlId.value || !props.track) return
  guardandoPlId.value = pl.id
  mensajeExito.value = ''
  mensajeError.value = ''

  try {
    // 1. Guardar canción en la base de datos de catálogo si aún no está
    const cancionGuardada = await dbService.extractCancionFromApi(props.track)

    if (estaEnPlaylist(pl.id)) {
      // Quitar de la playlist
      const canciones = await dbService.getCancionesByPlaylist(pl.id)
      const target = canciones.find(
        c =>
          c.id === cancionGuardada.id ||
          (c.titulo?.toLowerCase() === props.track.titulo?.toLowerCase() &&
            c.artista?.toLowerCase() === props.track.artista?.toLowerCase())
      )
      if (target && target.playlist_cancion_id) {
        await dbService.removeCancionFromPlaylist(target.playlist_cancion_id)
        playlistsConEstaCancion.value.delete(pl.id)
        mensajeExito.value = `"${cancionGuardada.titulo}" quitada de "${pl.nombre}".`
      }
    } else {
      // Agregar a la playlist
      await dbService.addCancionToPlaylist(pl.id, cancionGuardada.id)
      playlistsConEstaCancion.value.add(pl.id)
      mensajeExito.value = `✓ "${cancionGuardada.titulo}" guardada en "${pl.nombre}" (Base de Datos sincronizada).`
      emit('song-added', { track: cancionGuardada, playlist: pl })
    }

    // Actualizar conteo visual
    const actualizadas = await dbService.getPlaylists()
    playlists.value = actualizadas
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    guardandoPlId.value = null
  }
}

async function crearYGuardar() {
  if (!nuevoNombre.value.trim() || !props.track) return
  guardando.value = true
  mensajeExito.value = ''
  mensajeError.value = ''

  try {
    // 1. Crear la nueva playlist en BD
    const nuevaPl = await dbService.createPlaylist({
      nombre: nuevoNombre.value.trim(),
      descripcion: `Playlist creada para "${props.track.titulo}"`,
      es_publica: nuevaEsPublica.value,
      plataforma_origen: props.track.plataforma_origen || 'gavify'
    })

    // 2. Extraer y guardar la canción vinculada a la nueva playlist
    const cancionGuardada = await dbService.extractCancionFromApi(props.track, nuevaPl.id)

    // 3. Actualizar estado
    nuevoNombre.value = ''
    mostrandoCrearInline.value = false
    await cargarPlaylistsYEstado()
    playlistsConEstaCancion.value.add(nuevaPl.id)

    mensajeExito.value = `✓ Playlist "${nuevaPl.nombre}" creada y "${cancionGuardada.titulo}" guardada en la base de datos.`
    emit('song-added', { track: cancionGuardada, playlist: nuevaPl })
  } catch (err) {
    mensajeError.value = err.message
  } finally {
    guardando.value = false
  }
}

function cerrar() {
  emit('close')
}

watch(
  () => [props.isOpen, props.track],
  ([abierto, pista]) => {
    if (abierto && pista) {
      cargarPlaylistsYEstado()
    }
  }
)

onMounted(() => {
  if (props.isOpen && props.track) {
    cargarPlaylistsYEstado()
  }
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.76);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.add-playlist-modal {
  width: 100%;
  max-width: 480px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  animation: modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header */
.modal-header {
  padding: 16px 20px;
  background: #202024;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.track-preview-box {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.track-preview-img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.track-preview-img.empty {
  background: #27272a;
  display: grid;
  place-items: center;
  color: #a1a1aa;
}

.track-preview-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--lime, #b8df6d);
  margin-bottom: 2px;
}

.preview-title-wrap,
.preview-artist-wrap {
  min-width: 0;
  max-width: 100%;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.preview-artist {
  font-size: 12px;
  color: #a1a1aa;
}

.modal-close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 0;
  color: #a1a1aa;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

/* Alertas */
.modal-alert {
  padding: 10px 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-alert-success {
  background: rgba(184, 223, 109, 0.15);
  color: var(--lime, #b8df6d);
  border-bottom: 1px solid rgba(184, 223, 109, 0.3);
}

.modal-alert-error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
}

/* Body */
.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

/* No playlists */
.no-playlists-box {
  text-align: center;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-pl-icon {
  width: 58px;
  height: 58px;
  background: rgba(184, 223, 109, 0.12);
  color: var(--lime, #b8df6d);
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

.no-playlists-box h4 {
  margin: 0;
  font-size: 16px;
  color: #ffffff;
}

.no-playlists-box p {
  margin: 0 0 12px;
  font-size: 13px;
  color: #a1a1aa;
  max-width: 320px;
}

.btn-create-first {
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Picker section */
.picker-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
  color: #a1a1aa;
}

.btn-new-inline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--lime, #b8df6d);
  padding: 5px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.btn-new-inline:hover {
  background: rgba(184, 223, 109, 0.12);
  border-color: var(--lime, #b8df6d);
}

/* Inline Create Card */
.inline-create-card {
  background: #242428;
  border: 1px solid rgba(184, 223, 109, 0.25);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inline-create-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #ffffff;
}

.text-btn {
  background: transparent;
  border: 0;
  color: #a1a1aa;
  font-size: 12px;
  cursor: pointer;
}

.text-btn:hover {
  color: #ffffff;
}

.inline-inputs {
  display: flex;
  gap: 10px;
  align-items: center;
}

.inline-name-input {
  flex: 1;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  padding: 9px 13px;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
}

.inline-name-input:focus {
  border-color: var(--lime, #b8df6d);
}

.inline-switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-switch-label {
  font-size: 11px;
  color: #a1a1aa;
}

.switch-control {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.switch-control input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #3f3f46;
  border-radius: 34px;
  transition: 0.2s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .slider {
  background-color: var(--lime, #b8df6d);
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.btn-save-inline {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* List of Playlists */
.pl-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}

.pl-picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.pl-picker-row:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
}

.pl-picker-row.in-playlist {
  background: rgba(184, 223, 109, 0.08);
  border-color: rgba(184, 223, 109, 0.22);
}

.pl-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.pl-row-thumb {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.empty-thumb {
  background: #27272a;
  display: grid;
  place-items: center;
  color: #a1a1aa;
}

.pl-row-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pl-row-name {
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-row-count {
  font-size: 11px;
  color: #a1a1aa;
}

.pl-row-action {
  flex-shrink: 0;
}

.btn-already-in {
  background: rgba(184, 223, 109, 0.18);
  border: 1px solid var(--lime, #b8df6d);
  color: var(--lime, #b8df6d);
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.btn-add-to-pl {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #ffffff;
  padding: 5px 11px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}

.pl-picker-row:hover .btn-add-to-pl {
  background: var(--lime, #b8df6d);
  border-color: var(--lime, #b8df6d);
  color: #121212;
}

.saving-chip {
  font-size: 11px;
  color: var(--lime, #b8df6d);
}

.loading-state {
  text-align: center;
  color: #a1a1aa;
  padding: 20px;
  font-size: 13px;
}
</style>
