<template>
  <div class="musica-view">
    <div class="row">
      <div>
        <p class="eyebrow accent">BIBLIOTECA & GESTIÓN</p>
        <h2>Cargar y administrar música</h2>
        <p class="subtext">Sube tus canciones, edita sus datos, añade carátulas y reprodúcelas.</p>
      </div>
      <button v-if="!mostrarFormulario" class="primary" @click="abrirNuevoFormulario">
        + Subir nueva canción
      </button>
    </div>

    <!-- Alert Messages -->
    <div v-if="mensaje" class="alert-box alert-success">
      <span>✓</span> {{ mensaje }}
    </div>
    <div v-if="errorMensaje" class="alert-box alert-error">
      <span>✕</span> {{ errorMensaje }}
    </div>

    <!-- Form Panel (Create / Edit) -->
    <section v-if="mostrarFormulario" class="panel form-panel">
      <div class="panel-head">
        <div>
          <span class="tiny">{{ editandoId ? 'MODO EDICIÓN' : 'NUEVA CANCIÓN' }}</span>
          <h3>{{ editandoId ? 'Editar detalles de la canción' : 'Subir canción a tu catálogo' }}</h3>
        </div>
        <button class="outline" type="button" @click="cancelarEdicion">
          ✕ Cerrar
        </button>
      </div>

      <form class="music-form" @submit.prevent="guardarCancion">
        <div class="form-grid">
          <!-- Left Column: Inputs -->
          <div class="form-left">
            <div class="form-group">
              <label>Título de la canción *</label>
              <input
                v-model="titulo"
                type="text"
                placeholder="Ej. Blinding Lights"
                required
                maxlength="150"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Artista / Banda *</label>
                <input
                  v-model="artista"
                  type="text"
                  placeholder="Ej. The Weeknd"
                  required
                  maxlength="120"
                />
              </div>

              <div class="form-group">
                <label>Álbum</label>
                <input
                  v-model="album"
                  type="text"
                  placeholder="Ej. After Hours"
                  maxlength="120"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Género</label>
                <select v-model="genero">
                  <option value="">Selecciona un género</option>
                  <option value="Indie Pop">Indie Pop</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Alternativo">Alternativo</option>
                  <option value="R&B">R&B</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Trap / Urbano">Trap / Urbano</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Jazz / Soul">Jazz / Soul</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div class="form-group">
                <label>Reproducciones iniciales</label>
                <input
                  v-model.number="reproducciones"
                  type="number"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <!-- Audio File Upload -->
            <div class="form-group">
              <label>Archivo de Audio (MP3, WAV, FLAC, OGG, M4A, AAC...)</label>
              <input
                ref="inputAudio"
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.opus,.wma"
                @change="seleccionarAudio"
              />
              <small class="hint">Acepta todos los formatos de audio (FLAC, MP3, WAV, etc.). Máximo 50 MB.</small>
              <div v-if="audioRutaExistente && !archivoAudio" class="existing-file-badge">
                <span>🎵 Archivo de audio ya cargado</span>
              </div>
            </div>

            <label class="check-label">
              <input v-model="activo" type="checkbox" class="check" />
              <span>Visible en la biblioteca y estadísticas</span>
            </label>
          </div>

          <!-- Right Column: Cover Image Upload & Preview -->
          <div class="form-right">
            <label class="form-label-top">Carátula de portada</label>
            <div
              class="cover-dropzone"
              :class="{ 'has-image': vistaPreviaPortada || portadaUrlExistente }"
              @click="$refs.inputPortada.click()"
            >
              <img
                v-if="vistaPreviaPortada || portadaUrlExistente"
                :src="vistaPreviaPortada || portadaUrlExistente"
                alt="Vista previa de portada"
                class="cover-preview-img"
              />
              <div v-else class="dropzone-placeholder">
                <span class="dropzone-icon">🖼</span>
                <strong>Subir imagen</strong>
                <small>JPG, PNG o WEBP (máx. 5 MB)</small>
              </div>
            </div>

            <input
              ref="inputPortada"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-file-input"
              @change="seleccionarPortada"
            />

            <button
              v-if="vistaPreviaPortada || portadaUrlExistente"
              type="button"
              class="text-btn danger-text"
              @click.stop="quitarPortada"
            >
              Quitar carátula
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="primary" :disabled="cargando">
            {{ cargando ? 'Guardando en Supabase...' : editandoId ? 'Guardar Cambios' : 'Registrar Canción' }}
          </button>
          <button type="button" class="outline" :disabled="cargando" @click="cancelarEdicion">
            Cancelar
          </button>
        </div>
      </form>
    </section>

    <!-- Music Player Bar (when audio is playing) -->
    <div v-if="cancionReproduciendo" class="player-bar panel">
      <div class="player-track">
        <span class="player-art" :style="cancionReproduciendo.portada_url ? { backgroundImage: `url(${cancionReproduciendo.portada_url})` } : {}">
          <span v-if="!cancionReproduciendo.portada_url">♪</span>
        </span>
        <div class="player-meta">
          <strong>{{ cancionReproduciendo.titulo }}</strong>
          <small>{{ cancionReproduciendo.artista }}</small>
        </div>
      </div>

      <audio
        ref="audioElement"
        :src="cancionReproduciendo.audio_url"
        controls
        autoplay
        class="audio-controls"
      ></audio>

      <button class="outline btn-sm" @click="detenerReproductor">✕</button>
    </div>

    <!-- Songs Table / List -->
    <section class="panel list-panel">
      <div class="panel-head">
        <div>
          <span class="tiny">CATÁLOGO COMPLETO</span>
          <h3>Tus canciones ({{ canciones.length }})</h3>
        </div>
        <div class="list-head-actions">
          <input
            v-model="filtroBusqueda"
            type="text"
            placeholder="Buscar por título o artista..."
            class="search-input"
          />
          <button class="outline" :disabled="cargando" @click="cargarCanciones">
            ↻ Refrescar
          </button>
        </div>
      </div>

      <div v-if="cargando && !canciones.length" class="empty-state">
        <p>Cargando tu música desde Supabase...</p>
      </div>

      <div v-else-if="!cancionesFiltradas.length" class="empty-state">
        <p v-if="filtroBusqueda">No hay canciones que coincidan con "{{ filtroBusqueda }}".</p>
        <p v-else>Aún no has agregado canciones. Haz clic en <strong>"+ Subir nueva canción"</strong> para comenzar.</p>
      </div>

      <div v-else class="songs-table-wrapper">
        <table class="songs-table">
          <thead>
            <tr>
              <th style="width: 50px;"></th>
              <th>Título y Artista</th>
              <th>Álbum</th>
              <th>Género</th>
              <th>Reproducciones</th>
              <th>Estado</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cancion in cancionesFiltradas" :key="cancion.id">
              <td>
                <div class="song-thumbnail-wrap">
                  <img
                    v-if="cancion.portada_url"
                    :src="cancion.portada_url"
                    :alt="cancion.titulo"
                    class="song-thumbnail"
                  />
                  <div v-else class="song-thumbnail song-thumb-empty">♪</div>
                  
                  <button
                    v-if="cancion.audio_url"
                    class="play-overlay-btn"
                    :title="'Reproducir ' + cancion.titulo"
                    @click="reproducirCancion(cancion)"
                  >
                    ▶
                  </button>
                </div>
              </td>
              <td>
                <div class="song-title-group">
                  <strong>{{ cancion.titulo }}</strong>
                  <small>{{ cancion.artista }}</small>
                </div>
              </td>
              <td class="muted-td">{{ cancion.album || '—' }}</td>
              <td>
                <span v-if="cancion.genero" class="genre-pill">{{ cancion.genero }}</span>
                <span v-else class="muted-td">—</span>
              </td>
              <td>
                <strong class="plays-badge">{{ cancion.reproducciones || 0 }}</strong>
              </td>
              <td>
                <span :class="['status-badge', cancion.activo ? 'status-active' : 'status-inactive']">
                  {{ cancion.activo ? 'Activa' : 'Pausada' }}
                </span>
              </td>
              <td style="text-align: right;">
                <div class="table-actions">
                  <button class="outline btn-sm" @click="editarCancion(cancion)">
                    Editar
                  </button>
                  <button class="danger-btn btn-sm" @click="eliminarCancion(cancion)">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'

// Lista y estados
const canciones = ref([])
const cargando = ref(false)
const mensaje = ref('')
const errorMensaje = ref('')
const filtroBusqueda = ref('')
const mostrarFormulario = ref(false)
const editandoId = ref(null)

// Campos del formulario
const titulo = ref('')
const artista = ref('')
const album = ref('')
const genero = ref('')
const reproducciones = ref(0)
const activo = ref(true)

// Carátula
const archivoPortada = ref(null)
const vistaPreviaPortada = ref('')
const portadaUrlExistente = ref('')
const portadaRutaExistente = ref('')
const inputPortada = ref(null)

// Audio
const archivoAudio = ref(null)
const audioUrlExistente = ref('')
const audioRutaExistente = ref('')
const inputAudio = ref(null)

// Reproductor
const cancionReproduciendo = ref(null)
const audioElement = ref(null)

// Filtrado reactivo por texto
const cancionesFiltradas = computed(() => {
  if (!filtroBusqueda.value.trim()) return canciones.value
  const query = filtroBusqueda.value.toLowerCase()
  return canciones.value.filter(
    (c) =>
      c.titulo?.toLowerCase().includes(query) ||
      c.artista?.toLowerCase().includes(query) ||
      c.album?.toLowerCase().includes(query) ||
      c.genero?.toLowerCase().includes(query)
  )
})

function abrirNuevoFormulario() {
  limpiarFormulario()
  mostrarFormulario.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function cargarCanciones() {
  cargando.value = true
  errorMensaje.value = ''
  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('*')
      .order('creado_en', { ascending: false })

    if (error) throw error
    canciones.value = data || []
  } catch (err) {
    errorMensaje.value = 'Error al cargar canciones: ' + err.message
  } finally {
    cargando.value = false
  }
}

function seleccionarPortada(evento) {
  errorMensaje.value = ''
  const archivo = evento.target.files?.[0]
  if (!archivo) return

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(archivo.type)) {
    errorMensaje.value = 'La carátula debe ser JPG, PNG o WEBP.'
    evento.target.value = ''
    return
  }
  if (archivo.size > 5 * 1024 * 1024) {
    errorMensaje.value = 'La carátula no puede superar los 5 MB.'
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

function seleccionarAudio(evento) {
  errorMensaje.value = ''
  const archivo = evento.target.files?.[0]
  if (!archivo) return

  if (archivo.size > 50 * 1024 * 1024) {
    errorMensaje.value = 'El archivo de audio no puede superar los 50 MB.'
    evento.target.value = ''
    return
  }
  archivoAudio.value = archivo
}

async function subirArchivosStorage() {
  const { data: { user }, error: errorUser } = await supabase.auth.getUser()
  if (errorUser || !user) {
    throw new Error('Debes estar autenticado para subir archivos.')
  }

  let portadaData = null
  if (archivoPortada.value) {
    const ext = archivoPortada.value.name.split('.').pop().toLowerCase()
    const ruta = `${user.id}/portadas/${crypto.randomUUID()}.${ext}`
    const { error: errSubida } = await supabase.storage
      .from('musica')
      .upload(ruta, archivoPortada.value, { cacheControl: '3600', upsert: false })

    if (errSubida) {
      throw new Error(`Error en Storage (portada): ${errSubida.message}`)
    }
    const { data: publicUrlData } = supabase.storage.from('musica').getPublicUrl(ruta)
    portadaData = { url: publicUrlData.publicUrl, ruta }
  }

  let audioData = null
  if (archivoAudio.value) {
    const ext = archivoAudio.value.name.split('.').pop().toLowerCase()
    const ruta = `${user.id}/audios/${crypto.randomUUID()}.${ext}`
    const { error: errAudio } = await supabase.storage
      .from('musica')
      .upload(ruta, archivoAudio.value, { cacheControl: '3600', upsert: false })

    if (errAudio) {
      throw new Error(`Error en Storage (audio): ${errAudio.message}`)
    }
    const { data: publicAudioData } = supabase.storage.from('musica').getPublicUrl(ruta)
    audioData = { url: publicAudioData.publicUrl, ruta }
  }

  return { portadaData, audioData }
}

async function guardarCancion() {
  errorMensaje.value = ''
  mensaje.value = ''

  if (!titulo.value.trim()) {
    errorMensaje.value = 'El título de la canción es obligatorio.'
    return
  }
  if (!artista.value.trim()) {
    errorMensaje.value = 'El nombre del artista es obligatorio.'
    return
  }

  cargando.value = true
  let subidas = null

  try {
    const { data: { user }, error: errorUser } = await supabase.auth.getUser()
    if (errorUser || !user) {
      throw new Error('Debes iniciar sesión con una cuenta de Supabase para guardar música.')
    }

    subidas = await subirArchivosStorage()

    const payload = {
      usuario_id: user.id,
      titulo: titulo.value.trim(),
      artista: artista.value.trim(),
      album: album.value.trim() || null,
      genero: genero.value || null,
      reproducciones: Number(reproducciones.value) || 0,
      activo: activo.value,
      portada_url: subidas.portadaData?.url ?? portadaUrlExistente.value ?? null,
      portada_ruta: subidas.portadaData?.ruta ?? portadaRutaExistente.value ?? null,
      audio_url: subidas.audioData?.url ?? audioUrlExistente.value ?? null,
      audio_ruta: subidas.audioData?.ruta ?? audioRutaExistente.value ?? null
    }

    let errorOperacion = null
    if (editandoId.value) {
      const { error } = await supabase
        .from('canciones')
        .update(payload)
        .eq('id', editandoId.value)
      errorOperacion = error
    } else {
      const { error } = await supabase.from('canciones').insert(payload)
      errorOperacion = error
    }

    if (errorOperacion) {
      // Revertir subidas en storage si falló la base de datos
      if (subidas.portadaData?.ruta) {
        await supabase.storage.from('musica').remove([subidas.portadaData.ruta])
      }
      if (subidas.audioData?.ruta) {
        await supabase.storage.from('musica').remove([subidas.audioData.ruta])
      }
      throw new Error(`Error en Base de Datos: ${errorOperacion.message}`)
    }

    // Si editamos y subimos nueva portada, borrar la anterior para no acumular basura
    if (editandoId.value && subidas.portadaData?.ruta && portadaRutaExistente.value) {
      await supabase.storage.from('musica').remove([portadaRutaExistente.value])
    }
    if (editandoId.value && subidas.audioData?.ruta && audioRutaExistente.value) {
      await supabase.storage.from('musica').remove([audioRutaExistente.value])
    }

    mensaje.value = editandoId.value
      ? 'Canción actualizada correctamente.'
      : 'Canción agregada a tu catálogo.'
    limpiarFormulario()
    mostrarFormulario.value = false
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

function editarCancion(cancion) {
  editandoId.value = cancion.id
  titulo.value = cancion.titulo
  artista.value = cancion.artista
  album.value = cancion.album || ''
  genero.value = cancion.genero || ''
  reproducciones.value = cancion.reproducciones || 0
  activo.value = cancion.activo ?? true

  portadaUrlExistente.value = cancion.portada_url || ''
  portadaRutaExistente.value = cancion.portada_ruta || ''
  audioUrlExistente.value = cancion.audio_url || ''
  audioRutaExistente.value = cancion.audio_ruta || ''

  archivoPortada.value = null
  vistaPreviaPortada.value = ''
  archivoAudio.value = null

  mostrarFormulario.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function eliminarCancion(cancion) {
  const ok = window.confirm(`¿Seguro que deseas eliminar "${cancion.titulo}"?`)
  if (!ok) return

  cargando.value = true
  errorMensaje.value = ''
  mensaje.value = ''

  try {
    const { error } = await supabase
      .from('canciones')
      .delete()
      .eq('id', cancion.id)

    if (error) throw error

    // Eliminar archivos asociados de storage
    const rutasBorrar = []
    if (cancion.portada_ruta) rutasBorrar.push(cancion.portada_ruta)
    if (cancion.audio_ruta) rutasBorrar.push(cancion.audio_ruta)
    if (rutasBorrar.length > 0) {
      await supabase.storage.from('musica').remove(rutasBorrar)
    }

    mensaje.value = 'Canción eliminada del catálogo.'
    if (editandoId.value === cancion.id) {
      cancelarEdicion()
    }
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = 'Error al eliminar: ' + err.message
  } finally {
    cargando.value = false
  }
}

function reproducirCancion(cancion) {
  cancionReproduciendo.value = cancion
}

function detenerReproductor() {
  cancionReproduciendo.value = null
}

function limpiarFormulario() {
  titulo.value = ''
  artista.value = ''
  album.value = ''
  genero.value = ''
  reproducciones.value = 0
  activo.value = true
  editandoId.value = null

  archivoPortada.value = null
  if (vistaPreviaPortada.value) URL.revokeObjectURL(vistaPreviaPortada.value)
  vistaPreviaPortada.value = ''
  portadaUrlExistente.value = ''
  portadaRutaExistente.value = ''

  archivoAudio.value = null
  audioUrlExistente.value = ''
  audioRutaExistente.value = ''

  if (inputPortada.value) inputPortada.value.value = ''
  if (inputAudio.value) inputAudio.value.value = ''
}

function cancelarEdicion() {
  limpiarFormulario()
  mostrarFormulario.value = false
  errorMensaje.value = ''
}

onMounted(() => {
  cargarCanciones()
})
</script>

<style scoped>
.musica-view {
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

/* Form Styles */
.form-panel {
  margin-top: 10px;
  animation: fadeIn 0.2s ease-out;
}

.music-form {
  margin-top: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 28px;
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label,
.form-label-top {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  background: #141713;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 12px 14px;
  font-size: 13px;
  font-family: inherit;
  border-radius: 4px;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--lime);
  outline: none;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.hint {
  color: #6d756b;
  font-size: 10px;
}

.existing-file-badge {
  font-size: 11px;
  color: var(--lime);
  background: #20271e;
  padding: 6px 10px;
  border-radius: 4px;
  margin-top: 6px;
  display: inline-block;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 10px;
}

/* Cover Dropzone */
.cover-dropzone {
  width: 100%;
  aspect-ratio: 1;
  border: 2px dashed #3a4136;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #151814;
  overflow: hidden;
  transition: border-color 0.2s;
  margin-top: 6px;
}

.cover-dropzone:hover {
  border-color: var(--lime);
}

.cover-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropzone-placeholder {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
}

.dropzone-icon {
  font-size: 32px;
}

.dropzone-placeholder strong {
  font-size: 12px;
  color: var(--cream);
}

.dropzone-placeholder small {
  font-size: 10px;
  color: var(--muted);
}

.hidden-file-input {
  display: none;
}

.text-btn {
  background: none;
  border: none;
  font-size: 11px;
  cursor: pointer;
  margin-top: 8px;
  padding: 4px 0;
}

.danger-text {
  color: var(--red);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

/* Player Bar */
.player-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: #20271e;
  border: 1px solid var(--lime);
  padding: 14px 20px;
}

.player-track {
  display: flex;
  align-items: center;
  gap: 14px;
}

.player-art {
  width: 44px;
  height: 44px;
  background: #141814;
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  font-size: 20px;
  color: var(--lime);
  border-radius: 4px;
}

.player-meta strong {
  display: block;
  font-size: 13px;
  color: var(--cream);
}

.player-meta small {
  color: var(--muted);
  font-size: 11px;
}

.audio-controls {
  flex: 1;
  max-width: 500px;
  height: 34px;
  filter: invert(0.85) hue-rotate(180deg);
}

/* Table styles */
.list-panel {
  margin-top: 8px;
}

.list-head-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  background: #141713;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 8px 12px;
  font-size: 11px;
  border-radius: 4px;
  width: 230px;
}

.search-input:focus {
  border-color: var(--lime);
  outline: none;
}

.empty-state {
  padding: 48px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.songs-table-wrapper {
  overflow-x: auto;
  margin-top: 18px;
}

.songs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.songs-table th {
  text-align: left;
  padding: 12px 14px;
  color: #6f786d;
  font-size: 9px;
  letter-spacing: 0.14em;
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
}

.songs-table td {
  padding: 14px;
  border-bottom: 1px solid #282d27;
  vertical-align: middle;
}

.song-thumbnail-wrap {
  position: relative;
  width: 42px;
  height: 42px;
}

.song-thumbnail {
  width: 42px;
  height: 42px;
  border-radius: 4px;
  object-fit: cover;
  display: block;
}

.song-thumb-empty {
  background: #252b23;
  display: grid;
  place-items: center;
  color: var(--lime);
  font-size: 16px;
}

.play-overlay-btn {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  color: var(--lime);
  border: none;
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.15s;
  cursor: pointer;
}

.song-thumbnail-wrap:hover .play-overlay-btn {
  opacity: 1;
}

.song-title-group strong {
  display: block;
  font-size: 13px;
  color: var(--cream);
}

.song-title-group small {
  color: var(--muted);
  font-size: 11px;
}

.muted-td {
  color: var(--muted);
}

.genre-pill {
  font-size: 10px;
  background: #242c22;
  color: var(--lime);
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid #364233;
}

.plays-badge {
  color: var(--yellow);
  font-family: Georgia, serif;
  font-size: 14px;
}

.status-badge {
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 3px;
  font-weight: 700;
}

.status-active {
  background: rgba(184, 223, 109, 0.15);
  color: var(--lime);
}

.status-inactive {
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 10px;
}

.danger-btn {
  background: none;
  border: 1px solid rgba(232, 121, 93, 0.4);
  color: var(--red);
  cursor: pointer;
  transition: 0.15s;
}

.danger-btn:hover {
  background: rgba(232, 121, 93, 0.15);
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
