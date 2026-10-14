<template>
  <div class="playlists-page">
    <div class="row">
      <div>
        <p class="eyebrow accent">TU COLECCIÓN</p>
        <h2>Playlists & Listas</h2>
        <p class="subtext">Organiza tu música en playlists personalizadas.</p>
      </div>
      <button class="primary" @click="abrirModalNuevaPlaylist">+ Nueva playlist</button>
    </div>

    <!-- Feedback messages -->
    <div v-if="mensaje" class="alert-box alert-success">
      <span>✓</span> {{ mensaje }}
    </div>
    <div v-if="errorMensaje" class="alert-box alert-error">
      <span>✕</span> {{ errorMensaje }}
    </div>

    <!-- Modal / Drawer para Crear/Editar Playlist -->
    <div v-if="mostrarModal" class="modal-backdrop" @click.self="cerrarModal">
      <div class="modal-card panel">
        <div class="panel-head">
          <div>
            <span class="tiny">{{ editandoId ? 'MODIFICAR' : 'NUEVA LISTA' }}</span>
            <h3>{{ editandoId ? 'Editar Playlist' : 'Crear Playlist' }}</h3>
          </div>
          <button class="outline btn-sm" @click="cerrarModal">✕</button>
        </div>

        <form class="playlist-form" @submit.prevent="guardarPlaylist">
          <div class="form-group">
            <label>Nombre de la playlist *</label>
            <input
              v-model="nombre"
              type="text"
              placeholder="Ej. Noche de Estudio, Domingo Lento"
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea
              v-model="descripcion"
              rows="3"
              placeholder="¿De qué trata esta playlist?"
              maxlength="250"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Carátula de portada (JPG, PNG o WEBP, máx. 5MB)</label>
            <input
              ref="inputPortada"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="seleccionarPortada"
            />
            <div v-if="vistaPreviaPortada || portadaUrlExistente" class="playlist-cover-preview">
              <img :src="vistaPreviaPortada || portadaUrlExistente" alt="Portada de la playlist" />
              <button type="button" class="text-btn danger-text" @click="quitarPortada">
                Eliminar imagen
              </button>
            </div>
          </div>

          <label class="check-label">
            <input v-model="esPublica" type="checkbox" class="check" />
            <span>Hacer pública esta playlist</span>
          </label>

          <div class="modal-actions">
            <button type="submit" class="primary" :disabled="cargando">
              {{ cargando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Crear Playlist' }}
            </button>
            <button type="button" class="outline" :disabled="cargando" @click="cerrarModal">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para Agregar Canciones a una Playlist -->
    <div v-if="playlistGestionando" class="modal-backdrop" @click.self="playlistGestionando = null">
      <div class="modal-card modal-large panel">
        <div class="panel-head">
          <div>
            <span class="tiny">CONTENIDO DE LA PLAYLIST</span>
            <h3>{{ playlistGestionando.nombre }}</h3>
          </div>
          <button class="outline btn-sm" @click="playlistGestionando = null">✕</button>
        </div>

        <div class="manage-songs-grid">
          <!-- Canciones actuales en la playlist -->
          <div class="manage-col">
            <h4 class="col-title">Canciones en esta playlist ({{ cancionesEnPlaylist.length }})</h4>
            <div v-if="!cancionesEnPlaylist.length" class="empty-list-note">
              Esta playlist no tiene canciones aún.
            </div>
            <ul v-else class="playlist-songs-list">
              <li v-for="item in cancionesEnPlaylist" :key="item.id" class="playlist-song-item">
                <span class="song-dot">●</span>
                <div class="song-name-meta">
                  <strong>{{ item.canciones?.titulo }}</strong>
                  <small>{{ item.canciones?.artista }}</small>
                </div>
                <button
                  class="danger-btn btn-xs"
                  title="Quitar de playlist"
                  @click="quitarCancionDePlaylist(item.id)"
                >
                  ✕ Quitar
                </button>
              </li>
            </ul>
          </div>

          <!-- Selector de canciones disponibles en la biblioteca -->
          <div class="manage-col">
            <h4 class="col-title">Agregar desde tu biblioteca</h4>
            <div v-if="!cancionesDisponibles.length" class="empty-list-note">
              No tienes más canciones disponibles. Puedes agregarlas desde la pestaña <strong>Música</strong>.
            </div>
            <ul v-else class="playlist-songs-list">
              <li v-for="cancion in cancionesDisponibles" :key="cancion.id" class="playlist-song-item">
                <div class="song-name-meta">
                  <strong>{{ cancion.titulo }}</strong>
                  <small>{{ cancion.artista }}</small>
                </div>
                <button
                  class="primary btn-xs"
                  @click="agregarCancionAPlaylist(cancion.id)"
                >
                  + Agregar
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Playlists Grid -->
    <div class="playlists-container">
      <div v-if="cargando && !playlists.length" class="empty-state">
        <p>Cargando playlists desde Supabase...</p>
      </div>

      <div v-else class="playlists">
        <!-- Feature Card fija Gavify -->
        <div class="feature">
          <span class="tiny">GENERADA POR GAVIFY</span>
          <h3>Tu lado B</h3>
          <p>Una mezcla con tus temas menos escuchados. 42 canciones seleccionadas para salir de la rutina.</p>
          <button class="dark">Escuchar playlist　▶</button>
        </div>

        <!-- Tarjetas dinámicas de Supabase -->
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist"
          :style="pl.portada_url ? { backgroundImage: `linear-gradient(to bottom, rgba(38,48,39,0.85), #181d17), url(${pl.portada_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
        >
          <div class="playlist-card-top">
            <span class="tiny">{{ pl.es_publica ? 'PLAYLIST PÚBLICA' : 'PLAYLIST PRIVADA' }}</span>
            <div class="card-options">
              <button class="icon-btn" title="Editar detalles" @click="editarPlaylist(pl)">✎</button>
              <button class="icon-btn danger-icon" title="Eliminar" @click="eliminarPlaylist(pl)">✕</button>
            </div>
          </div>

          <h3>{{ pl.nombre }}</h3>
          <p>{{ pl.descripcion || 'Sin descripción' }}</p>

          <div class="card-bottom-actions">
            <span class="song-count">{{ pl.playlist_canciones?.[0]?.count || 0 }} canciones</span>
            <button class="text" @click="abrirGestionCanciones(pl)">
              Gestionar canciones →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Genre Distribution Section -->
    <section class="panel genre">
      <div>
        <span class="tiny">TUS GÉNEROS</span>
        <h3>Una escucha bastante ecléctica.</h3>
      </div>
      <div class="genre-bars">
        <div
          v-for="genre in genres"
          :key="genre.name"
          class="genre-line"
        >
          <span>{{ genre.name }}</span>
          <div>
            <i :style="{ width: genre.barWidth + '%' }"></i>
          </div>
          <b>{{ genre.percentage }}%</b>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'

// Estados generales
const playlists = ref([])
const todasLasCanciones = ref([])
const cancionesEnPlaylist = ref([])
const playlistGestionando = ref(null)

const cargando = ref(false)
const mensaje = ref('')
const errorMensaje = ref('')
const mostrarModal = ref(false)
const editandoId = ref(null)

// Campos formulario
const nombre = ref('')
const descripcion = ref('')
const esPublica = ref(false)

// Carátula de la playlist
const archivoPortada = ref(null)
const vistaPreviaPortada = ref('')
const portadaUrlExistente = ref('')
const portadaRutaExistente = ref('')
const inputPortada = ref(null)

const genres = [
  { name: 'Indie pop', barWidth: 82, percentage: 32 },
  { name: 'Alternativo', barWidth: 58, percentage: 24 },
  { name: 'R&B', barWidth: 43, percentage: 18 },
  { name: 'Electrónica', barWidth: 31, percentage: 12 }
]

// Canciones que NO están aún en la playlist seleccionada
const cancionesDisponibles = computed(() => {
  const idsEnPlaylist = new Set(cancionesEnPlaylist.value.map((item) => item.cancion_id))
  return todasLasCanciones.value.filter((c) => !idsEnPlaylist.has(c.id))
})

async function cargarPlaylists() {
  cargando.value = true
  errorMensaje.value = ''
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*, playlist_canciones(count)')
      .order('creado_en', { ascending: false })

    if (error) throw error
    playlists.value = data || []
  } catch (err) {
    errorMensaje.value = 'Error al cargar playlists: ' + err.message
  } finally {
    cargando.value = false
  }
}

async function cargarTodasLasCanciones() {
  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('id, titulo, artista, portada_url')
      .order('titulo', { ascending: true })

    if (!error && data) {
      todasLasCanciones.value = data
    }
  } catch (err) {
    console.error('Error al cargar canciones:', err)
  }
}

function abrirModalNuevaPlaylist() {
  limpiarFormulario()
  mostrarModal.value = true
}

function cerrarModal() {
  mostrarModal.value = false
  limpiarFormulario()
}

function seleccionarPortada(evento) {
  errorMensaje.value = ''
  const archivo = evento.target.files?.[0]
  if (!archivo) return

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(archivo.type)) {
    errorMensaje.value = 'La imagen debe ser JPG, PNG o WEBP.'
    evento.target.value = ''
    return
  }
  if (archivo.size > 5 * 1024 * 1024) {
    errorMensaje.value = 'La imagen no puede superar los 5 MB.'
    evento.target.value = ''
    return
  }

  if (vistaPreviaPortada.value) URL.revokeObjectURL(vistaPreviaPortada.value)
  archivoPortada.value = archivo
  vistaPreviaPortada.value = URL.createObjectURL(archivo)
}

function quitarPortada() {
  archivoPortada.value = null
  if (vistaPreviaPortada.value) URL.revokeObjectURL(vistaPreviaPortada.value)
  vistaPreviaPortada.value = ''
  portadaUrlExistente.value = ''
  portadaRutaExistente.value = ''
  if (inputPortada.value) inputPortada.value.value = ''
}

async function subirPortadaStorage() {
  if (!archivoPortada.value) return null
  const { data: { user }, error: errorUser } = await supabase.auth.getUser()
  if (errorUser || !user) throw new Error('Usuario no autenticado.')

  const ext = archivoPortada.value.name.split('.').pop().toLowerCase()
  const ruta = `${user.id}/playlists/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('musica')
    .upload(ruta, archivoPortada.value, { cacheControl: '3600', upsert: false })

  if (error) throw error
  const { data } = supabase.storage.from('musica').getPublicUrl(ruta)
  return { url: data.publicUrl, ruta }
}

async function guardarPlaylist() {
  errorMensaje.value = ''
  mensaje.value = ''

  if (!nombre.value.trim()) {
    errorMensaje.value = 'El nombre de la playlist es requerido.'
    return
  }

  cargando.value = true
  let nuevaPortada = null

  try {
    const { data: { user }, error: errorUser } = await supabase.auth.getUser()
    if (errorUser || !user) {
      throw new Error('Debes iniciar sesión con una cuenta de Supabase para crear playlists.')
    }

    nuevaPortada = await subirPortadaStorage()

    const datos = {
      usuario_id: user.id,
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim() || null,
      es_publica: esPublica.value,
      portada_url: nuevaPortada?.url ?? portadaUrlExistente.value ?? null,
      portada_ruta: nuevaPortada?.ruta ?? portadaRutaExistente.value ?? null
    }

    let errorOperacion
    if (editandoId.value) {
      const { error } = await supabase
        .from('playlists')
        .update(datos)
        .eq('id', editandoId.value)
      errorOperacion = error
    } else {
      const { error } = await supabase.from('playlists').insert(datos)
      errorOperacion = error
    }

    if (errorOperacion) {
      if (nuevaPortada?.ruta) {
        await supabase.storage.from('musica').remove([nuevaPortada.ruta])
      }
      throw errorOperacion
    }

    if (editandoId.value && nuevaPortada?.ruta && portadaRutaExistente.value) {
      await supabase.storage.from('musica').remove([portadaRutaExistente.value])
    }

    mensaje.value = editandoId.value
      ? 'Playlist actualizada con éxito.'
      : 'Playlist creada exitosamente.'
    cerrarModal()
    await cargarPlaylists()
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

function editarPlaylist(pl) {
  editandoId.value = pl.id
  nombre.value = pl.nombre
  descripcion.value = pl.descripcion || ''
  esPublica.value = pl.es_publica ?? false
  portadaUrlExistente.value = pl.portada_url || ''
  portadaRutaExistente.value = pl.portada_ruta || ''
  archivoPortada.value = null
  vistaPreviaPortada.value = ''
  mostrarModal.value = true
}

async function eliminarPlaylist(pl) {
  const ok = window.confirm(`¿Estás seguro de eliminar la playlist "${pl.nombre}"?`)
  if (!ok) return

  cargando.value = true
  errorMensaje.value = ''
  mensaje.value = ''

  try {
    const { error } = await supabase.from('playlists').delete().eq('id', pl.id)
    if (error) throw error

    if (pl.portada_ruta) {
      await supabase.storage.from('musica').remove([pl.portada_ruta])
    }

    mensaje.value = 'Playlist eliminada.'
    await cargarPlaylists()
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

// Gestión de canciones dentro de la playlist
async function abrirGestionCanciones(pl) {
  playlistGestionando.value = pl
  await cargarCancionesEnPlaylist(pl.id)
  await cargarTodasLasCanciones()
}

async function cargarCancionesEnPlaylist(playlistId) {
  try {
    const { data, error } = await supabase
      .from('playlist_canciones')
      .select('id, cancion_id, canciones(id, titulo, artista, portada_url)')
      .eq('playlist_id', playlistId)
      .order('posicion', { ascending: true })

    if (error) throw error
    cancionesEnPlaylist.value = data || []
  } catch (err) {
    console.error('Error al cargar canciones de la playlist:', err)
  }
}

async function agregarCancionAPlaylist(cancionId) {
  if (!playlistGestionando.value) return
  try {
    const { error } = await supabase.from('playlist_canciones').insert({
      playlist_id: playlistGestionando.value.id,
      cancion_id: cancionId,
      posicion: cancionesEnPlaylist.value.length
    })

    if (error) throw error
    await cargarCancionesEnPlaylist(playlistGestionando.value.id)
    await cargarPlaylists()
  } catch (err) {
    alert('Error al agregar canción: ' + err.message)
  }
}

async function quitarCancionDePlaylist(playlistCancionId) {
  try {
    const { error } = await supabase
      .from('playlist_canciones')
      .delete()
      .eq('id', playlistCancionId)

    if (error) throw error
    await cargarCancionesEnPlaylist(playlistGestionando.value.id)
    await cargarPlaylists()
  } catch (err) {
    alert('Error al quitar canción: ' + err.message)
  }
}

function limpiarFormulario() {
  nombre.value = ''
  descripcion.value = ''
  esPublica.value = false
  editandoId.value = null
  archivoPortada.value = null
  if (vistaPreviaPortada.value) URL.revokeObjectURL(vistaPreviaPortada.value)
  vistaPreviaPortada.value = ''
  portadaUrlExistente.value = ''
  portadaRutaExistente.value = ''
  if (inputPortada.value) inputPortada.value.value = ''
}

onMounted(() => {
  cargarPlaylists()
  cargarTodasLasCanciones()
})
</script>

<style scoped>
.playlists-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.subtext {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

.alert-box {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-success {
  background: rgba(184, 223, 109, 0.15);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.alert-error {
  background: rgba(232, 121, 93, 0.15);
  border: 1px solid var(--red);
  color: var(--red);
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.15s ease-out;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: #191c18;
  border: 1px solid var(--line);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.modal-large {
  max-width: 780px;
}

.playlist-form {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
}

.form-group input[type="text"],
.form-group textarea {
  background: #131612;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 12px 14px;
  font-size: 13px;
  font-family: inherit;
  border-radius: 4px;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--lime);
  outline: none;
}

.playlist-cover-preview {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.playlist-cover-preview img {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.text-btn {
  background: none;
  border: none;
  font-size: 11px;
  cursor: pointer;
}

.danger-text {
  color: var(--red);
}

/* Manage songs modal */
.manage-songs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}

.col-title {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 6px;
}

.empty-list-note {
  font-size: 12px;
  color: var(--muted);
  padding: 20px 0;
  font-style: italic;
}

.playlist-songs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-song-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: #141713;
  border: 1px solid #282f27;
  border-radius: 4px;
}

.song-dot {
  color: var(--lime);
  font-size: 8px;
}

.song-name-meta {
  flex: 1;
  min-width: 0;
}

.song-name-meta strong {
  display: block;
  font-size: 12px;
  color: var(--cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-name-meta small {
  color: var(--muted);
  font-size: 10px;
}

.btn-xs {
  padding: 4px 8px;
  font-size: 10px;
  border-radius: 3px;
}

/* Playlists Grid adjustments */
.playlist {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.playlist-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-options {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #3c443b;
  color: var(--cream);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 11px;
  cursor: pointer;
  transition: 0.15s;
}

.icon-btn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.danger-icon:hover {
  border-color: var(--red);
  color: var(--red);
}

.card-bottom-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
}

.song-count {
  font-size: 11px;
  color: var(--muted);
}

.btn-sm {
  padding: 6px 10px;
  font-size: 10px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 768px) {
  .manage-songs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
