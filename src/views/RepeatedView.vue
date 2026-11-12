<template>
  <div class="repeated-page">
    <!-- Cabecera de la Función Principal del MVP -->
    <div class="page-intro">
      <div>
        <p class="eyebrow accent">
          MOTOR MVP DE AUDITORÍA • {{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }}
        </p>
        <h2>Detección y limpieza de canciones repetidas</h2>
        <p class="subtext">
          Analiza las playlists de tu organización, detecta canciones repetidas en múltiples listas
          (Spotify, YouTube Music, YouTube y Producciones Propias) y resuelve los loops en un clic.
        </p>
      </div>

      <div class="intro-actions">
        <button class="outline" :disabled="escaneando" @click="abrirFormularioAuditoria">
          {{ escaneando ? 'Escaneando...' : '↻ Ejecutar nueva auditoría' }}
        </button>

        <button
          v-if="auth.canResolveDuplicates.value"
          class="primary"
          :disabled="!seleccionadas.length"
          @click="solicitarConfirmacionResolucion('deduplicar')"
        >
          ✓ Depurar seleccionadas ({{ seleccionadas.length }})
        </button>

        <button
          v-if="auth.canResolveDuplicates.value"
          class="btn-clean-list"
          :disabled="!seleccionadas.length"
          @click="solicitarConfirmacionResolucion('lista_limpia')"
        >
          ✦ Crear playlist limpia
        </button>

        <button
          v-if="auth.isReadOnly.value"
          class="outline btn-test-block"
          @click="probarBloqueoLector"
        >
          🔒 Probar intento de resolución (Bloqueo Lector)
        </button>
      </div>
    </div>

    <!-- Recorrido Paso a Paso de la Función Principal (Etapa 6) -->
    <div class="steps-banner">
      <div class="step-item done">
        <span class="step-num">01</span>
        <div>
          <strong>Ingresar y Conectar</strong>
          <small>Sesión activa en {{ auth.currentUser.value?.organizacion_nombre }}</small>
        </div>
      </div>
      <div class="step-item done">
        <span class="step-num">02</span>
        <div>
          <strong>Escanear Playlists</strong>
          <small>{{ conflictos.length }} colisiones detectadas</small>
        </div>
      </div>
      <div class="step-item" :class="{ done: seleccionadas.length > 0 }">
        <span class="step-num">03</span>
        <div>
          <strong>Seleccionar Conflictos</strong>
          <small>{{ seleccionadas.length }} pista(s) marcada(s)</small>
        </div>
      </div>
      <div class="step-item" :class="{ done: ultimaResolucionExito }">
        <span class="step-num">04</span>
        <div>
          <strong>Guardar y Depurar</strong>
          <small>Persistido por organización</small>
        </div>
      </div>
    </div>

    <!-- Mensajes de Estado / Validación -->
    <div v-if="mensaje" class="alert-box alert-success">
      <span>✓</span>
      <div>{{ mensaje }}</div>
      <button class="alert-close" @click="mensaje = ''">✕</button>
    </div>
    <div v-if="errorMensaje" class="alert-box alert-error">
      <span>✕</span>
      <div>{{ errorMensaje }}</div>
      <button class="alert-close" @click="errorMensaje = ''">✕</button>
    </div>

    <!-- Formulario para Registrar Nueva Sesión de Auditoría (con Validación) -->
    <section v-if="mostrarFormAuditoria" class="panel audit-form-panel">
      <div class="panel-head">
        <div>
          <span class="tiny accent">REGISTRAR SESIÓN DE ESCANEO EN BASE DE DATOS</span>
          <h3>Nueva Auditoría de Biblioteca ({{ auth.currentUser.value?.organizacion_nombre }})</h3>
        </div>
        <button class="outline btn-sm" @click="mostrarFormAuditoria = false">✕</button>
      </div>

      <form class="audit-form" @submit.prevent="confirmarNuevaAuditoria">
        <div class="form-group">
          <label>Etiqueta o nota de auditoría * (Obligatorio, mín. 5 caracteres)</label>
          <input
            v-model="notaAuditoria"
            type="text"
            placeholder="Ej. Auditoría mensual de playlists de Spotify y YouTube Music"
            required
          />
        </div>
        <div class="audit-form-actions">
          <button type="submit" class="primary" :disabled="escaneando">
            Registrar y Escanear Biblioteca
          </button>
          <button type="button" class="outline" @click="mostrarFormAuditoria = false">
            Cancelar
          </button>
        </div>
      </form>
    </section>

    <!-- Barra de Búsqueda, Filtros y Ordenamiento (Etapa 7) -->
    <div class="filters-bar panel">
      <input
        v-model="busqueda"
        type="text"
        placeholder="🔍 Buscar conflicto por canción, artista o playlist afectada..."
        class="search-input"
      />

      <select v-model="filtroPlataforma" class="filter-select">
        <option value="todas">Plataforma: Todas</option>
        <option value="spotify">● Spotify</option>
        <option value="youtube_music">◉ YouTube Music</option>
        <option value="youtube">▶ YouTube</option>
        <option value="propia">🎙️ Producción Propia</option>
      </select>

      <select v-model="orden" class="filter-select sort-select">
        <option value="repeticiones_desc">Ordenar: Más playlists repetidas</option>
        <option value="reproducciones_desc">Ordenar: Más reproducidas</option>
        <option value="titulo_asc">Ordenar: Canción (A - Z)</option>
      </select>

      <button class="outline btn-sm" @click="seleccionarTodas">
        {{ seleccionadas.length === conflictosFiltrados.length && conflictosFiltrados.length > 0 ? 'Deseleccionar todas' : 'Seleccionar todas' }}
      </button>
    </div>

    <!-- Tabla Principal de Canciones Repetidas -->
    <section class="panel">
      <div class="panel-head" style="margin-bottom: 14px;">
        <div>
          <span class="tiny">COLISIONES ACTIVAS ENTRE LISTAS DE REPRODUCCIÓN</span>
          <h3>Canciones repetidas detectadas ({{ conflictosFiltrados.length }})</h3>
        </div>
        <button
          v-if="!conflictos.length"
          class="outline btn-sm"
          @click="restaurarDatosMuestra"
        >
          ↻ Restaurar datos de prueba de duplicados
        </button>
      </div>

      <div v-if="!conflictosFiltrados.length" class="empty-state">
        <p v-if="conflictos.length === 0">
          🎉 ¡Tu biblioteca en <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong> está 100% limpia! No hay canciones repetidas entre múltiples playlists.
        </p>
        <p v-else>
          No hay canciones repetidas que coincidan con la búsqueda actual.
        </p>
      </div>

      <div v-else class="conflicts-list">
        <div class="conflicts-head">
          <span>SEL.</span>
          <span>CANCIÓN EN CONFLICTO</span>
          <span>ORIGEN</span>
          <span>PLAYLISTS DONDE SE REPITE</span>
          <span>REPETICIONES</span>
          <span>PLAYS</span>
        </div>

        <label
          v-for="item in conflictosFiltrados"
          :key="item.cancion_id"
          class="conflict-row"
          :class="{ checked: isSelected(item.cancion_id) }"
        >
          <input
            class="check"
            type="checkbox"
            :checked="isSelected(item.cancion_id)"
            @change="toggleSelection(item.cancion_id)"
          />

          <div class="conflict-song">
            <img
              v-if="item.cancion?.portada_url"
              :src="item.cancion.portada_url"
              :alt="item.cancion.titulo"
              class="conflict-art"
            />
            <span v-else class="conflict-art empty">♪</span>
            <div>
              <strong>{{ item.cancion?.titulo }}</strong>
              <small>{{ item.cancion?.artista }} • {{ item.cancion?.album || 'Single' }}</small>
            </div>
          </div>

          <div>
            <span class="origin-tag">{{ item.cancion?.plataforma_origen || 'spotify' }}</span>
          </div>

          <div class="conflict-playlists">
            <span
              v-for="(ap, idx) in item.apariciones"
              :key="ap.rel_id"
              class="pl-chip"
              :class="{ primary: idx === 0 }"
              :title="idx === 0 ? 'Playlist principal (se conservará aquí)' : 'Copia redundante (se depurará)'"
            >
              {{ idx === 0 ? '★ ' : '× ' }}{{ ap.playlist_nombre }}
            </span>
          </div>

          <div>
            <strong class="rep-badge">{{ item.repeticiones_totales }} listas</strong>
          </div>

          <div>
            <strong>{{ item.cancion?.reproducciones || 0 }}</strong>
          </div>
        </label>
      </div>
    </section>

    <!-- Historial de Auditorías Registradas (Tabla analisis_duplicados) -->
    <section class="panel history-panel">
      <div class="panel-head">
        <div>
          <span class="tiny">HISTORIAL PERSISTIDO POR ORGANIZACIÓN (TABLA ANALISIS_DUPLICADOS)</span>
          <h3>Sesiones de auditoría ejecutadas ({{ historialAnalisis.length }})</h3>
        </div>
      </div>

      <table v-if="historialAnalisis.length" class="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Responsable</th>
            <th>Playlists Escaneadas</th>
            <th>Canciones Evaluadas</th>
            <th>Duplicados</th>
            <th>Estado</th>
            <th>Bitácora / Notas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in historialAnalisis" :key="h.id">
            <td>{{ new Date(h.fecha_analisis).toLocaleString() }}</td>
            <td>{{ h.autor_nombre || auth.currentUser.value?.nombre }}</td>
            <td>{{ h.total_playlists_escaneadas }}</td>
            <td>{{ h.total_canciones_escaneadas }}</td>
            <td><strong>{{ h.total_duplicados_detectados }}</strong></td>
            <td>
              <span :class="['status-pill', h.estado]">{{ h.estado }}</span>
            </td>
            <td class="muted-td">{{ h.notas }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Modal de Confirmación antes de Eliminar Duplicados -->
    <div v-if="modoConfirmacion" class="modal-backdrop" @click.self="modoConfirmacion = ''">
      <div class="modal-card panel">
        <span class="tiny accent">CONFIRMACIÓN DE DEPURACIÓN</span>
        <h3>
          {{ modoConfirmacion === 'lista_limpia' ? '¿Crear Playlist Limpia y depurar duplicados?' : '¿Eliminar copias repetidas de las playlists secundarias?' }}
        </h3>
        <p class="subtext">
          Vas a procesar <strong>{{ seleccionadas.length }} canción(es)</strong> en la organización
          <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong>. Se conservará la canción en su primera playlist (★) y se eliminarán las copias redundantes (×).
        </p>
        <div class="audit-form-actions">
          <button class="primary" @click="ejecutarResolucionConfirmada">
            Sí, confirmar operación
          </button>
          <button class="outline" @click="modoConfirmacion = ''">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '@/services/auth'
import { dbService } from '@/services/db'

const auth = useAuth()

const conflictos = ref([])
const historialAnalisis = ref([])
const seleccionadas = ref([])
const busqueda = ref('')
const filtroPlataforma = ref('todas')
const orden = ref('repeticiones_desc')

const escaneando = ref(false)
const mostrarFormAuditoria = ref(false)
const notaAuditoria = ref('Auditoría de duplicados entre playlists de Spotify y YouTube Music')
const modoConfirmacion = ref('')
const ultimaResolucionExito = ref(false)

const mensaje = ref('')
const errorMensaje = ref('')

const conflictosFiltrados = computed(() => {
  let lista = [...conflictos.value]

  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase().trim()
    lista = lista.filter(
      item =>
        item.cancion?.titulo?.toLowerCase().includes(q) ||
        item.cancion?.artista?.toLowerCase().includes(q) ||
        item.playlists_nombres.some(n => n.toLowerCase().includes(q))
    )
  }

  if (filtroPlataforma.value !== 'todas') {
    lista = lista.filter(item => (item.cancion?.plataforma_origen || 'spotify') === filtroPlataforma.value)
  }

  lista.sort((a, b) => {
    if (orden.value === 'repeticiones_desc') {
      return b.repeticiones_totales - a.repeticiones_totales
    }
    if (orden.value === 'reproducciones_desc') {
      return (b.cancion?.reproducciones || 0) - (a.cancion?.reproducciones || 0)
    }
    if (orden.value === 'titulo_asc') {
      return (a.cancion?.titulo || '').localeCompare(b.cancion?.titulo || '')
    }
    return 0
  })

  return lista
})

async function cargarDatos() {
  errorMensaje.value = ''
  try {
    conflictos.value = await dbService.getCancionesRepetidas()
    historialAnalisis.value = await dbService.getHistorialAnalisis()
    seleccionadas.value = []
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function isSelected(id) {
  return seleccionadas.value.includes(id)
}

function toggleSelection(id) {
  if (seleccionadas.value.includes(id)) {
    seleccionadas.value = seleccionadas.value.filter(i => i !== id)
  } else {
    seleccionadas.value.push(id)
  }
}

function seleccionarTodas() {
  if (seleccionadas.value.length === conflictosFiltrados.value.length) {
    seleccionadas.value = []
  } else {
    seleccionadas.value = conflictosFiltrados.value.map(c => c.cancion_id)
  }
}

function abrirFormularioAuditoria() {
  mensaje.value = ''
  errorMensaje.value = ''
  mostrarFormAuditoria.value = true
}

async function confirmarNuevaAuditoria() {
  mensaje.value = ''
  errorMensaje.value = ''

  if (!notaAuditoria.value || notaAuditoria.value.trim().length < 5) {
    errorMensaje.value = 'Error de validación: La nota o etiqueta de auditoría es obligatoria y debe tener al menos 5 caracteres.'
    return
  }

  escaneando.value = true
  try {
    const res = await dbService.ejecutarAnalisisDuplicados(notaAuditoria.value)
    conflictos.value = res.repetidas
    historialAnalisis.value = await dbService.getHistorialAnalisis()
    mostrarFormAuditoria.value = false
    mensaje.value = `✓ Auditoría completada y guardada en base de datos para "${auth.currentUser.value?.organizacion_nombre}": ${res.repetidas.length} canciones en conflicto detectadas.`
  } catch (err) {
    errorMensaje.value = err.message
  } finally {
    escaneando.value = false
  }
}

function solicitarConfirmacionResolucion(modo) {
  errorMensaje.value = ''
  mensaje.value = ''
  if (!seleccionadas.value.length) {
    errorMensaje.value = 'Debes seleccionar al menos una canción repetida antes de depurar.'
    return
  }
  modoConfirmacion.value = modo
}

async function ejecutarResolucionConfirmada() {
  const modo = modoConfirmacion.value
  modoConfirmacion.value = ''
  errorMensaje.value = ''
  mensaje.value = ''

  try {
    const resultado = await dbService.resolverDuplicadosSeleccionados(seleccionadas.value, modo)
    ultimaResolucionExito.value = true
    await cargarDatos()
    if (modo === 'lista_limpia' && resultado.playlistLimpia) {
      mensaje.value = `✓ ¡Operación exitosa! Se creó "${resultado.playlistLimpia.nombre}" y se eliminaron ${resultado.eliminadasCount} copias redundantes.`
    } else {
      mensaje.value = `✓ ¡Depuración completada! Se eliminaron ${resultado.eliminadasCount} copias repetidas de tus playlists secundarias.`
    }
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function probarBloqueoLector() {
  mensaje.value = ''
  errorMensaje.value = ''
  try {
    await dbService.resolverDuplicadosSeleccionados(['test_id'], 'deduplicar')
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function restaurarDatosMuestra() {
  dbService.resetSeedData()
  await cargarDatos()
  mensaje.value = 'Datos de prueba restaurados para demostrar el motor de detección de duplicados.'
}

watch(
  () => [auth.currentUser.value?.id, auth.currentUser.value?.organizacion_id],
  () => {
    cargarDatos()
  }
)

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
.repeated-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.subtext {
  color: var(--muted);
  font-size: 13px;
  max-width: 650px;
  margin-top: 6px;
}

.intro-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-clean-list {
  background: #232d23;
  border: 1px solid var(--lime);
  color: var(--lime);
  padding: 13px 16px;
  font-size: 12px;
  font-weight: 700;
}

.btn-test-block {
  border-color: var(--red);
  color: var(--red);
}

.steps-banner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.step-item {
  background: #1a1e19;
  border: 1px solid #2e342d;
  padding: 12px 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-item.done {
  border-color: rgba(184, 223, 109, 0.5);
  background: #1e251d;
}

.step-num {
  font: 700 16px Georgia;
  color: var(--lime);
}

.step-item strong {
  display: block;
  font-size: 12px;
}

.step-item small {
  color: var(--muted);
  font-size: 10px;
}

.alert-box {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.alert-close {
  background: none;
  border: 0;
  cursor: pointer;
}

.audit-form {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-form input {
  background: #131612;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 11px 14px;
  font-size: 13px;
  border-radius: 4px;
}

.audit-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 14px 18px;
}

.search-input {
  flex: 1;
  min-width: 240px;
  background: #131612;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 9px 13px;
  font-size: 12px;
  border-radius: 4px;
}

.filter-select {
  background: #131612;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 9px 12px;
  font-size: 11px;
  border-radius: 4px;
}

.sort-select {
  color: var(--lime);
}

.conflicts-head,
.conflict-row {
  display: grid;
  grid-template-columns: 36px 1.3fr 110px 1.6fr 110px 70px;
  gap: 12px;
  align-items: center;
}

.conflicts-head {
  padding: 10px 12px;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}

.conflict-row {
  padding: 14px 12px;
  border-bottom: 1px solid #282e27;
  cursor: pointer;
  font-size: 12px;
}

.conflict-row.checked {
  background: #222b21;
}

.conflict-song {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conflict-art {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.conflict-art.empty {
  background: #262d25;
  display: grid;
  place-items: center;
}

.conflict-song strong {
  display: block;
}

.conflict-song small {
  color: var(--muted);
  font-size: 11px;
}

.origin-tag {
  font-size: 10px;
  text-transform: uppercase;
  padding: 3px 7px;
  background: #232822;
  border-radius: 4px;
  color: var(--cream);
}

.conflict-playlists {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pl-chip {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(232, 121, 93, 0.15);
  border: 1px solid rgba(232, 121, 93, 0.4);
  color: #f3a691;
}

.pl-chip.primary {
  background: rgba(184, 223, 109, 0.15);
  border-color: rgba(184, 223, 109, 0.45);
  color: var(--lime);
}

.rep-badge {
  color: var(--yellow);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
  font-size: 12px;
}

.history-table th {
  text-align: left;
  padding: 10px;
  font-size: 10px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
}

.history-table td {
  padding: 10px;
  border-bottom: 1px solid #262b25;
}

.status-pill {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}

.status-pill.pendiente {
  background: rgba(231, 187, 89, 0.2);
  color: var(--yellow);
}

.status-pill.resuelto_parcial,
.status-pill.resuelto_total {
  background: rgba(184, 223, 109, 0.2);
  color: var(--lime);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.76);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  max-width: 520px;
  width: 100%;
  background: #181c17;
}

.btn-sm {
  padding: 7px 11px;
  font-size: 11px;
}

@media (max-width: 900px) {
  .steps-banner {
    grid-template-columns: 1fr 1fr;
  }
  .conflicts-head {
    display: none;
  }
  .conflict-row {
    grid-template-columns: 1fr;
  }
}
</style>
