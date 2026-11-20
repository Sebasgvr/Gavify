<template>
  <div class="quiz-page">
    <!-- =============================================================== -->
    <!-- PANTALLA 1: CONFIGURACIÓN DEL QUIZ (ELEGIR ARTISTA O GÉNERO)     -->
    <!-- =============================================================== -->
    <section v-if="fase === 'setup'" class="panel quiz-setup-card">
      <div class="quiz-hero-head">
        <div class="quiz-trophy-badge">
          <AppIcon name="trophy" :size="26" />
        </div>
        <div>
          <span class="tiny accent">DESAFÍO MUSICAL · 10 PREGUNTAS · 20s C/U</span>
          <h2>Quiz Musical</h2>
          <p class="subtext">
            Elige o busca un artista o género musical y pon a prueba tu oído con 10 preguntas variadas:
            multiple choice, completar la canción, adivinar por el audio y verdadero o falso.
          </p>
        </div>
      </div>

      <!-- Selector de modo: Artista o Género -->
      <div class="quiz-mode-tabs">
        <button
          type="button"
          class="quiz-mode-btn"
          :class="{ active: modoQuiz === 'artista' }"
          @click="cambiarModo('artista')"
        >
          <AppIcon name="mic" :size="16" />
          <span>Por Artista</span>
        </button>
        <button
          type="button"
          class="quiz-mode-btn"
          :class="{ active: modoQuiz === 'genero' }"
          @click="cambiarModo('genero')"
        >
          <AppIcon name="music" :size="16" />
          <span>Por Género</span>
        </button>
      </div>

      <!-- Buscador de artista o género -->
      <div class="quiz-search-box">
        <AppIcon name="search" :size="17" />
        <input
          v-model="temaElegido"
          type="text"
          :placeholder="
            modoQuiz === 'artista'
              ? 'Busca un artista (ej: Coldplay, Duki, Taylor Swift, Soda Stereo...)'
              : 'Escribe o elige un género (ej: Rock, Pop, Trap, Electrónica...)'
          "
          @keyup.enter="iniciarQuiz"
        />
        <button
          v-if="temaElegido"
          type="button"
          class="quiz-clear-x"
          title="Borrar"
          @click="temaElegido = ''"
        >
          <AppIcon name="close" :size="13" />
        </button>
      </div>

      <!-- Sugerencias rápidas -->
      <div class="quiz-chips-wrap">
        <span class="tiny">
          {{ modoQuiz === 'artista' ? 'ARTISTAS SUGERIDOS:' : 'GÉNEROS SUGERIDOS:' }}
        </span>
        <div class="quiz-chips-list">
          <button
            v-for="item in sugerenciasActuales"
            :key="item"
            type="button"
            class="quiz-chip"
            :class="{ active: temaElegido.toLowerCase() === item.toLowerCase() }"
            @click="temaElegido = item"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="errorQuiz" class="alert-box alert-error">
        <AppIcon name="alert" :size="16" />
        <div class="alert-text">{{ errorQuiz }}</div>
      </div>

      <div class="quiz-start-row">
        <button
          type="button"
          class="primary quiz-start-btn"
          :disabled="cargando || !temaElegido.trim()"
          @click="iniciarQuiz"
        >
          <AppIcon name="play" :size="16" />
          <span>{{ cargando ? 'Preparando 10 preguntas...' : 'Empezar Quiz (10 preguntas)' }}</span>
        </button>
      </div>
    </section>

    <!-- =============================================================== -->
    <!-- PANTALLA 2: JUEGO ACTIVO (10 PREGUNTAS, 20 SEGUNDOS POR PREGUNTA)-->
    <!-- =============================================================== -->
    <section v-else-if="fase === 'playing' && preguntaActual" class="panel quiz-play-card">
      <!-- Barra superior: Progreso, Puntaje y Timer de 20s -->
      <div class="quiz-play-top">
        <div class="quiz-progress-meta">
          <span class="quiz-badge-tema">{{ temaActivo }}</span>
          <strong>Pregunta {{ indiceActual + 1 }} de {{ preguntas.length }}</strong>
          <small class="quiz-score-pill">Puntos: {{ puntaje }}</small>
        </div>

        <div
          class="quiz-timer-pill"
          :class="{
            warning: tiempoRestante <= 10 && tiempoRestante > 5,
            danger: tiempoRestante <= 5
          }"
        >
          <AppIcon name="clock" :size="15" />
          <span>{{ tiempoRestante }}s</span>
        </div>
      </div>

      <!-- Barra visual de tiempo (20s -> 0s) -->
      <div class="quiz-timer-track">
        <div
          class="quiz-timer-fill"
          :class="{
            warning: tiempoRestante <= 10 && tiempoRestante > 5,
            danger: tiempoRestante <= 5
          }"
          :style="{ width: ((tiempoRestante / 20) * 100) + '%' }"
        ></div>
      </div>

      <!-- Tipo de pregunta -->
      <div class="quiz-question-box">
        <span class="quiz-type-tag">{{ etiquetaTipo(preguntaActual.tipo) }}</span>
        <h3 class="quiz-question-title">{{ preguntaActual.enunciado }}</h3>

        <!-- Contexto opcional: carátula o reproductor de audio 30s -->
        <div v-if="preguntaActual.portada && preguntaActual.tipo !== 'audio'" class="quiz-track-hint">
          <img :src="preguntaActual.portada" alt="Portada" class="quiz-hint-cover" />
          <div>
            <strong>{{ preguntaActual.trackNombre }}</strong>
            <small>{{ preguntaActual.trackArtista }}</small>
          </div>
        </div>

        <!-- Bloque de Audio para preguntas de oído -->
        <div v-if="preguntaActual.tipo === 'audio'" class="quiz-audio-box">
          <button
            type="button"
            class="primary quiz-audio-btn"
            @click="togglePreviewAudio"
          >
            <AppIcon :name="audioSonando ? 'pause' : 'play'" :size="17" />
            <span>{{ audioSonando ? 'Pausar fragmento' : 'Escuchar fragmento' }}</span>
          </button>
          <small class="muted">Escucha el audio y elige la canción correcta antes de que acabe el tiempo.</small>
        </div>

        <!-- Bloque de Completar la letra / canción (intentos ilimitados en 20s, 1 a 3 palabras) -->
        <div v-if="preguntaActual.tipo === 'complete_lyric'" class="quiz-lyric-box">
          <p class="quiz-lyric-quote">“{{ preguntaActual.versoConHueco }}”</p>
          <form class="quiz-lyric-form" @submit.prevent="enviarRespuestaTexto">
            <input
              v-model="respuestaTexto"
              type="text"
              class="quiz-lyric-input"
              placeholder="Escribe lo que falta (puedes intentar varias veces)..."
              :disabled="respondida"
              autofocus
            />
            <button
              type="submit"
              class="primary"
              :disabled="respondida || !respuestaTexto.trim()"
            >
              Comprobar
            </button>
          </form>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <small class="muted">
              Pista: {{ preguntaActual.cantidadPalabras === 1 ? '1 palabra' : `${preguntaActual.cantidadPalabras} palabras` }}
              ({{ preguntaActual.respuestaCorrecta.length }} caracteres)
            </small>
            <small v-if="intentoFallidoTexto && !respondida" style="color:var(--red);font-weight:700;">
              {{ intentoFallidoTexto }}
            </small>
          </div>
        </div>

        <!-- Opciones Multiple Choice o Verdadero/Falso -->
        <div
          v-if="preguntaActual.tipo === 'multiple_choice' || preguntaActual.tipo === 'audio' || preguntaActual.tipo === 'true_false'"
          class="quiz-options-grid"
          :class="{ 'two-cols': preguntaActual.tipo === 'true_false' }"
        >
          <button
            v-for="(opcion, idx) in preguntaActual.opciones"
            :key="idx"
            type="button"
            class="quiz-option-btn"
            :class="{
              selected: respuestaUsuario === opcion,
              correct: respondida && opcion === preguntaActual.respuestaCorrecta,
              wrong: respondida && respuestaUsuario === opcion && opcion !== preguntaActual.respuestaCorrecta
            }"
            :disabled="respondida"
            @click="seleccionarOpcion(opcion)"
          >
            <span class="quiz-option-letter">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
            <span class="quiz-option-text">{{ opcion }}</span>
          </button>
        </div>
      </div>

      <!-- Feedback inmediato + Botón siguiente -->
      <div v-if="respondida" class="quiz-feedback-bar" :class="esUltimaCorrecta ? 'ok' : 'fail'">
        <div class="quiz-feedback-text">
          <AppIcon :name="esUltimaCorrecta ? 'check' : 'alert'" :size="18" />
          <div>
            <strong v-if="esUltimaCorrecta">¡Correcto! +1 punto</strong>
            <strong v-else-if="tiempoAgotado">¡Se acabó el tiempo (20s)!</strong>
            <strong v-else>Respuesta incorrecta</strong>
            <small v-if="!esUltimaCorrecta">
              La respuesta correcta era: <b>{{ preguntaActual.respuestaCorrecta }}</b>
            </small>
          </div>
        </div>
        <button type="button" class="primary" @click="siguientePregunta">
          <span>{{ indiceActual + 1 < preguntas.length ? 'Siguiente pregunta →' : 'Ver resultados' }}</span>
        </button>
      </div>
    </section>

    <!-- =============================================================== -->
    <!-- PANTALLA 3: RESULTADOS FINALES                                   -->
    <!-- =============================================================== -->
    <section v-else-if="fase === 'result'" class="panel quiz-result-card">
      <div class="quiz-result-hero">
        <div class="quiz-trophy-badge big">
          <AppIcon name="trophy" :size="34" />
        </div>
        <span class="tiny accent">QUIZ COMPLETADO · {{ temaActivo.toUpperCase() }}</span>
        <h2>Obtuviste {{ puntaje }} de {{ preguntas.length }} puntos</h2>
        <p class="subtext">
          {{ mensajeResultadoFinal }} ({{ Math.round((puntaje / preguntas.length) * 100) }}% de aciertos)
        </p>

        <div class="quiz-result-actions">
          <button type="button" class="primary" @click="iniciarQuiz">
            <AppIcon name="repeat" :size="15" />
            <span>Jugar otro Quiz de {{ temaActivo }}</span>
          </button>
          <button type="button" class="outline" @click="volverAConfigurar">
            <AppIcon name="search" :size="15" />
            <span>Elegir otro artista o género</span>
          </button>
        </div>
      </div>

      <div class="quiz-review-list">
        <div
          v-for="(res, i) in historialRespuestas"
          :key="i"
          class="quiz-review-item"
          :class="{ ok: res.correcta, fail: !res.correcta }"
        >
          <div class="quiz-review-status">
            <AppIcon :name="res.correcta ? 'check' : 'close'" :size="15" />
          </div>
          <div class="quiz-review-body">
            <strong>{{ i + 1 }}. {{ res.enunciado }}</strong>
            <small>
              Tu respuesta: <b>{{ res.respuestaUsuario || 'Sin responder (tiempo agotado)' }}</b>
              <template v-if="!res.correcta">
                • Correcta: <b class="accent">{{ res.respuestaCorrecta }}</b>
              </template>
            </small>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const ARTISTAS_SUGERIDOS = [
  'Coldplay',
  'Duki',
  'Bizarrap',
  'Taylor Swift',
  'Bad Bunny',
  'Soda Stereo',
  'The Weeknd',
  'Maroon 5',
  'Queen',
  'Dua Lipa'
]

const GENEROS_SUGERIDOS = [
  'Pop',
  'Rock',
  'Trap',
  'Electrónica',
  'Alternativo',
  'Hip Hop',
  'Indie',
  'Reggaeton'
]

const fase = ref('setup') // 'setup' | 'playing' | 'result'
const modoQuiz = ref('artista') // 'artista' | 'genero'
const temaElegido = ref('Coldplay')
const temaActivo = ref('')
const cargando = ref(false)
const errorQuiz = ref('')

const preguntas = ref([])
const indiceActual = ref(0)
const puntaje = ref(0)
const tiempoRestante = ref(20)
const respondida = ref(false)
const tiempoAgotado = ref(false)
const respuestaUsuario = ref('')
const respuestaTexto = ref('')
const intentoFallidoTexto = ref('')
const esUltimaCorrecta = ref(false)
const historialRespuestas = ref([])

const audioSonando = ref(false)
let previewAudio = null
let timerInterval = null

const sugerenciasActuales = computed(() =>
  modoQuiz.value === 'artista' ? ARTISTAS_SUGERIDOS : GENEROS_SUGERIDOS
)

const preguntaActual = computed(() => preguntas.value[indiceActual.value] || null)

const mensajeResultadoFinal = computed(() => {
  if (puntaje.value >= 9) return '¡Nivel experto absoluto!'
  if (puntaje.value >= 7) return '¡Muy buen oído musical!'
  if (puntaje.value >= 5) return 'Nada mal, ¡puedes superarlo!'
  return '¡Buen intento! Prueba otra ronda.'
})

function cambiarModo(nuevoModo) {
  modoQuiz.value = nuevoModo
  temaElegido.value = nuevoModo === 'artista' ? 'Coldplay' : 'Rock'
  errorQuiz.value = ''
}

function etiquetaTipo(tipo) {
  if (tipo === 'audio') return 'ADIVINA POR EL AUDIO'
  if (tipo === 'complete_lyric') return 'COMPLETA LA CANCIÓN'
  if (tipo === 'true_false') return 'VERDADERO O FALSO'
  return 'MULTIPLE CHOICE'
}

function barajar(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizarTexto(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

function limpiarTituloBase(title = '') {
  return String(title || '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\s*-\s*(live|remix|acoustic|remaster(ed)?|radio edit|version|en vivo).*$/i, '')
    .trim()
}

function esAlbumReal(albumName = '') {
  const clean = String(albumName || '').trim()
  if (!clean) return false
  return !/\b-\s*(single|ep)\b/i.test(clean) && !/\(single\)/i.test(clean)
}

async function buscarVersoReal(artist, title) {
  try {
    const cleanTitle = limpiarTituloBase(title)
    const cleanArtist = String(artist || '').split(',')[0].trim()
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`
    )
    if (!res.ok) return null
    const items = await res.json()
    const match = Array.isArray(items) ? items.find(i => i.plainLyrics) : null
    if (!match?.plainLyrics) return null

    const lines = match.plainLyrics
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length >= 20 && l.length <= 80 && !l.startsWith('['))

    if (!lines.length) return null
    const line = lines[Math.floor(Math.random() * Math.min(lines.length, 16))]
    const words = line.split(/\s+/)
    if (words.length < 4) return null

    // Elegir de 1 a 3 palabras consecutivas para completar
    const maxSpan = Math.min(3, Math.max(1, words.length - 2))
    const span = 1 + Math.floor(Math.random() * maxSpan)
    const startIdx = Math.floor(Math.random() * (words.length - span + 1))

    const targetSlice = words.slice(startIdx, startIdx + span)
    const cleanedTarget = targetSlice
      .map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9']/g, ''))
      .filter(Boolean)
      .join(' ')

    if (cleanedTarget.length < 4) return null

    const blankedWords = [
      ...words.slice(0, startIdx),
      ...Array(span).fill('_____'),
      ...words.slice(startIdx + span)
    ]

    return {
      versoConHueco: blankedWords.join(' '),
      palabraFaltante: cleanedTarget,
      cantidadPalabras: span
    }
  } catch {
    return null
  }
}

async function iniciarQuiz() {
  const query = temaElegido.value.trim()
  if (!query) return
  cargando.value = true
  errorQuiz.value = ''
  detenerAudioYTimer()

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?media=music&entity=song&limit=50&term=${encodeURIComponent(query)}`
    )
    if (!res.ok) throw new Error('No se pudo conectar con el catálogo musical.')
    const data = await res.json()
    const rawTracks = (data.results || []).filter(
      t => t.trackName && t.artistName && t.collectionName
    )

    // Deduplicar por título base manteniendo el orden de popularidad de iTunes
    const vistos = new Set()
    const tracks = []
    for (const t of rawTracks) {
      const k = limpiarTituloBase(t.trackName).toLowerCase()
      if (!k || vistos.has(k)) continue
      vistos.add(k)
      tracks.push(t)
    }

    if (tracks.length < 4) {
      throw new Error(`No encontramos suficientes canciones para "${query}". Prueba con otro artista o género.`)
    }

    // Priorizar las canciones más populares (primeras 20 únicas) y barajarlas
    const populares = tracks.slice(0, 20)
    const pool = barajar(populares)
    const usedKeys = new Set()
    const trackKey = t => limpiarTituloBase(t.trackName).toLowerCase()

    const generadas = []
    const realAlbums = [...new Set(populares.map(t => t.collectionName).filter(esAlbumReal))]
    const allArtists = [...new Set(populares.map(t => t.artistName).filter(Boolean))]
    const allTitles = populares.map(t => t.trackName)

    // 1. Hasta 3 preguntas de "Completar la letra" (1 a 3 palabras, sin repetir tema)
    const lyricCandidates = pool.slice(0, 6)
    const lyricResults = await Promise.all(
      lyricCandidates.map(t => buscarVersoReal(t.artistName, t.trackName))
    )

    for (let i = 0; i < lyricCandidates.length && generadas.length < 3; i++) {
      const ly = lyricResults[i]
      const tr = lyricCandidates[i]
      if (ly && !usedKeys.has(trackKey(tr))) {
        usedKeys.add(trackKey(tr))
        generadas.push({
          tipo: 'complete_lyric',
          enunciado: `Completa ${ly.cantidadPalabras === 1 ? 'la palabra que falta' : `las ${ly.cantidadPalabras} palabras que faltan`} en "${tr.trackName}" (${tr.artistName}):`,
          versoConHueco: ly.versoConHueco,
          respuestaCorrecta: ly.palabraFaltante,
          cantidadPalabras: ly.cantidadPalabras,
          portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
          trackNombre: tr.trackName,
          trackArtista: tr.artistName
        })
      }
    }

    // 2. Hasta 3 preguntas de Audio con los temas populares que aún no se usaron
    const audioTracks = pool.filter(t => t.previewUrl && !usedKeys.has(trackKey(t)))
    for (const tr of audioTracks) {
      if (generadas.filter(g => g.tipo === 'audio').length >= 3) break
      const distractors = barajar(allTitles.filter(x => x !== tr.trackName)).slice(0, 3)
      if (distractors.length < 3) continue
      usedKeys.add(trackKey(tr))
      generadas.push({
        tipo: 'audio',
        enunciado: 'Escucha este fragmento: ¿qué canción está sonando?',
        previewUrl: tr.previewUrl,
        opciones: barajar([tr.trackName, ...distractors]),
        respuestaCorrecta: tr.trackName
      })
    }

    // 3. Completar hasta 10 preguntas SIN REPETIR CANCIONES
    const restantes = pool.filter(t => !usedKeys.has(trackKey(t)))
    for (const tr of restantes) {
      if (generadas.length >= 10) break
      usedKeys.add(trackKey(tr))
      const mod = generadas.length % 4

      // Álbum real (nunca "- Single" ni "- EP")
      if (mod === 0 && esAlbumReal(tr.collectionName) && realAlbums.length >= 4) {
        const distractors = barajar(realAlbums.filter(a => a !== tr.collectionName)).slice(0, 3)
        if (distractors.length === 3) {
          generadas.push({
            tipo: 'multiple_choice',
            enunciado: `¿A qué álbum pertenece la canción "${tr.trackName}"?`,
            opciones: barajar([tr.collectionName, ...distractors]),
            respuestaCorrecta: tr.collectionName,
            portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
            trackNombre: tr.trackName,
            trackArtista: tr.artistName
          })
          continue
        }
      }

      // Año de lanzamiento más difícil (±1 / ±2 años)
      if ((mod === 1 || mod === 0) && tr.releaseDate) {
        const yNum = new Date(tr.releaseDate).getFullYear()
        if (yNum > 1950) {
          const fakeSet = new Set([String(yNum - 1), String(yNum + 1), String(yNum - 2), String(yNum + 2)])
          fakeSet.delete(String(yNum))
          const fakeYears = barajar(Array.from(fakeSet)).slice(0, 3)
          generadas.push({
            tipo: 'multiple_choice',
            enunciado: `¿En qué año se lanzó "${tr.trackName}" de ${tr.artistName}?`,
            opciones: barajar([String(yNum), ...fakeYears]),
            respuestaCorrecta: String(yNum),
            portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
            trackNombre: tr.trackName,
            trackArtista: tr.artistName
          })
          continue
        }
      }

      // Intérprete (cuando hay al menos 4 artistas en el pool, ej. modo Género)
      if (mod === 2 && allArtists.length >= 4) {
        const distractors = barajar(allArtists.filter(a => a !== tr.artistName)).slice(0, 3)
        if (distractors.length === 3) {
          generadas.push({
            tipo: 'multiple_choice',
            enunciado: `¿Quién interpreta la canción "${tr.trackName}"?`,
            opciones: barajar([tr.artistName, ...distractors]),
            respuestaCorrecta: tr.artistName,
            portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
            trackNombre: tr.trackName,
            trackArtista: tr.artistName
          })
          continue
        }
      }

      // Verdadero o Falso (con año o álbum real)
      if (esAlbumReal(tr.collectionName) && realAlbums.length >= 2) {
        const esVerdadero = Math.random() > 0.5
        const albumMostrado = esVerdadero
          ? tr.collectionName
          : (realAlbums.find(a => a !== tr.collectionName) || tr.collectionName)
        generadas.push({
          tipo: 'true_false',
          enunciado: `Verdadero o Falso: "${tr.trackName}" pertenece al álbum "${albumMostrado}".`,
          opciones: ['Verdadero', 'Falso'],
          respuestaCorrecta: albumMostrado === tr.collectionName ? 'Verdadero' : 'Falso',
          portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
          trackNombre: tr.trackName,
          trackArtista: tr.artistName
        })
      } else {
        const yNum = new Date(tr.releaseDate || Date.now()).getFullYear()
        const esVerdadero = Math.random() > 0.5
        const shownYear = esVerdadero ? yNum : (yNum + (Math.random() > 0.5 ? 1 : -1))
        generadas.push({
          tipo: 'true_false',
          enunciado: `Verdadero o Falso: "${tr.trackName}" se lanzó en el año ${shownYear}.`,
          opciones: ['Verdadero', 'Falso'],
          respuestaCorrecta: shownYear === yNum ? 'Verdadero' : 'Falso',
          portada: tr.artworkUrl100?.replace('100x100bb', '200x200bb') || '',
          trackNombre: tr.trackName,
          trackArtista: tr.artistName
        })
      }
    }

    preguntas.value = barajar(generadas).slice(0, 10)
    temaActivo.value = query
    indiceActual.value = 0
    puntaje.value = 0
    historialRespuestas.value = []
    fase.value = 'playing'
    prepararPreguntaActual()
  } catch (err) {
    errorQuiz.value = err.message || 'No se pudo generar el quiz.'
  } finally {
    cargando.value = false
  }
}

function detenerAudioYTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (previewAudio) {
    previewAudio.pause()
    previewAudio.src = ''
  }
  audioSonando.value = false
}

function prepararPreguntaActual() {
  detenerAudioYTimer()
  respondida.value = false
  tiempoAgotado.value = false
  respuestaUsuario.value = ''
  respuestaTexto.value = ''
  intentoFallidoTexto.value = ''
  esUltimaCorrecta.value = false
  tiempoRestante.value = 20

  timerInterval = setInterval(() => {
    if (respondida.value) return
    if (tiempoRestante.value > 1) {
      tiempoRestante.value -= 1
    } else {
      tiempoRestante.value = 0
      tiempoAgotado.value = true
      registrarRespuesta('')
    }
  }, 1000)

  if (preguntaActual.value?.tipo === 'audio' && preguntaActual.value.previewUrl) {
    togglePreviewAudio()
  }
}

function togglePreviewAudio() {
  const url = preguntaActual.value?.previewUrl
  if (!url) return
  if (!previewAudio) {
    previewAudio = new Audio()
    previewAudio.addEventListener('ended', () => {
      audioSonando.value = false
    })
  }
  if (audioSonando.value) {
    previewAudio.pause()
    audioSonando.value = false
  } else {
    if (previewAudio.src !== url) previewAudio.src = url
    previewAudio.play().then(() => {
      audioSonando.value = true
    }).catch(() => {
      audioSonando.value = false
    })
  }
}

function seleccionarOpcion(opcion) {
  if (respondida.value) return
  registrarRespuesta(opcion)
}

function enviarRespuestaTexto() {
  if (respondida.value || !respuestaTexto.value.trim() || !preguntaActual.value) return
  const intento = respuestaTexto.value.trim()
  const esCorrecta =
    normalizarTexto(intento) === normalizarTexto(preguntaActual.value.respuestaCorrecta)
  if (esCorrecta) {
    intentoFallidoTexto.value = ''
    registrarRespuesta(intento)
  } else {
    // En completar la letra, dejar intentar todas las veces hasta que acierte o se acabe el tiempo
    intentoFallidoTexto.value = 'No coincide, ¡sigue intentando!'
    respuestaTexto.value = ''
  }
}

function registrarRespuesta(valor) {
  if (respondida.value || !preguntaActual.value) return
  respondida.value = true
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (previewAudio) {
    previewAudio.pause()
    audioSonando.value = false
  }

  respuestaUsuario.value = valor
  const correcta =
    normalizarTexto(valor) === normalizarTexto(preguntaActual.value.respuestaCorrecta)
  esUltimaCorrecta.value = correcta
  if (correcta) puntaje.value += 1

  historialRespuestas.value.push({
    enunciado: preguntaActual.value.enunciado,
    respuestaUsuario: valor,
    respuestaCorrecta: preguntaActual.value.respuestaCorrecta,
    correcta
  })
}

function siguientePregunta() {
  if (indiceActual.value + 1 < preguntas.value.length) {
    indiceActual.value += 1
    prepararPreguntaActual()
  } else {
    detenerAudioYTimer()
    fase.value = 'result'
  }
}

function volverAConfigurar() {
  detenerAudioYTimer()
  fase.value = 'setup'
}

onBeforeUnmount(() => {
  detenerAudioYTimer()
})
</script>

<style scoped>
.quiz-page {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quiz-setup-card,
.quiz-play-card,
.quiz-result-card {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.quiz-hero-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.quiz-trophy-badge {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: rgba(184, 223, 109, 0.14);
  border: 1px solid rgba(184, 223, 109, 0.35);
  color: var(--lime);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.quiz-trophy-badge.big {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  margin: 0 auto;
}

.quiz-hero-head h2 {
  margin: 4px 0 6px;
  font-size: 26px;
}

.quiz-mode-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quiz-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: #141814;
  border: 1px solid #2c332b;
  color: #aeb6ad;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.quiz-mode-btn.active {
  background: rgba(184, 223, 109, 0.16);
  border-color: var(--lime);
  color: var(--lime);
}

.quiz-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 46px;
  border-radius: 14px;
  background: #141814;
  border: 1px solid #2e362d;
  color: #aeb6ad;
}

.quiz-search-box input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--cream);
  font-size: 14px;
}

.quiz-clear-x {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: #cfd5ce;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.quiz-chips-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quiz-chip {
  padding: 7px 14px;
  border-radius: 999px;
  background: #181c18;
  border: 1px solid #2b312a;
  color: #cfd5ce;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quiz-chip:hover,
.quiz-chip.active {
  background: rgba(184, 223, 109, 0.16);
  border-color: var(--lime);
  color: var(--lime);
}

.quiz-start-row {
  display: flex;
  justify-content: flex-start;
}

.quiz-start-btn {
  padding: 13px 24px;
  font-size: 14px;
}

/* Pantalla de juego */
.quiz-play-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.quiz-progress-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.quiz-badge-tema {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(184, 223, 109, 0.14);
  color: var(--lime);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.quiz-score-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #cfd5ce;
  font-size: 12px;
  font-weight: 600;
}

.quiz-timer-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(30, 215, 96, 0.14);
  border: 1px solid rgba(30, 215, 96, 0.4);
  color: #1ed760;
  font-size: 14px;
  font-weight: 800;
}

.quiz-timer-pill.warning {
  background: rgba(231, 187, 89, 0.16);
  border-color: var(--yellow);
  color: var(--yellow);
}

.quiz-timer-pill.danger {
  background: rgba(232, 121, 93, 0.18);
  border-color: var(--red);
  color: var(--red);
}

.quiz-timer-track {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.quiz-timer-fill {
  height: 100%;
  background: #1ed760;
  transition: width 0.9s linear, background-color 0.2s ease;
}

.quiz-timer-fill.warning {
  background: var(--yellow);
}

.quiz-timer-fill.danger {
  background: var(--red);
}

.quiz-question-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-type-tag {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--lime);
  background: rgba(184, 223, 109, 0.1);
  padding: 4px 10px;
  border-radius: 999px;
}

.quiz-question-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
}

.quiz-track-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #141814;
  border: 1px solid #262c25;
}

.quiz-hint-cover {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  object-fit: cover;
}

.quiz-track-hint strong {
  display: block;
  font-size: 13px;
}

.quiz-track-hint small {
  color: #939b92;
  font-size: 12px;
}

.quiz-audio-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: #141814;
  border: 1px solid #283027;
}

.quiz-lyric-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: #141814;
  border: 1px solid #283027;
}

.quiz-lyric-quote {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  font-style: italic;
}

.quiz-lyric-form {
  display: flex;
  gap: 10px;
}

.quiz-lyric-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: #1b201b;
  border: 1px solid #30382f;
  color: #ffffff;
  font-size: 14px;
  outline: none;
}

.quiz-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quiz-option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border-radius: 12px;
  background: #141814;
  border: 1px solid #2c332b;
  color: #e7ece6;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quiz-option-btn:hover:not(:disabled) {
  border-color: var(--lime);
  background: rgba(184, 223, 109, 0.08);
}

.quiz-option-btn.correct {
  border-color: #1ed760;
  background: rgba(30, 215, 96, 0.16);
  color: #ffffff;
}

.quiz-option-btn.wrong {
  border-color: var(--red);
  background: rgba(232, 121, 93, 0.16);
  color: #ffffff;
}

.quiz-option-letter {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.quiz-option-text {
  min-width: 0;
  word-break: break-word;
}

.quiz-feedback-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  flex-wrap: wrap;
}

.quiz-feedback-bar.ok {
  background: rgba(30, 215, 96, 0.14);
  border: 1px solid rgba(30, 215, 96, 0.4);
  color: #d6f5df;
}

.quiz-feedback-bar.fail {
  background: rgba(232, 121, 93, 0.14);
  border: 1px solid rgba(232, 121, 93, 0.45);
  color: #fbdad2;
}

.quiz-feedback-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiz-feedback-text strong {
  display: block;
  font-size: 14px;
}

.quiz-feedback-text small {
  font-size: 12px;
}

/* Resultados */
.quiz-result-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.quiz-result-hero h2 {
  margin: 0;
  font-size: 28px;
}

.quiz-result-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 6px;
}

.quiz-review-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-review-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #141814;
  border: 1px solid #262c25;
}

.quiz-review-status {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.quiz-review-item.ok .quiz-review-status {
  background: rgba(30, 215, 96, 0.2);
  color: #1ed760;
}

.quiz-review-item.fail .quiz-review-status {
  background: rgba(232, 121, 93, 0.2);
  color: var(--red);
}

.quiz-review-body strong {
  display: block;
  font-size: 13px;
  margin-bottom: 3px;
}

.quiz-review-body small {
  font-size: 12px;
  color: #9ba39a;
}

@media (max-width: 640px) {
  .quiz-setup-card,
  .quiz-play-card,
  .quiz-result-card {
    padding: 18px 14px;
  }

  .quiz-hero-head {
    flex-direction: column;
  }

  .quiz-options-grid {
    grid-template-columns: 1fr;
  }

  .quiz-lyric-form {
    flex-direction: column;
  }

  .quiz-question-title {
    font-size: 17px;
  }

  .quiz-start-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
