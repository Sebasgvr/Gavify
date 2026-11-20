<template>
  <div>
    <div class="row">
      <div>
        <p class="eyebrow accent">
          HOLA, {{ auth.currentUser.value?.nombre?.toUpperCase() || 'USUARIO' }} •
          {{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }}
        </p>
        <h2>Esto es lo que está sonando en tu biblioteca.</h2>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <button class="outline btn-icon-flex" @click="router.push('/connect')">
          <AppIcon name="link" :size="15" />
          <span>Conectar Spotify / YT Music / YouTube</span>
        </button>
        <button class="primary btn-icon-flex" @click="router.push('/musica')">
          <AppIcon name="search" :size="15" />
          <span>Explorar y agregar música</span>
        </button>
      </div>
    </div>

    <!-- Stats dinámicas vinculadas a la organización activa -->
    <div class="stats">
      <div v-for="(stat, index) in statsList" :key="index" class="stat">
        <span class="tiny">{{ stat.label }}</span>
        <strong :style="stat.color ? { color: stat.color } : {}">{{ stat.value }}</strong>
        <small>{{ stat.subtext }}</small>
      </div>
    </div>

    <!-- Grid: Rhythm Chart con Degradado Claro y Definido + Géneros (0% si no se escucharon) -->
    <div class="grid">
      <section class="panel chart-panel">
        <div class="panel-head">
          <div>
            <span class="tiny">RITMO DE ESCUCHA ({{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }})</span>
            <h3>Actividad semanal sincronizada ({{ totalCancionesSemana }} canciones)</h3>
          </div>
          <span class="muted">Canciones por día y % por género</span>
        </div>

        <!-- Gráfico de barras con degradado definido por género y cantidad de canciones por día -->
        <div class="chart chart-songs">
          <div class="chart-y">
            <span>{{ maxCancionesDia }}</span>
            <span>{{ Math.round(maxCancionesDia * 0.66) }}</span>
            <span>{{ Math.round(maxCancionesDia * 0.33) }}</span>
            <span>0</span>
          </div>
          <div class="bars">
            <div
              v-for="item in weeklyActivity"
              :key="item.day"
              class="bar-column"
              :title="`${item.dayLabel}: ${item.songsCount} canciones escuchadas`"
            >
              <!-- Cantidad de canciones escuchadas ese día -->
              <span class="bar-song-count">{{ item.songsCount }}</span>

              <!-- Barra con degradado bien definido de los géneros escuchados -->
              <div
                class="bar gradient-bar"
                :style="{
                  height: item.pct + '%',
                  background: item.gradientBackground
                }"
              ></div>

              <span class="bar-day-label">{{ item.day }}</span>
            </div>
          </div>
        </div>

        <!-- Todos los géneros abajo uno al lado del otro, con su color y 0% si no se escucharon -->
        <div class="genres-legend-wrap">
          <span class="tiny genres-legend-title">GÉNEROS ESCUCHADOS EN LA SEMANA:</span>
          <div class="genres-legend-row">
            <div
              v-for="g in generosSemanales"
              :key="g.nombre"
              class="genre-legend-pill"
              :class="{ 'genre-zero': g.porcentaje === 0 }"
              :style="{
                borderColor: g.porcentaje > 0 ? g.color + '66' : 'rgba(255,255,255,0.07)',
                background: g.porcentaje > 0 ? `linear-gradient(135deg, ${g.color}1c 0%, rgba(20,24,20,0.95) 100%)` : '#141814'
              }"
            >
              <span
                class="genre-color-dot"
                :style="{
                  background: `linear-gradient(180deg, ${g.colorLight} 0%, ${g.color} 100%)`,
                  boxShadow: g.porcentaje > 0 ? `0 0 8px ${g.color}55` : 'none'
                }"
              ></span>
              <span class="genre-legend-name">{{ g.nombre }}</span>
              <strong
                class="genre-legend-pct"
                :style="{ color: g.porcentaje > 0 ? g.colorLight : '#687066' }"
              >
                {{ g.porcentaje }}%
              </strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Panel 2: Canciones más escuchadas -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="tiny">TUS CANCIONES MÁS ESCUCHADAS</span>
            <h3>En loop últimamente</h3>
          </div>
          <router-link to="/playlists" class="text">Ver en mis Playlists</router-link>
        </div>

        <div v-if="!topCanciones.length" class="empty-state">
          <p>Todavía no reprodujiste canciones. Dale play a un tema para verlo aquí.</p>
        </div>

        <div v-else class="songs">
          <div
            v-for="(song, index) in topCanciones"
            :key="song.id"
            class="song"
            style="cursor: pointer;"
            @click="player.playTrack(song, topCanciones)"
          >
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <VinylThumb
              :src="song.portada_url"
              :alt="song.titulo"
              :size="42"
              :spinning="player.currentTrack.value?.id === song.id && player.isPlaying.value"
            />
            <span class="song-info">
              <strong>{{ song.titulo }}</strong>
              <small>{{ song.artista }} • {{ etiquetaPlataforma(song.plataforma_origen) }}</small>
            </span>
            <span class="plays" style="display: flex; align-items: center; gap: 8px;">
              <span>{{ song.userPlays }} {{ song.userPlays === 1 ? 'vez' : 'veces' }}</span>
              <AppIcon name="play" :size="14" />
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Insight Box -->
    <div class="insight">
      <div class="insight-mark">
        <AppIcon name="sparkles" :size="18" />
      </div>
      <div>
        <span class="tiny">CUENTA ACTIVA ({{ auth.currentUser.value?.organizacion_nombre?.toUpperCase() }})</span>
        <p>
          Sesión iniciada como <strong>{{ auth.currentUser.value?.nombre }}</strong> con rol
          <strong>{{ auth.roleInfo.value?.etiqueta }}</strong> ({{ auth.currentUser.value?.plan }}).
          Tienes <strong>{{ canciones.length }} canciones</strong> y <strong>{{ playlists.length }} playlists</strong> sincronizadas.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import { dbService } from '@/services/db'
import { usePlayer } from '@/services/player'
import AppIcon from '@/components/AppIcon.vue'
import VinylThumb from '@/components/VinylThumb.vue'

const router = useRouter()
const auth = useAuth()
const player = usePlayer()

const canciones = ref([])
const playlists = ref([])
const repetidas = ref([])

function etiquetaPlataforma(origen) {
  const map = {
    spotify: 'Spotify',
    youtube_music: 'YT Music',
    youtube: 'YouTube'
  }
  return map[origen] || 'Spotify'
}

// Paleta armónica con buen contraste y claridad visual para distinguir cada género en el degradado sin cansar la vista
const CATALOGO_GENEROS = [
  { nombre: 'Alternativo', color: '#8b6fd6', colorLight: '#a992eb' },
  { nombre: 'Electrónica', color: '#d98a46', colorLight: '#eba96c' },
  { nombre: 'Rock', color: '#4596c9', colorLight: '#6cb4e0' },
  { nombre: 'Pop', color: '#56b376', colorLight: '#7cd199' },
  { nombre: 'Indie Pop', color: '#c4689e', colorLight: '#de8bbb' },
  { nombre: 'Trap / Urbano', color: '#cf636c', colorLight: '#e68890' },
  { nombre: 'R&B', color: '#47a89c', colorLight: '#6ec7bc' },
  { nombre: 'Hip Hop', color: '#bda24c', colorLight: '#d6be6f' }
]

const COLORES_EXTRA = [
  { color: '#6b7fd1', colorLight: '#8ea0e8' },
  { color: '#7cb556', colorLight: '#9cd179' }
]

async function cargarResumen() {
  try {
    player.refreshListeningHistoryForCurrentUser()
    const misPlaylists = await dbService.getPlaylists()
    playlists.value = misPlaylists

    const mapaCancionesUsuario = new Map()
    const listasItems = await Promise.all(
      misPlaylists.map(pl => dbService.getCancionesDePlaylist(pl.id).catch(() => []))
    )
    for (const items of listasItems) {
      for (const item of items) {
        const song = item?.canciones
        if (song?.id && !mapaCancionesUsuario.has(song.id)) {
          mapaCancionesUsuario.set(song.id, song)
        }
      }
    }

    canciones.value = Array.from(mapaCancionesUsuario.values())
    repetidas.value = await dbService.getCancionesRepetidas()
  } catch (e) {
    console.warn('Error cargando resumen:', e)
  }
}

const topCanciones = computed(() => {
  const history = player.listeningHistory.value || []
  if (!history.length) return []

  const libraryByKey = new Map()
  for (const song of canciones.value) {
    const k = `${String(song.titulo || '').toLowerCase().trim()}|${String(song.artista || '').toLowerCase().trim()}`
    if (!libraryByKey.has(k)) libraryByKey.set(k, song)
  }

  const agg = new Map()
  for (const ev of history) {
    const k = `${String(ev.titulo || '').toLowerCase().trim()}|${String(ev.artista || '').toLowerCase().trim()}`
    if (!agg.has(k)) {
      const libMatch = libraryByKey.get(k)
      agg.set(k, {
        ...(libMatch || ev),
        userPlays: 0
      })
    }
    const item = agg.get(k)
    item.userPlays += 1
    if (!item.portada_url && ev.portada_url) item.portada_url = ev.portada_url
  }

  return Array.from(agg.values())
    .filter(song => song.userPlays > 0)
    .sort((a, b) => b.userPlays - a.userPlays)
    .slice(0, 5)
})

function formatPlays(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)} B plays`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} M plays`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)} K plays`
  return `${num} plays`
}

// Calcula el porcentaje real escuchado de cada género (desde historial real o biblioteca real); 0% si no se escucharon
const generosSemanales = computed(() => {
  const mapaPesos = new Map()

  for (const g of CATALOGO_GENEROS) {
    mapaPesos.set(g.nombre, {
      nombre: g.nombre,
      color: g.color,
      colorLight: g.colorLight,
      peso: 0
    })
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentPlays = (player.listeningHistory.value || []).filter(
    item => new Date(item.playedAt).getTime() >= weekAgo
  )
  const fuente = recentPlays.length > 0 ? recentPlays : canciones.value

  let extraIdx = 0
  for (const c of fuente) {
    const gen = (c.genero || 'Pop').trim()
    const peso = recentPlays.length > 0 ? 1 : 1
    if (mapaPesos.has(gen)) {
      mapaPesos.get(gen).peso += peso
    } else {
      const extra = COLORES_EXTRA[extraIdx++ % COLORES_EXTRA.length]
      mapaPesos.set(gen, {
        nombre: gen,
        color: extra.color,
        colorLight: extra.colorLight,
        peso
      })
    }
  }

  const lista = Array.from(mapaPesos.values())
  const sumaTotal = lista.reduce((acc, item) => acc + item.peso, 0)

  if (sumaTotal === 0) {
    return lista.map(item => ({ ...item, porcentaje: 0 }))
  }

  const escuchados = lista.filter(item => item.peso > 0)
  let acumulado = 0
  const mapaPorcentajes = new Map()

  escuchados.forEach((item, idx) => {
    if (idx === escuchados.length - 1) {
      mapaPorcentajes.set(item.nombre, Math.max(1, 100 - acumulado))
    } else {
      const pct = Math.max(1, Math.round((item.peso / sumaTotal) * 100))
      acumulado += pct
      mapaPorcentajes.set(item.nombre, pct)
    }
  })

  return lista
    .map(item => ({
      ...item,
      porcentaje: mapaPorcentajes.get(item.nombre) || 0
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje)
})

const DIAS_SEMANA = [
  { day: 'L', dayLabel: 'Lunes', jsDay: 1 },
  { day: 'M', dayLabel: 'Martes', jsDay: 2 },
  { day: 'X', dayLabel: 'Miércoles', jsDay: 3 },
  { day: 'J', dayLabel: 'Jueves', jsDay: 4 },
  { day: 'V', dayLabel: 'Viernes', jsDay: 5 },
  { day: 'S', dayLabel: 'Sábado', jsDay: 6 },
  { day: 'D', dayLabel: 'Domingo', jsDay: 0 }
]

/**
 * Construye un degradado vertical claro y notorio donde cada género escuchado
 * tiene su franja proporcional con una transición degradada nítida entre géneros,
 * manteniendo el mismo orden visual en todas las barras para que no confunda.
 */
function buildClearGenreGradient(generosActivos) {
  if (!generosActivos.length) {
    return 'linear-gradient(180deg, #7cd199 0%, #3d8556 100%)'
  }
  if (generosActivos.length === 1) {
    const g = generosActivos[0]
    return `linear-gradient(180deg, ${g.colorLight} 0%, ${g.color} 60%, #2a382d 100%)`
  }

  const topGenres = generosActivos.slice(0, 4)
  const totalPct = topGenres.reduce((acc, g) => acc + g.porcentaje, 0) || 100
  const stops = []
  let cursor = 0

  topGenres.forEach((g, idx) => {
    const span = (g.porcentaje / totalPct) * 100
    const start = cursor
    const end = idx === topGenres.length - 1 ? 100 : cursor + span
    // Zona central sólida/luminosa del género y transición degradada notoria de 7% en la unión
    const fadeZone = Math.min(7, span * 0.28)
    const innerStart = idx === 0 ? 0 : Math.min(100, Math.round(start + fadeZone))
    const innerEnd = idx === topGenres.length - 1 ? 100 : Math.max(innerStart, Math.round(end - fadeZone))

    stops.push(`${g.colorLight} ${innerStart}%`)
    stops.push(`${g.color} ${innerEnd}%`)
    cursor = end
  })

  return `linear-gradient(180deg, ${stops.join(', ')})`
}

const weeklyActivity = computed(() => {
  const generosActivos = generosSemanales.value.filter(g => g.porcentaje > 0)
  const gradientBackground = buildClearGenreGradient(generosActivos)

  // Contar únicamente reproducciones reales de los últimos 7 días
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const countsByJsDay = new Map([
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]
  ])

  for (const ev of player.listeningHistory.value || []) {
    const dt = new Date(ev.playedAt)
    if (Number.isNaN(dt.getTime()) || dt.getTime() < weekAgo) continue
    const jsDay = dt.getDay()
    countsByJsDay.set(jsDay, (countsByJsDay.get(jsDay) || 0) + 1)
  }

  const maxSongs = Math.max(1, ...Array.from(countsByJsDay.values()))

  return DIAS_SEMANA.map(d => {
    const songsCount = countsByJsDay.get(d.jsDay) || 0
    const pct = songsCount > 0 ? Math.max(10, Math.round((songsCount / maxSongs) * 100)) : 4

    return {
      ...d,
      songsCount,
      pct,
      gradientBackground: songsCount > 0 ? gradientBackground : 'rgba(255, 255, 255, 0.08)'
    }
  })
})

const maxCancionesDia = computed(() => {
  return Math.max(5, ...weeklyActivity.value.map(d => d.songsCount))
})

const totalCancionesSemana = computed(() => {
  return weeklyActivity.value.reduce((acc, d) => acc + d.songsCount, 0)
})

const statsList = computed(() => {
  const totalCanciones = canciones.value.length
  const totalPlaylists = playlists.value.length
  const totalDuplicados = repetidas.value.length

  // Artista más escuchado real (desde historial de reproducción o frecuencia en biblioteca)
  const artistCounts = new Map()
  const history = player.listeningHistory.value || []
  const sourceList = history.length > 0 ? history : canciones.value
  for (const item of sourceList) {
    const rawArtist = String(item?.artista || '').trim()
    if (!rawArtist || rawArtist === 'Artista desconocido') continue
    artistCounts.set(rawArtist, (artistCounts.get(rawArtist) || 0) + 1)
  }
  let topArtista = 'Sin reproducciones'
  let maxArtistCount = 0
  for (const [artistName, cnt] of artistCounts.entries()) {
    if (cnt > maxArtistCount) {
      maxArtistCount = cnt
      topArtista = artistName
    }
  }

  return [
    {
      label: 'CANCIONES EN BIBLIOTECA',
      value: String(totalCanciones),
      subtext: `Sincronizadas en ${auth.currentUser.value?.organizacion_nombre}`,
      color: 'var(--lime)'
    },
    {
      label: 'PLAYLISTS ACTIVAS',
      value: String(totalPlaylists),
      subtext: 'Spotify, YT Music y YouTube',
      color: ''
    },
    {
      label: 'REPETIDAS DETECTADAS',
      value: String(totalDuplicados),
      subtext: totalDuplicados > 0 ? 'Listas para depurar en tus Playlists' : 'Biblioteca 100% limpia',
      color: totalDuplicados > 0 ? 'var(--yellow)' : 'var(--lime)'
    },
    {
      label: 'ARTISTA MÁS ESCUCHADO',
      value: topArtista,
      subtext: `Plan activo: ${auth.currentUser.value?.plan}`,
      color: ''
    }
  ]
})

watch(
  () => [auth.currentUser.value?.id, auth.currentUser.value?.organizacion_id],
  () => {
    cargarResumen()
  }
)

onMounted(() => {
  cargarResumen()
})
</script>

<style scoped>
.chart-panel {
  padding-bottom: 24px;
  overflow: visible;
}

.chart-songs {
  height: 210px;
  margin-top: 20px;
}

.bar-song-count {
  font-size: 11px;
  font-weight: 700;
  color: #e4eae2;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1.2;
}

.gradient-bar {
  width: 30px;
  border-radius: 10px 10px 5px 5px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: height 0.3s ease, transform 0.2s ease, filter 0.2s ease;
}

.bar-column:hover .gradient-bar {
  transform: translateY(-2px);
  filter: brightness(1.08);
}

.bar-day-label {
  font-weight: 700;
  color: #9aa398;
  font-size: 11px;
}

.genres-legend-wrap {
  margin-top: 18px;
  padding-top: 14px;
  padding-bottom: 4px;
  border-top: 1px solid #2b322a;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.genres-legend-title {
  color: #8b9489;
  letter-spacing: 0.08em;
}

.genres-legend-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.genre-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #141814;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  transition: opacity 0.2s ease, transform 0.15s ease;
}

.genre-legend-pill:hover {
  transform: translateY(-1px);
}

.genre-legend-pill.genre-zero {
  opacity: 0.55;
}

.genre-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.genre-legend-name {
  color: #dde3db;
  font-weight: 600;
}

.genre-legend-pct {
  font-weight: 700;
  font-size: 12px;
}
</style>
