<template>
  <div class="musica-view">
    <!-- Cabecera limpia enfocada en búsqueda multi-plataforma -->
    <div class="row head-row">
      <div>
        <p class="eyebrow accent">
          CATÁLOGO DE {{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }}
        </p>
        <h2>Explorar y Buscar Música en APIs</h2>
        <p class="subtext">
          Busca canciones en tiempo real eligiendo la plataforma de origen (Spotify, YouTube Music o YouTube), escúchalas completas y agrégalas con el botón +.
        </p>
      </div>
    </div>

    <!-- Mensajes de Confirmación y Error -->
    <div v-if="mensaje" class="alert-box alert-success">
      <AppIcon name="check" :size="16" />
      <div class="alert-text">{{ mensaje }}</div>
      <button class="alert-close" @click="mensaje = ''">
        <AppIcon name="close" :size="15" />
      </button>
    </div>
    <div v-if="errorMensaje" class="alert-box alert-error">
      <AppIcon name="alert" :size="16" />
      <div class="alert-text">{{ errorMensaje }}</div>
      <button class="alert-close" @click="errorMensaje = ''">
        <AppIcon name="close" :size="15" />
      </button>
    </div>

    <!-- ======================================================================= -->
    <!-- PANEL 1: BUSCADOR AUTOMÁTICO EN VIVO (SPOTIFY, YOUTUBE MUSIC, YOUTUBE)  -->
    <!-- ======================================================================= -->
    <section class="panel extractor-panel">
      <div class="panel-head">
        <div>
          <span class="tiny accent">BUSCADOR MULTI-PLATAFORMA EN TIEMPO REAL</span>
          <h3>Elige la plataforma y busca cualquier canción o artista</h3>
        </div>
      </div>

      <!-- Selector de Plataforma para elegir de qué plataforma quieres la canción -->
      <div class="platform-tabs">
        <button
          v-for="plat in plataformasExtractor"
          :key="plat.id"
          class="plat-tab"
          :class="{ active: plataformaActiva === plat.id }"
          @click="cambiarPlataformaExtractor(plat.id)"
        >
          <AppIcon :name="plat.id" :size="18" />
          <span>{{ plat.nombre }}</span>
        </button>
      </div>

      <!-- Sub-modos: Búsqueda Automática en Vivo vs Playlists Conectadas -->
      <div class="extractor-mode-bar">
        <button
          class="mode-pill"
          :class="{ active: modoExtractor === 'busqueda' }"
          @click="modoExtractor = 'busqueda'"
        >
          <AppIcon name="search" :size="14" />
          <span>Buscar canciones en {{ nombrePlataformaActiva }}</span>
        </button>
        <button
          class="mode-pill"
          :class="{ active: modoExtractor === 'playlists' }"
          @click="modoExtractor = 'playlists'"
        >
          <AppIcon name="playlist" :size="14" />
          <span>Playlists conectadas ({{ catalogoPlataformaActiva.playlists.length }})</span>
        </button>
      </div>

      <!-- Modo A: Búsqueda automática al escribir -->
      <div v-if="modoExtractor === 'busqueda'" class="extractor-search-area">
        <div class="search-api-bar">
          <div class="live-input-box">
            <AppIcon name="search" :size="16" />
            <input
              v-model="consultaApi"
              type="text"
              :placeholder="`Buscar canción o artista en ${nombrePlataformaActiva}...`"
            />
            <span v-if="buscandoApi" class="live-status">Buscando...</span>
          </div>
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
          <p>Buscando automáticamente en {{ nombrePlataformaActiva }}...</p>
        </div>

        <div v-else-if="resultadosApi.length" class="api-results-list">
          <div class="api-results-head">
            <span class="tiny">RESULTADOS EN {{ nombrePlataformaActiva.toUpperCase() }} ({{ resultadosApi.length }})</span>
          </div>

          <div class="api-cards-grid">
            <div v-for="item in resultadosApi" :key="item.external_id" class="api-track-card">
              <img v-if="item.portada_url" :src="item.portada_url" :alt="item.titulo" class="api-track-img" />
              <div v-else class="api-track-img empty">
                <AppIcon name="music" :size="18" />
              </div>
              <div class="api-track-info">
                <div class="api-track-title-wrap">
                  <MarqueeText :text="item.titulo" class="api-track-title" />
                </div>
                <div class="api-track-artist-wrap">
                  <MarqueeText :text="item.artista + (item.album ? ' • ' + item.album : '')" class="api-track-artist" />
                </div>
                <div class="api-track-badges">
                  <span :class="['origin-badge', `origin-${item.plataforma_origen || plataformaActiva}`]">
                    {{ etiquetaPlataforma(item.plataforma_origen || plataformaActiva) }}
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

      <!-- Modo B: Extracción de Playlists Conectadas -->
      <div v-else class="extractor-playlists-area">
        <div class="synced-playlists-grid">
          <div
            v-for="pl in catalogoPlataformaActiva.playlists"
            :key="pl.externalId"
            class="synced-pl-card"
          >
            <div class="synced-pl-head">
              <div>
                <span class="tiny accent">{{ nombrePlataformaActiva.toUpperCase() }} PLAYLIST</span>
                <h4>{{ pl.nombre }}</h4>
                <p>{{ pl.descripcion }}</p>
              </div>
              <button class="primary btn-sm" @click="importarPlaylistCompleta(pl)">
                <AppIcon name="bolt" :size="14" />
                <span>Importar lista ({{ pl.canciones.length }})</span>
              </button>
            </div>
            <ul class="synced-pl-tracks">
              <li v-for="(tr, idx) in pl.canciones" :key="idx">
                <span>{{ tr.titulo }} — <small>{{ tr.artista }} ({{ tr.album }})</small></span>
                <div class="synced-track-btns">
                  <button class="icon-play-btn" title="Escuchar entera" @click="reproducirCancion(tr, pl.canciones)">
                    <AppIcon name="play" :size="13" />
                  </button>
                  <button
                    class="icon-add-btn"
                    title="Agregar canción a una playlist (+)"
                    @click="abrirModalAgregar(tr)"
                  >
                    <AppIcon name="plus" :size="15" />
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================= -->
    <!-- LISTADO PRINCIPAL CON BÚSQUEDA AUTOMÁTICA, FILTROS Y ORDENAMIENTO       -->
    <!-- ======================================================================= -->
    <section class="panel list-panel">
      <div class="panel-head list-header-wrap">
        <div>
          <span class="tiny">BIBLIOTECA DE {{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }}</span>
          <h3>Catálogo de canciones ({{ cancionesFiltradasYOrdenadas.length }} de {{ canciones.length }})</h3>
        </div>

        <div class="filters-toolbar">
          <!-- Búsqueda automática al escribir -->
          <div class="catalog-search-pill">
            <AppIcon name="search" :size="15" />
            <input
              v-model="filtroBusqueda"
              type="text"
              placeholder="Buscar por nombre, artista o álbum..."
            />
          </div>

          <!-- Filtro por Plataforma de Origen con diseño personalizado -->
          <CustomSelect
            v-model="filtroPlataforma"
            :options="opcionesFiltroPlataforma"
          />

          <!-- Filtro por Género con diseño personalizado -->
          <CustomSelect
            v-model="filtroGenero"
            :options="opcionesFiltroGenero"
          />

          <!-- Opción para Ordenar la Información con diseño personalizado -->
          <CustomSelect
            v-model="criterioOrden"
            :options="opcionesOrden"
            variant="accent"
          />

          <button class="outline btn-sm" @click="limpiarFiltros">Limpiar</button>
        </div>
      </div>

      <div v-if="cargando && !canciones.length" class="empty-state">
        <p>Cargando canciones de la base de datos...</p>
      </div>

      <div v-else-if="!cancionesFiltradasYOrdenadas.length" class="empty-state">
        <p>No se encontraron canciones con los filtros seleccionados.</p>
      </div>

      <div v-else class="songs-table-wrapper">
        <table class="songs-table">
          <thead>
            <tr>
              <th style="width: 58px;">Play</th>
              <th>Título y Artista</th>
              <th>Origen</th>
              <th>Álbum</th>
              <th>Género</th>
              <th>Duración</th>
              <th>Plays</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cancion in cancionesFiltradasYOrdenadas"
              :key="cancion.id"
              :class="{ 'playing-row': player.currentTrack.value?.id === cancion.id }"
            >
              <td>
                <div class="song-thumbnail-wrap" @click="reproducirCancion(cancion, cancionesFiltradasYOrdenadas)">
                  <img
                    v-if="cancion.portada_url"
                    :src="cancion.portada_url"
                    :alt="cancion.titulo"
                    class="song-thumbnail"
                  />
                  <div v-else class="song-thumbnail song-thumb-empty">
                    <AppIcon name="music" :size="16" />
                  </div>

                  <button
                    class="play-overlay-btn"
                    :title="'Escuchar canción entera: ' + cancion.titulo"
                  >
                    <AppIcon :name="player.currentTrack.value?.id === cancion.id && player.isPlaying.value ? 'pause' : 'play'" :size="15" />
                  </button>
                </div>
              </td>
              <td>
                <div class="song-title-group">
                  <strong class="clickable-title" @click="reproducirCancion(cancion, cancionesFiltradasYOrdenadas)">
                    {{ cancion.titulo }}
                  </strong>
                  <small>{{ cancion.artista }}</small>
                </div>
              </td>
              <td>
                <span :class="['origin-badge', `origin-${cancion.plataforma_origen || 'spotify'}`]">
                  {{ etiquetaPlataforma(cancion.plataforma_origen) }}
                </span>
              </td>
              <td class="muted-td">{{ cancion.album || 'Single' }}</td>
              <td>
                <span v-if="cancion.genero" class="genre-pill">{{ cancion.genero }}</span>
                <span v-else class="muted-td">—</span>
              </td>
              <td class="muted-td">{{ formatearDuracion(cancion.duracion_segundos) }}</td>
              <td>
                <strong class="plays-badge">{{ cancion.reproducciones || 0 }}</strong>
              </td>
              <td style="text-align: right;">
                <div class="table-actions">
                  <button class="outline btn-sm" @click="verDetalleCancion(cancion)">
                    Detalle
                  </button>
                  <button
                    class="danger-btn btn-sm"
                    @click="solicitarConfirmacionEliminar(cancion)"
                  >
                    <AppIcon name="trash" :size="13" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ======================================================================= -->
    <!-- MODAL DE DETALLE DE CANCIÓN                                             -->
    <!-- ======================================================================= -->
    <div v-if="cancionDetalle" class="modal-backdrop" @click.self="cancionDetalle = null">
      <div class="modal-card panel detail-modal">
        <div class="panel-head">
          <div>
            <span class="tiny accent">FICHA DE CANCIÓN</span>
            <h3>{{ cancionDetalle.titulo }}</h3>
          </div>
          <button class="outline btn-sm" @click="cancionDetalle = null">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <div class="detail-body">
          <div class="detail-top">
            <img
              v-if="cancionDetalle.portada_url"
              :src="cancionDetalle.portada_url"
              :alt="cancionDetalle.titulo"
              class="detail-cover"
            />
            <div class="detail-meta-grid">
              <div><small>ARTISTA / AUTOR</small><strong>{{ cancionDetalle.artista }}</strong></div>
              <div><small>ÁLBUM</small><strong>{{ cancionDetalle.album || 'Single' }}</strong></div>
              <div><small>GÉNERO</small><strong>{{ cancionDetalle.genero || 'Sin clasificar' }}</strong></div>
              <div><small>DURACIÓN</small><strong>{{ formatearDuracion(cancionDetalle.duracion_segundos) }}</strong></div>
              <div><small>PLATAFORMA ORIGEN</small><strong>{{ etiquetaPlataforma(cancionDetalle.plataforma_origen) }}</strong></div>
              <div><small>ORGANIZACIÓN</small><strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong></div>
            </div>
          </div>

          <div v-if="cancionDetalle.youtube_video_id && !cancionDetalle.youtube_video_id.startsWith('yt_')" class="youtube-embed-box">
            <p class="tiny">VIDEO OFICIAL YOUTUBE ({{ cancionDetalle.youtube_video_id }})</p>
            <iframe
              width="100%"
              height="220"
              :src="`https://www.youtube.com/embed/${cancionDetalle.youtube_video_id}`"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              style="border-radius: 14px;"
            ></iframe>
          </div>
        </div>

        <div class="form-actions">
          <button class="primary" @click="reproducirCancion(cancionDetalle, cancionesFiltradasYOrdenadas)">
            <AppIcon name="play" :size="15" />
            <span>Escuchar canción entera</span>
          </button>
          <button class="outline" @click="cancionDetalle = null">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- MODAL DE CONFIRMACIÓN ANTES DE ELIMINAR CANCIÓN                         -->
    <!-- ======================================================================= -->
    <div v-if="cancionPorEliminar" class="modal-backdrop" @click.self="cancionPorEliminar = null">
      <div class="modal-card panel confirm-modal">
        <span class="tiny danger-text">CONFIRMACIÓN</span>
        <h3>¿Eliminar "{{ cancionPorEliminar.titulo }}" de tu biblioteca?</h3>
        <p class="subtext">
          Esta acción eliminará la canción de <strong>{{ cancionPorEliminar.artista }}</strong> y la quitará de las playlists donde esté incluida.
        </p>
        <div class="form-actions">
          <button class="danger-btn" :disabled="cargando" @click="confirmarEliminacion">
            <AppIcon name="trash" :size="14" />
            <span>Sí, eliminar canción</span>
          </button>
          <button class="outline" @click="cancionPorEliminar = null">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL PARA AGREGAR A PLAYLIST CON SELECTOR DE LISTAS O CREAR UNA NUEVA -->
    <AddToPlaylistModal
      :is-open="mostrarModalAgregar"
      :track="trackParaAgregar"
      @close="mostrarModalAgregar = false"
      @song-added="onCancionAgregada"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import AddToPlaylistModal from '@/components/AddToPlaylistModal.vue'
import MarqueeText from '@/components/MarqueeText.vue'
import { useAuth } from '@/services/auth'
import { dbService } from '@/services/db'
import { musicApiService } from '@/services/musicApis'
import { usePlayer } from '@/services/player'

const auth = useAuth()
const player = usePlayer()

// Estado principal
const canciones = ref([])
const playlistsOrg = ref([])
const cargando = ref(false)
const mensaje = ref('')
const errorMensaje = ref('')

// Modal Agregar a Playlist
const mostrarModalAgregar = ref(false)
const trackParaAgregar = ref(null)

function abrirModalAgregar(track) {
  trackParaAgregar.value = track
  mostrarModalAgregar.value = true
}

function onCancionAgregada({ track, playlist }) {
  mensaje.value = `✓ "${track.titulo}" guardada en "${playlist.nombre}" y sincronizada en la base de datos.`
  cargarCanciones()
}

// Filtros, Búsqueda y Ordenamiento
const filtroBusqueda = ref('')
const filtroPlataforma = ref('todas')
const filtroGenero = ref('todos')
const filtroEstado = ref('todos')
const criterioOrden = ref('fecha_desc')

const opcionesFiltroPlataforma = [
  { value: 'todas', label: 'Plataforma: Todas' },
  { value: 'spotify', label: 'Spotify', dot: '#1ed760' },
  { value: 'youtube_music', label: 'YT Music', dot: '#ff4e45' },
  { value: 'youtube', label: 'YouTube', dot: '#ff0000' }
]

const opcionesFiltroGenero = computed(() => {
  return [
    { value: 'todos', label: 'Género: Todos' },
    ...generosDisponibles.value.map(g => ({ value: g, label: g }))
  ]
})

const opcionesOrden = [
  { value: 'fecha_desc', label: 'Ordenar: Más recientes' },
  { value: 'titulo_asc', label: 'Ordenar: Nombre (A - Z)' },
  { value: 'titulo_desc', label: 'Ordenar: Nombre (Z - A)' },
  { value: 'reproducciones_desc', label: 'Ordenar: Más reproducidas' }
]

// Formulario CRUD
const mostrarFormulario = ref(false)
const editandoId = ref(null)
const modoCargaManual = ref('manual_admin')
const titulo = ref('')
const artista = ref('')
const album = ref('')
const genero = ref('Pop')
const duracionSegundos = ref(215)
const reproducciones = ref(0)
const activo = ref(true)

// Archivos de portada y audio
const archivoPortada = ref(null)
const vistaPreviaPortada = ref('')
const portadaUrlExistente = ref('')
const inputPortada = ref(null)

const archivoAudio = ref(null)
const audioUrlExistente = ref('')
const inputAudio = ref(null)

// Extractor / Buscador Automático de APIs (Siempre activo)
const mostrarExtractor = ref(true)
const plataformaActiva = ref('spotify')
const modoExtractor = ref('busqueda')
const consultaApi = ref('Coldplay')
const buscandoApi = ref(false)
const resultadosApi = ref([])
const playlistDestinoExtraccion = ref('')
let apiSearchDebounce = null

const plataformasExtractor = [
  { id: 'spotify', nombre: 'Spotify', color: '#1ed760' },
  { id: 'youtube_music', nombre: 'YouTube Music', color: '#ff4e45' },
  { id: 'youtube', nombre: 'YouTube', color: '#ff0000' }
]

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

// Modales de Detalle y Confirmación
const cancionDetalle = ref(null)
const cancionPorEliminar = ref(null)

const nombrePlataformaActiva = computed(() => {
  const found = plataformasExtractor.find(p => p.id === plataformaActiva.value)
  return found ? found.nombre : 'Spotify'
})

const catalogoPlataformaActiva = computed(() => {
  return musicApiService.getSyncedCatalogByPlatform(plataformaActiva.value)
})

const generosDisponibles = computed(() => {
  const set = new Set(canciones.value.map(c => c.genero).filter(Boolean))
  return Array.from(set).sort()
})

// Filtrado y Ordenamiento Reactivo Automático
const cancionesFiltradasYOrdenadas = computed(() => {
  let lista = [...canciones.value]

  if (filtroBusqueda.value.trim()) {
    const q = filtroBusqueda.value.toLowerCase().trim()
    lista = lista.filter(
      c =>
        c.titulo?.toLowerCase().includes(q) ||
        c.artista?.toLowerCase().includes(q) ||
        c.album?.toLowerCase().includes(q)
    )
  }

  if (filtroPlataforma.value !== 'todas') {
    lista = lista.filter(c => (c.plataforma_origen || 'spotify') === filtroPlataforma.value)
  }

  if (filtroGenero.value !== 'todos') {
    lista = lista.filter(c => c.genero === filtroGenero.value)
  }

  if (filtroEstado.value === 'activas') {
    lista = lista.filter(c => c.activo === true)
  } else if (filtroEstado.value === 'pausadas') {
    lista = lista.filter(c => c.activo === false)
  }

  lista.sort((a, b) => {
    if (criterioOrden.value === 'fecha_desc') {
      return new Date(b.creado_en) - new Date(a.creado_en)
    }
    if (criterioOrden.value === 'titulo_asc') {
      return (a.titulo || '').localeCompare(b.titulo || '')
    }
    if (criterioOrden.value === 'titulo_desc') {
      return (b.titulo || '').localeCompare(a.titulo || '')
    }
    if (criterioOrden.value === 'reproducciones_desc') {
      return (b.reproducciones || 0) - (a.reproducciones || 0)
    }
    return 0
  })

  return lista
})

function limpiarFiltros() {
  filtroBusqueda.value = ''
  filtroPlataforma.value = 'todas'
  filtroGenero.value = 'todos'
  filtroEstado.value = 'todos'
  criterioOrden.value = 'fecha_desc'
}

function etiquetaPlataforma(origen) {
  const map = {
    spotify: 'Spotify',
    youtube_music: 'YT Music',
    youtube: 'YouTube'
  }
  return map[origen] || 'Spotify'
}

function formatearDuracion(seg = 0) {
  const total = Number(seg) || 210
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function cargarCanciones() {
  cargando.value = true
  errorMensaje.value = ''
  try {
    canciones.value = await dbService.getCanciones()
    playlistsOrg.value = await dbService.getPlaylists()
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    cargando.value = false
  }
}

function abrirExtractorApi() {
  mostrarFormulario.value = false
  mostrarExtractor.value = true
  if (!resultadosApi.value.length) {
    ejecutarBusquedaApi()
  }
}

function cambiarPlataformaExtractor(platId) {
  plataformaActiva.value = platId
}

function buscarSugerencia(termino) {
  consultaApi.value = termino
}

async function ejecutarBusquedaApi() {
  const q = consultaApi.value.trim()
  if (!q) {
    resultadosApi.value = []
    return
  }
  buscandoApi.value = true
  errorMensaje.value = ''
  try {
    resultadosApi.value = await musicApiService.searchTracksLive(
      q,
      plataformaActiva.value
    )
  } catch (err) {
    errorMensaje.value = 'Error al consultar API: ' + err.message
  } finally {
    buscandoApi.value = false
  }
}

// Búsqueda automática instantánea al escribir en el buscador de API
watch([consultaApi, plataformaActiva], () => {
  if (apiSearchDebounce) clearTimeout(apiSearchDebounce)
  apiSearchDebounce = setTimeout(() => {
    if (mostrarExtractor.value && modoExtractor.value === 'busqueda') {
      ejecutarBusquedaApi()
    }
  }, 260)
})

async function extraerCancionIndividual(track) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const extraida = await dbService.extractCancionFromApi(
      { ...track, plataforma_origen: track.plataforma_origen || plataformaActiva.value },
      playlistDestinoExtraccion.value || null
    )
    mensaje.value = `Canción "${extraida.titulo}" (${extraida.artista}) guardada en la base de datos.`
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function extraerTodosLosResultados() {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    let count = 0
    for (const item of resultadosApi.value.slice(0, 6)) {
      await dbService.extractCancionFromApi(
        { ...item, plataforma_origen: plataformaActiva.value },
        playlistDestinoExtraccion.value || null
      )
      count++
    }
    mensaje.value = `Se guardaron ${count} canciones en la base de datos.`
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function importarPlaylistCompleta(plTemplate) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const nuevaPl = await dbService.extractPlaylistFromApi(plTemplate)
    mensaje.value = `Playlist "${nuevaPl.nombre}" y sus ${plTemplate.canciones.length} canciones guardadas en la base de datos.`
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function abrirNuevoFormulario(origen = 'manual_admin') {
  limpiarFormulario()
  modoCargaManual.value = origen
  if (auth.isProductor.value) {
    artista.value = auth.currentUser.value?.nombre || ''
    genero.value = 'Electrónica'
  }
  mostrarExtractor.value = false
  mostrarFormulario.value = true
}

function seleccionarPortada(evento) {
  errorMensaje.value = ''
  const archivo = evento.target.files?.[0]
  if (!archivo) return

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(archivo.type)) {
    errorMensaje.value = 'Formato inválido: La carátula debe ser JPG, PNG o WEBP.'
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
  audioUrlExistente.value = URL.createObjectURL(archivo)
}

async function guardarCancion() {
  errorMensaje.value = ''
  mensaje.value = ''
  cargando.value = true

  try {
    const payload = {
      titulo: titulo.value,
      artista: artista.value,
      album: album.value,
      genero: genero.value,
      duracion_segundos: duracionSegundos.value,
      reproducciones: reproducciones.value,
      activo: activo.value,
      plataforma_origen: auth.isProductor.value ? 'propia' : modoCargaManual.value,
      es_produccion_propia: auth.isProductor.value,
      portada_url: vistaPreviaPortada.value || portadaUrlExistente.value || null,
      audio_url: audioUrlExistente.value || null
    }

    if (editandoId.value) {
      await dbService.updateCancion(editandoId.value, payload)
      mensaje.value = `Los datos de "${titulo.value}" fueron actualizados en la base de datos.`
    } else {
      const creada = await dbService.createCancionManual(payload)
      mensaje.value = `Canción "${creada.titulo}" agregada y guardada en la base de datos.`
    }

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
  errorMensaje.value = ''
  mensaje.value = ''
  editandoId.value = cancion.id
  titulo.value = cancion.titulo
  artista.value = cancion.artista
  album.value = cancion.album || ''
  genero.value = cancion.genero || 'Pop'
  duracionSegundos.value = cancion.duracion_segundos || 210
  reproducciones.value = cancion.reproducciones || 0
  activo.value = cancion.activo ?? true
  portadaUrlExistente.value = cancion.portada_url || ''
  audioUrlExistente.value = cancion.audio_url || ''
  mostrarExtractor.value = false
  mostrarFormulario.value = true
}

function solicitarConfirmacionEliminar(cancion) {
  cancionPorEliminar.value = cancion
}

async function confirmarEliminacion() {
  if (!cancionPorEliminar.value) return
  cargando.value = true
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const nombreBorrado = cancionPorEliminar.value.titulo
    await dbService.deleteCancion(cancionPorEliminar.value.id)
    mensaje.value = `La canción "${nombreBorrado}" fue eliminada de la base de datos.`
    cancionPorEliminar.value = null
    await cargarCanciones()
  } catch (err) {
    errorMensaje.value = err.message
    cancionPorEliminar.value = null
  } finally {
    cargando.value = false
  }
}

function verDetalleCancion(cancion) {
  cancionDetalle.value = cancion
}

function reproducirCancion(cancion, listaContexto = null) {
  player.playTrack(cancion, listaContexto)
}

function limpiarFormulario() {
  titulo.value = ''
  artista.value = ''
  album.value = ''
  genero.value = 'Pop'
  duracionSegundos.value = 215
  reproducciones.value = 0
  activo.value = true
  editandoId.value = null
  archivoPortada.value = null
  vistaPreviaPortada.value = ''
  portadaUrlExistente.value = ''
  archivoAudio.value = null
  audioUrlExistente.value = ''
}

function cancelarEdicion() {
  limpiarFormulario()
  mostrarFormulario.value = false
  errorMensaje.value = ''
}

watch(
  () => [auth.currentUser.value?.id, auth.currentUser.value?.organizacion_id],
  () => {
    mostrarFormulario.value = false
    cargarCanciones()
  }
)

onMounted(() => {
  cargarCanciones()
  ejecutarBusquedaApi()
})
</script>

<style scoped>
.musica-view {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.head-row {
  gap: 16px;
  flex-wrap: wrap;
}

.top-action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.btn-plus-circle {
  width: 42px;
  height: 42px;
  padding: 0 !important;
  border-radius: 50% !important;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
}

.btn-extractor {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(184, 223, 109, 0.1);
  border: 1px solid var(--lime);
  color: var(--lime);
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-extractor:hover {
  background: var(--lime);
  color: #152016;
}

.btn-producer {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--yellow);
  color: #1c180c;
  border: 0;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
}

.subtext {
  color: var(--muted);
  font-size: 13px;
  margin-top: 6px;
  max-width: 680px;
  line-height: 1.5;
}

.alert-box {
  padding: 13px 18px;
  border-radius: 14px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-text {
  flex: 1;
}

.alert-close {
  background: none;
  border: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
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

/* Extractor API Styles */
.extractor-panel {
  border-color: rgba(184, 223, 109, 0.45);
  background: #161b16;
  border-radius: 18px;
}

.platform-tabs {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.plat-tab {
  background: #111411;
  border: 1px solid #2d342c;
  padding: 10px 18px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.plat-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.plat-tab.active {
  border-color: var(--lime);
  background: #222a21;
  color: #ffffff;
}

.extractor-mode-bar {
  display: flex;
  gap: 10px;
  margin: 14px 0;
  flex-wrap: wrap;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: 1px solid #323931;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--muted);
  border-radius: 999px;
}

.mode-pill.active {
  background: var(--lime);
  color: #131c13;
  border-color: var(--lime);
  font-weight: 700;
}

.search-api-bar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
}

.live-input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #111411;
  border: 1px solid var(--line);
  padding: 11px 18px;
  border-radius: 999px;
  color: #969e95;
}

.live-input-box input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
}

.live-status {
  font-size: 11px;
  color: var(--lime);
  font-weight: 700;
}

.playlist-select-dest {
  background: #111411;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 11px 16px;
  font-size: 12px;
  border-radius: 999px;
}

.quick-search-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.chip-btn {
  background: #20251f;
  border: 1px solid #333b32;
  color: var(--cream);
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 999px;
}

.chip-btn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.api-results-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 18px 0 12px;
}

.api-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.api-track-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #121512;
  border: 1px solid #282f27;
  border-radius: 14px;
}

.api-track-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.api-track-img.empty {
  display: grid;
  place-items: center;
  background: #212721;
  color: var(--lime);
}

.api-track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.api-track-title-wrap,
.api-track-artist-wrap {
  min-width: 0;
  max-width: 100%;
}

.api-track-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.api-track-artist {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.api-track-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.api-track-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(30, 215, 96, 0.15);
  border: 1px solid rgba(30, 215, 96, 0.45);
  color: #1ed760;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.icon-play-btn:hover {
  background: #1ed760;
  color: #0b0d0b;
  transform: scale(1.06);
}

.icon-add-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--lime);
  border: 0;
  color: #111912;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(184, 223, 109, 0.25);
}

.icon-add-btn:hover {
  background: #c9ec84;
  transform: scale(1.08);
}

.synced-playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.synced-pl-card {
  background: #121512;
  border: 1px solid #2b322a;
  padding: 18px;
  border-radius: 16px;
}

.synced-pl-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid #252b24;
  padding-bottom: 12px;
}

.synced-pl-head h4 {
  margin: 4px 0;
  font-size: 16px;
}

.synced-pl-head p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.synced-pl-tracks {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.synced-pl-tracks li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 8px 12px;
  background: #181c18;
  border-radius: 10px;
}

.synced-track-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Form Styles */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 24px;
  margin-top: 16px;
}

.form-group {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label,
.form-label-top {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  background: #121512;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 12px 15px;
  font-size: 13px;
  border-radius: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-row.three-cols {
  grid-template-columns: 1.2fr 0.9fr 0.9fr;
}

.hint {
  color: #7c857a;
  font-size: 11px;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 6px;
}

.cover-dropzone {
  width: 100%;
  aspect-ratio: 1;
  border: 2px dashed #3a4136;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #141714;
  overflow: hidden;
  margin-top: 6px;
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
  gap: 8px;
  padding: 16px;
  color: var(--muted);
}

.hidden-file-input {
  display: none;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

/* Toolbar & Filters */
.list-header-wrap {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.filters-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.catalog-search-pill {
  flex: 1;
  min-width: 230px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #121512;
  border: 1px solid var(--line);
  color: #939b92;
  padding: 9px 16px;
  border-radius: 999px;
}

.catalog-search-pill input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
}

.filter-select {
  background: #121512;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 9px 15px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.sort-select {
  border-color: rgba(184, 223, 109, 0.4);
  color: var(--lime);
}

/* Table */
.songs-table-wrapper {
  margin-top: 16px;
  overflow-x: auto;
}

.songs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.songs-table th {
  text-align: left;
  padding: 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
}

.songs-table td {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.playing-row {
  background: rgba(30, 215, 96, 0.1);
}

.song-thumbnail-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  cursor: pointer;
}

.song-thumbnail {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
}

.song-thumb-empty {
  background: #232922;
  display: grid;
  place-items: center;
  color: var(--lime);
}

.play-overlay-btn {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  border: 0;
  color: #1ed760;
  opacity: 0;
  transition: 0.15s;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.song-thumbnail-wrap:hover .play-overlay-btn,
.playing-row .play-overlay-btn {
  opacity: 1;
}

.clickable-title {
  cursor: pointer;
  font-size: 14px;
}

.clickable-title:hover {
  color: var(--lime);
}

.song-title-group strong {
  display: block;
}

.song-title-group small {
  color: var(--muted);
  font-size: 12px;
}

.origin-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.origin-spotify {
  background: rgba(30, 215, 96, 0.15);
  color: #1ed760;
}

.origin-youtube_music {
  background: rgba(255, 78, 69, 0.15);
  color: #ff6b63;
}

.origin-youtube {
  background: rgba(255, 0, 0, 0.15);
  color: #ff4d4d;
}

.origin-propia {
  background: rgba(231, 187, 89, 0.2);
  color: var(--yellow);
}

.origin-manual_admin {
  background: rgba(184, 223, 109, 0.2);
  color: var(--lime);
}

.genre-pill {
  background: #232922;
  border: 1px solid #353e34;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  border-radius: 999px;
}

.btn-xs {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 11px;
  border-radius: 999px;
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(232, 121, 93, 0.16);
  border: 1px solid var(--red);
  color: var(--red);
  padding: 7px 14px;
  border-radius: 999px;
  font-weight: 600;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 580px;
  background: #181c17;
  border: 1px solid var(--line);
  border-radius: 20px;
}

.detail-top {
  display: flex;
  gap: 18px;
  margin-top: 16px;
}

.detail-cover {
  width: 124px;
  height: 124px;
  border-radius: 14px;
  object-fit: cover;
}

.detail-meta-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-meta-grid small {
  display: block;
  font-size: 10px;
  color: var(--muted);
}

.detail-meta-grid strong {
  font-size: 13px;
}

.youtube-embed-box {
  margin-top: 16px;
}

@media (max-width: 860px) {
  .search-api-bar,
  .form-grid,
  .form-row,
  .form-row.three-cols {
    grid-template-columns: 1fr;
  }
}
</style>
