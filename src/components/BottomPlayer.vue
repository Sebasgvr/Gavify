<template>
  <div>
    <!-- VENTANA DE FILA DE REPRODUCCIÓN (COLA / LISTA AL COSTADO IZQUIERDO) -->
    <transition name="queue-slide">
      <section
        v-if="player.currentTrack.value && player.showQueue.value"
        class="queue-window"
        :class="{ 'queue-expanded': player.isQueueExpanded.value }"
      >
        <div class="queue-window-head">
          <div class="queue-head-meta">
            <AppIcon name="queue" :size="18" />
            <div>
              <strong>Fila de reproducción</strong>
              <small>{{ player.queue.value.length }} {{ player.queue.value.length === 1 ? 'canción' : 'canciones' }} en la lista</small>
            </div>
          </div>

          <div class="queue-head-actions">
            <button
              type="button"
              class="queue-head-btn"
              :title="player.isQueueExpanded.value ? 'Achicar fila' : 'Agrandar fila'"
              @click="player.toggleExpandQueue()"
            >
              <AppIcon :name="player.isQueueExpanded.value ? 'collapse' : 'expand'" :size="14" />
              <span>{{ player.isQueueExpanded.value ? 'Achicar' : 'Agrandar' }}</span>
            </button>
            <button
              type="button"
              class="queue-close-btn"
              title="Cerrar fila de reproducción"
              @click="player.showQueue.value = false"
            >
              <AppIcon name="close" :size="14" />
            </button>
          </div>
        </div>

        <div class="queue-window-body">
          <!-- CANCIONES ANTERIORES EN LA FILA -->
          <div v-if="anterioresEnCola.length" class="queue-previous-box">
            <span class="queue-section-label queue-label-muted">ANTERIORES EN LA FILA</span>
            <div class="queue-track-list">
              <div
                v-for="item in anterioresEnCola"
                :key="'prev-' + item.actualIndex"
                class="queue-track-row is-previous-row"
                :title="'Volver a reproducir ' + item.track.titulo"
                @click="player.playTrackAt(item.actualIndex)"
              >
                <div class="queue-row-left">
                  <span class="queue-pos-num">↺</span>
                  <VinylThumb
                    :src="item.track.portada_url"
                    :alt="item.track.titulo"
                    :size="36"
                  />
                  <div class="queue-track-meta">
                    <div class="queue-track-title-wrap">
                      <MarqueeText :text="item.track.titulo" class="queue-track-title" />
                    </div>
                    <div class="queue-track-artist-wrap">
                      <MarqueeText :text="item.track.artista" class="queue-track-artist" />
                      <span class="queue-origin-tag">{{ etiquetaPlataforma(item.track.plataforma_origen) }}</span>
                    </div>
                  </div>
                </div>
                <div class="queue-row-right">
                  <span class="queue-duration">{{ formatearDuracion(item.track.duracion_segundos) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- CANCIÓN QUE SE ESTÁ REPRODUCIENDO AHORA -->
          <div class="queue-now-playing-box">
            <span class="queue-section-label">SONANDO AHORA</span>
            <div class="queue-track-row is-current-row">
              <div class="queue-row-left">
                <VinylThumb
                  :src="player.currentTrack.value.portada_url"
                  :alt="player.currentTrack.value.titulo"
                  :size="42"
                  :spinning="player.isPlaying.value"
                />
                <div class="queue-track-meta">
                  <div class="queue-track-title-wrap">
                    <MarqueeText :text="player.currentTrack.value.titulo" class="queue-track-title active" />
                  </div>
                  <div class="queue-track-artist-wrap">
                    <MarqueeText :text="player.currentTrack.value.artista" class="queue-track-artist" />
                  </div>
                </div>
              </div>
              <div class="queue-row-badge">
                <AppIcon name="play" :size="12" />
                <span>En vivo</span>
              </div>
            </div>
          </div>

          <!-- SIGUIENTES EN LA FILA (CARGA DE A 20 TEMAS) -->
          <div class="queue-upcoming-box">
            <div class="queue-upcoming-header">
              <span class="queue-section-label">A CONTINUACIÓN EN LA COLA</span>
              <small v-if="siguientesEnCola.length" class="queue-count-tag">
                Mostrando {{ visibleQueueCount }} de {{ siguientesEnCola.length }} siguientes
              </small>
            </div>

            <div v-if="!siguientesEnCola.length" class="queue-empty-upcoming">
              <p>No hay más canciones en la fila de reproducción.</p>
            </div>

            <div v-else class="queue-track-list">
              <div
                v-for="item in visibleQueueList"
                :key="item.actualIndex"
                class="queue-track-row"
                :title="'Reproducir ' + item.track.titulo"
                @click="player.playTrackAt(item.actualIndex)"
              >
                <div class="queue-row-left">
                  <span class="queue-pos-num">#{{ item.posicion }}</span>
                  <VinylThumb
                    :src="item.track.portada_url"
                    :alt="item.track.titulo"
                    :size="38"
                  />
                  <div class="queue-track-meta">
                    <div class="queue-track-title-wrap">
                      <MarqueeText :text="item.track.titulo" class="queue-track-title" />
                    </div>
                    <div class="queue-track-artist-wrap">
                      <MarqueeText :text="item.track.artista" class="queue-track-artist" />
                      <span class="queue-origin-tag">{{ etiquetaPlataforma(item.track.plataforma_origen) }}</span>
                    </div>
                  </div>
                </div>

                <div class="queue-row-right">
                  <span class="queue-duration">{{ formatearDuracion(item.track.duracion_segundos) }}</span>
                  <button
                    type="button"
                    class="queue-play-hover-btn"
                    title="Poner ahora"
                    @click.stop="player.playTrackAt(item.actualIndex)"
                  >
                    <AppIcon name="play" :size="13" />
                  </button>
                </div>
              </div>

              <!-- BOTÓN PARA CARGAR DE A 20 TEMAS MÁS -->
              <div v-if="quedanMasPorCargar" class="queue-load-more-wrap">
                <button
                  type="button"
                  class="btn-queue-load-more"
                  @click="cargar20MasEnFila"
                >
                  <AppIcon name="plus" :size="14" />
                  <span>Cargar siguientes 20 canciones (+{{ Math.min(20, siguientesEnCola.length - limiteFilaVisible) }})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </transition>

    <!-- VENTANA DE LETRAS DE LA CANCIÓN (LRCLIB / LYRICS API) -->
    <transition name="lyrics-fade">
      <section
        v-if="player.currentTrack.value && player.showLyrics.value"
        class="lyrics-window"
        :class="{ 'lyrics-expanded': player.isLyricsExpanded.value }"
      >
        <div class="lyrics-window-head">
          <div class="lyrics-head-meta">
            <AppIcon name="text" :size="16" />
            <div>
              <strong>Letras — {{ player.currentTrack.value.titulo }}</strong>
              <small>{{ player.currentTrack.value.artista }}</small>
            </div>
          </div>

          <div class="lyrics-head-actions">
            <button
              type="button"
              class="lyrics-head-btn"
              @click="player.toggleExpandLyrics()"
            >
              <AppIcon :name="player.isLyricsExpanded.value ? 'collapse' : 'expand'" :size="14" />
              <span>{{ player.isLyricsExpanded.value ? 'Achicar' : 'Agrandar' }}</span>
            </button>
            <button
              type="button"
              class="lyrics-close-btn"
              title="Cerrar letras"
              @click="player.showLyrics.value = false"
            >
              <AppIcon name="close" :size="14" />
            </button>
          </div>
        </div>

        <div class="lyrics-window-body">
          <div v-if="player.isLoadingLyrics.value" class="lyrics-loading">
            <p>Buscando letra oficial de "{{ player.currentTrack.value.titulo }}"...</p>
          </div>

          <!-- Letras sincronizadas por tiempo -->
          <div v-else-if="player.syncedLyrics.value.length" class="lyrics-synced-list">
            <p
              v-for="(line, idx) in player.syncedLyrics.value"
              :key="idx"
              class="lyric-line"
              :class="{ 'active-line': idx === activeLyricIndex }"
              @click="player.seekTo(line.time)"
            >
              {{ line.text }}
            </p>
          </div>

          <!-- Letras en texto plano -->
          <div v-else class="lyrics-plain-box">
            <p
              v-for="(line, idx) in plainLyricsLines"
              :key="idx"
              class="lyric-plain-line"
            >
              {{ line || ' ' }}
            </p>
          </div>
        </div>
      </section>
    </transition>

    <!-- FOOTER FIJO REPRODUCTOR -->
    <transition name="player-slide">
      <footer v-if="player.currentTrack.value" class="bottom-player-footer">
        <!-- Notificación flotante al guardar -->
        <div v-if="player.saveFeedback.value" class="player-toast">
          <AppIcon name="check" :size="14" />
          <span>{{ player.saveFeedback.value }}</span>
        </div>

        <!-- COLUMNA IZQUIERDA: Carátula en Disco de Vinilo, Título, Artista, Guardar y Quitar -->
        <div class="player-left">
          <VinylThumb
            :src="player.currentTrack.value.portada_url"
            :alt="player.currentTrack.value.titulo"
            :size="56"
            :spinning="player.isPlaying.value"
          />

          <div class="player-track-meta">
            <div class="player-track-title-wrap">
              <MarqueeText :text="player.currentTrack.value.titulo" class="player-track-title" />
            </div>
            <div class="player-track-artist-wrap">
              <MarqueeText :text="player.currentTrack.value.artista" class="player-track-artist" />
              <span class="player-origin-tag">
                {{ etiquetaPlataforma(player.currentTrack.value.plataforma_origen) }}
              </span>
            </div>
          </div>

          <div class="player-quick-actions">
            <button
              class="player-icon-btn btn-favorite-fire"
              :class="{ 'is-favorite': player.isCurrentSaved.value }"
              :title="player.isCurrentSaved.value ? 'En tus canciones favoritas (guardada)' : 'Marcar como favorita (me gusta)'"
              @click="guardarCancionActual"
            >
              <AppIcon :name="player.isCurrentSaved.value ? 'fire-filled' : 'fire'" :size="18" />
            </button>

            <button
              class="player-icon-btn danger-hover"
              title="Quitar canción del reproductor"
              @click="player.removeCurrentTrack()"
            >
              <AppIcon name="trash" :size="17" />
            </button>
          </div>
        </div>

        <!-- COLUMNA CENTRAL: Aleatorizar, Anterior, Play/Pausa, Siguiente, Repetir + Barra de Progreso -->
        <div class="player-center">
          <div class="player-transport-buttons">
            <button
              class="transport-btn"
              :class="{ active: player.isShuffle.value }"
              title="Aleatorizar reproducción"
              @click="player.toggleShuffle()"
            >
              <AppIcon name="shuffle" :size="17" />
            </button>

            <button
              class="transport-btn"
              title="Canción anterior"
              @click="player.prevTrack()"
            >
              <AppIcon name="prev" :size="19" />
            </button>

            <button
              class="play-pause-circle"
              :title="player.isPlaying.value ? 'Pausar' : 'Reproducir'"
              @click="player.togglePlay()"
            >
              <AppIcon :name="player.isPlaying.value ? 'pause' : 'play'" :size="20" />
            </button>

            <button
              class="transport-btn"
              title="Siguiente canción"
              @click="player.nextTrack()"
            >
              <AppIcon name="next" :size="19" />
            </button>

            <button
              class="transport-btn"
              :class="{ active: player.isRepeat.value || player.isRepeatOne.value }"
              :title="player.isRepeatOne.value ? 'Repetir el mismo tema (activado)' : player.isRepeat.value ? 'Repetir lista completa (activado)' : 'Repetir desactivado'"
              @click="player.toggleRepeat()"
            >
              <AppIcon :name="player.isRepeatOne.value ? 'repeat-one' : 'repeat'" :size="17" />
            </button>
          </div>

          <div class="player-scrubber-row">
            <span class="time-label">{{ formatearTiempo(player.currentTime.value) }}</span>
            <div class="range-wrapper">
              <input
                type="range"
                min="0"
                :max="Math.max(1, Math.floor(player.duration.value || 210))"
                :value="Math.floor(player.currentTime.value)"
                class="custom-range progress-range"
                :style="{ '--progress-pct': porcentajeProgreso + '%' }"
                @input="onSeekInput"
              />
            </div>
            <span class="time-label">{{ formatearTiempo(player.duration.value) }}</span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: Fila de reproducción, Video, Letras, Volumen y Quitar -->
        <div class="player-right">
          <button
            class="close-player-pill"
            :class="{ 'video-active-pill': player.showQueue.value }"
            title="Ver fila de reproducción (canciones siguientes)"
            @click="player.toggleQueue()"
          >
            <AppIcon name="queue" :size="15" />
            <span>Fila</span>
          </button>

          <button
            class="close-player-pill"
            :class="{ 'video-active-pill': player.showMiniVideo.value }"
            title="Ver video de la canción"
            @click="player.toggleMiniVideo()"
          >
            <AppIcon name="eye" :size="15" />
            <span>Video</span>
          </button>

          <button
            class="close-player-pill"
            :class="{ 'video-active-pill': player.showLyrics.value }"
            title="Ver letra de la canción"
            @click="player.toggleLyrics()"
          >
            <AppIcon name="text" :size="15" />
            <span>Letras</span>
          </button>

          <div class="volume-control-group">
            <button
              class="transport-btn"
              :title="player.isMuted.value ? 'Activar sonido' : 'Silenciar'"
              @click="player.toggleMute()"
            >
              <AppIcon :name="player.isMuted.value || player.volume.value === 0 ? 'volume-mute' : 'volume'" :size="18" />
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="player.isMuted.value ? 0 : player.volume.value"
              class="custom-range volume-range"
              :style="{ '--progress-pct': ((player.isMuted.value ? 0 : player.volume.value) * 100) + '%' }"
              title="Subir o bajar volumen"
              @input="onVolumeInput"
            />
          </div>

          <button
            class="close-player-pill"
            title="Cerrar reproductor"
            @click="player.closePlayer()"
          >
            <AppIcon name="close" :size="15" />
            <span>Quitar</span>
          </button>
        </div>
      </footer>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MarqueeText from '@/components/MarqueeText.vue'
import VinylThumb from '@/components/VinylThumb.vue'
import { usePlayer } from '@/services/player'
import { dbService } from '@/services/db'
import { useAuth } from '@/services/auth'

const player = usePlayer()
const auth = useAuth()

// Paginación de a 20 temas para la fila de reproducción
const limiteFilaVisible = ref(20)

watch(
  () => player.currentTrack.value?.id,
  () => {
    // Al cambiar de tema reseteamos la fila a sus primeros 20 siguientes
    limiteFilaVisible.value = 20
  }
)

const anterioresEnCola = computed(() => {
  const q = player.queue.value || []
  const curIdx = player.currentIndex.value
  if (!q.length || curIdx === -1) return []

  const resultado = []
  if (player.isShuffle.value && player.shuffleOrder.value?.length === q.length) {
    const currentPos = player.shuffleOrder.value.indexOf(curIdx)
    const prevIndices = currentPos > 0 ? player.shuffleOrder.value.slice(Math.max(0, currentPos - 10), currentPos) : []
    for (const actualIndex of prevIndices) {
      if (q[actualIndex]) {
        resultado.push({ track: q[actualIndex], actualIndex })
      }
    }
  } else {
    const start = Math.max(0, curIdx - 10)
    for (let i = start; i < curIdx; i++) {
      if (q[i]) {
        resultado.push({ track: q[i], actualIndex: i })
      }
    }
  }
  return resultado
})

const siguientesEnCola = computed(() => {
  const q = player.queue.value || []
  const curIdx = player.currentIndex.value
  if (!q.length || curIdx === -1) return []

  const resultado = []

  if (player.isShuffle.value && player.shuffleOrder.value?.length === q.length) {
    const currentPos = player.shuffleOrder.value.indexOf(curIdx)
    const upcomingIndices = currentPos !== -1
      ? player.shuffleOrder.value.slice(currentPos + 1)
      : player.shuffleOrder.value.filter(idx => idx !== curIdx)

    upcomingIndices.forEach((actualIndex, idxOffset) => {
      const track = q[actualIndex]
      if (track) {
        resultado.push({
          track,
          actualIndex,
          posicion: idxOffset + 1
        })
      }
    })
  } else {
    for (let i = curIdx + 1; i < q.length; i++) {
      resultado.push({
        track: q[i],
        actualIndex: i,
        posicion: i + 1
      })
    }
  }

  return resultado
})

const visibleQueueList = computed(() => {
  return siguientesEnCola.value.slice(0, limiteFilaVisible.value)
})

const visibleQueueCount = computed(() => {
  return visibleQueueList.value.length
})

const quedanMasPorCargar = computed(() => {
  return siguientesEnCola.value.length > limiteFilaVisible.value
})

function cargar20MasEnFila() {
  limiteFilaVisible.value += 20
}

function formatearDuracion(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0))
  const mins = Math.floor(s / 60)
  const rem = String(s % 60).padStart(2, '0')
  return `${mins}:${rem}`
}

const porcentajeProgreso = computed(() => {
  const dur = Number(player.duration.value) || 1
  const cur = Number(player.currentTime.value) || 0
  return Math.min(100, Math.max(0, (cur / dur) * 100))
})

const plainLyricsLines = computed(() => {
  return String(player.plainLyrics.value || '').split('\n')
})

const activeLyricIndex = computed(() => {
  const list = player.syncedLyrics.value || []
  if (!list.length) return -1
  const cur = Number(player.currentTime.value) || 0
  let active = 0
  for (let i = 0; i < list.length; i++) {
    if (cur >= list[i].time) {
      active = i
    } else {
      break
    }
  }
  return active
})

function onSeekInput(event) {
  player.seekTo(Number(event.target.value))
}

function onVolumeInput(event) {
  player.setVolume(Number(event.target.value))
}

async function guardarCancionActual() {
  const track = player.currentTrack.value
  if (!track) return
  try {
    const res = await dbService.toggleCancionFavorita(track)
    player.isCurrentSaved.value = res.isLiked
    player.saveFeedback.value = res.isLiked
      ? 'Guardada en Tus me gusta'
      : 'Quitada de Tus me gusta'
    setTimeout(() => {
      player.saveFeedback.value = ''
    }, 2400)
  } catch (e) {
    console.warn('Error en toggle favoritos:', e)
  }
}

watch(
  () => [player.currentTrack.value?.id, player.currentTrack.value?.titulo, player.currentTrack.value?.artista],
  async () => {
    const track = player.currentTrack.value
    if (track) {
      player.isCurrentSaved.value = await dbService.isCancionFavorita(track)
    } else {
      player.isCurrentSaved.value = false
    }
  },
  { immediate: true }
)

function formatearTiempo(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0))
  const mins = Math.floor(s / 60)
  const rem = String(s % 60).padStart(2, '0')
  return `${mins}:${rem}`
}

function etiquetaPlataforma(plat) {
  const map = {
    spotify: 'Spotify',
    youtube_music: 'YT Music',
    youtube: 'YouTube',
    gavify: 'Gavify'
  }
  return map[plat] || 'Spotify'
}
</script>

<style scoped>
/* ========================================================================= */
/* VENTANA DE FILA DE REPRODUCCIÓN (AL COSTADO DERECHO, AGRANDABLE)          */
/* ========================================================================= */
.queue-window {
  position: fixed;
  right: 24px;
  left: auto;
  bottom: 104px;
  width: 420px;
  max-width: calc(100vw - 48px);
  height: 520px;
  max-height: calc(100vh - 130px);
  background: rgba(14, 18, 14, 0.98);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.85);
  z-index: 946;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-window.queue-expanded {
  right: 24px;
  left: auto;
  top: 24px;
  bottom: 104px;
  width: 580px;
  height: calc(100vh - 128px);
  max-height: calc(100vh - 128px);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95);
  border-color: rgba(30, 215, 96, 0.3);
}

.queue-window-head {
  height: 54px;
  padding: 0 16px;
  background: #111511;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.queue-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1ed760;
  min-width: 0;
}

.queue-head-meta div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue-head-meta strong {
  font-size: 13px;
  color: #e7ece6;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-head-meta small {
  font-size: 11px;
  color: #8c978b;
}

.queue-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.queue-head-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e7ece6;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.queue-head-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #1ed760;
}

.queue-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e7ece6;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 13px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.queue-close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ff5c5c;
}

.queue-window-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.queue-previous-box {
  opacity: 0.85;
}

.queue-label-muted {
  color: #8c978b !important;
}

.queue-track-row.is-previous-row {
  opacity: 0.78;
}

.queue-track-row.is-previous-row:hover {
  opacity: 1;
}

.queue-section-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #1ed760;
  margin-bottom: 8px;
}

.queue-now-playing-box {
  background: rgba(30, 215, 96, 0.06);
  border: 1px solid rgba(30, 215, 96, 0.22);
  border-radius: 12px;
  padding: 10px 12px;
}

.queue-upcoming-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.queue-count-tag {
  font-size: 11px;
  color: #8c978b;
}

.queue-empty-upcoming {
  padding: 24px 12px;
  text-align: center;
  color: #7d877c;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.queue-track-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-track-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.queue-track-row:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.queue-track-row.is-current-row {
  cursor: default;
  background: transparent;
  padding: 0;
}

.queue-track-row.is-current-row:hover {
  background: transparent;
  border-color: transparent;
  transform: none;
}

.queue-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.queue-pos-num {
  font-size: 11px;
  color: #6d776c;
  font-weight: 700;
  width: 22px;
  text-align: right;
  flex-shrink: 0;
}

.queue-track-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.queue-track-title-wrap {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.queue-track-title {
  font-size: 12px;
  font-weight: 700;
  color: #e2e8e1;
}

.queue-track-title.active {
  color: #1ed760;
}

.queue-track-artist-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.queue-track-artist {
  font-size: 11px;
  color: #8c978b;
}

.queue-origin-tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #626d61;
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 4px;
  border-radius: 4px;
  flex-shrink: 0;
}

.queue-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.queue-duration {
  font-size: 11px;
  color: #7a8479;
}

.queue-play-hover-btn {
  background: #1ed760;
  color: #0b0d0b;
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0.85;
  transition: all 0.15s ease;
}

.queue-play-hover-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.queue-row-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(30, 215, 96, 0.15);
  color: #1ed760;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.queue-load-more-wrap {
  padding-top: 8px;
  display: flex;
  justify-content: center;
}

.btn-queue-load-more {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.18);
  color: #d1d8d0;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.16s ease;
}

.btn-queue-load-more:hover {
  background: rgba(30, 215, 96, 0.12);
  border-color: #1ed760;
  color: #ffffff;
}

/* Transición animada suave para la fila */
.queue-slide-enter-active,
.queue-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-slide-enter-from,
.queue-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

/* Ventana de Letras (Chiquita o Expandida a todo el cuadro de interfaz) */
.lyrics-window {
  position: fixed;
  right: 24px;
  bottom: 104px;
  width: 380px;
  height: 420px;
  background: rgba(16, 20, 16, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.8);
  z-index: 945;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.22s ease;
}

.lyrics-window.lyrics-expanded {
  top: 0;
  left: 248px;
  right: 0;
  bottom: 90px;
  width: calc(100vw - 248px);
  height: calc(100vh - 90px);
  border-radius: 0;
  border-top: 0;
  border-right: 0;
}

.lyrics-window-head {
  height: 52px;
  padding: 0 18px;
  background: #121612;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.lyrics-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--lime);
  min-width: 0;
}

.lyrics-head-meta strong {
  display: block;
  font-size: 13px;
  color: #f0f4ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyrics-head-meta small {
  display: block;
  font-size: 11px;
  color: #8f988d;
}

.lyrics-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyrics-head-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e2e7e0;
  font-size: 11px;
  font-weight: 600;
}

.lyrics-head-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.lyrics-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e2e7e0;
  display: grid;
  place-items: center;
}

.lyrics-window-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px;
}

.lyrics-loading {
  color: #969e94;
  font-size: 13px;
  text-align: center;
  padding: 40px 0;
}

.lyrics-synced-list,
.lyrics-plain-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 680px;
  margin: 0 auto;
}

.lyric-line {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: #7c857a;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease;
}

.lyrics-expanded .lyric-line {
  font-size: 20px;
}

.lyric-line:hover {
  color: #cfd6ce;
}

.lyric-line.active-line {
  color: #ffffff;
  font-weight: 800;
  transform: scale(1.02);
  transform-origin: left center;
}

.lyric-plain-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #d6dcd5;
  min-height: 14px;
}

.lyrics-expanded .lyric-plain-line {
  font-size: 18px;
}

/* Footer Reproductor */
.bottom-player-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 90px;
  background: rgba(14, 17, 14, 0.96);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 -10px 34px rgba(0, 0, 0, 0.65);
  z-index: 950;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.35fr) minmax(260px, 1.15fr);
  align-items: center;
  gap: 18px;
  padding: 0 24px;
}

.player-toast {
  position: absolute;
  top: -46px;
  left: 28px;
  background: #1ed760;
  color: #0b0d0b;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

/* Izquierda */
.player-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.player-artwork-box.player-vinyl {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: repeating-radial-gradient(circle, #30362f 0 1.5px, #232823 2.5px 5px);
  box-shadow: 0 0 0 1px #596156, 0 6px 16px rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  position: relative;
}

.player-artwork-box.player-vinyl.is-spinning {
  animation: player-vinyl-spin 7s linear infinite;
}

@keyframes player-vinyl-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.player-vinyl-center {
  width: 31px;
  height: 31px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #161916;
  background: #c8a14d;
  position: relative;
  display: grid;
  place-items: center;
}

.player-vinyl-center::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #141714;
  border: 1px solid rgba(255, 255, 255, 0.25);
  z-index: 2;
}

.player-artwork-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.player-artwork-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #161916;
}

.player-track-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  max-width: 220px;
}

.player-track-title-wrap,
.player-track-artist-wrap {
  min-width: 0;
  max-width: 100%;
}

.player-track-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.player-track-artist {
  font-size: 12px;
  color: #9da49c;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.player-origin-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(184, 223, 109, 0.14);
  color: var(--lime);
}

.player-quick-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.player-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #b7beb6;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.player-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  transform: scale(1.05);
}

.player-icon-btn.btn-favorite-fire {
  color: #a4aca3;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.player-icon-btn.btn-favorite-fire:hover {
  color: #ff7844;
  border-color: rgba(255, 120, 68, 0.35);
  background: rgba(255, 120, 68, 0.12);
  transform: scale(1.12);
}

.player-icon-btn.btn-favorite-fire.is-favorite {
  color: #ffffff;
  border-color: #ff8c00;
  background: linear-gradient(135deg, #e03a1e 0%, #ff8c00 100%);
  box-shadow: 0 0 14px rgba(255, 140, 0, 0.55);
  animation: fire-pop 0.35s ease;
}

@keyframes fire-pop {
  0% { transform: scale(0.85); }
  50% { transform: scale(1.22); }
  100% { transform: scale(1); }
}

.player-icon-btn.danger-hover:hover {
  color: var(--red);
  border-color: rgba(232, 121, 93, 0.45);
  background: rgba(232, 121, 93, 0.12);
}

/* Centro */
.player-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 600px;
  justify-self: center;
}

.player-transport-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.transport-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: transparent;
  border: 0;
  color: #b5bcb4;
  display: grid;
  place-items: center;
  transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.transport-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.transport-btn.active {
  color: #1ed760;
  background: rgba(30, 215, 96, 0.14);
}

.play-pause-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #ffffff;
  color: #0b0d0b;
  border: 0;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.25);
  transition: transform 0.15s ease, background 0.15s ease;
}

.play-pause-circle:hover {
  transform: scale(1.07);
  background: var(--lime);
}

.player-scrubber-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.time-label {
  font-size: 11px;
  font-weight: 600;
  color: #969d95;
  min-width: 34px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.range-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.custom-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    #1ed760 0%,
    #1ed760 var(--progress-pct, 0%),
    rgba(255, 255, 255, 0.18) var(--progress-pct, 0%),
    rgba(255, 255, 255, 0.18) 100%
  );
  outline: none;
  cursor: pointer;
}

.custom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.custom-range:hover::-webkit-slider-thumb {
  transform: scale(1.2);
  background: #1ed760;
}

/* Derecha */
.player-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.volume-control-group {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 120px;
}

.volume-range {
  width: 82px;
}

.close-player-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cfd5ce;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.close-player-pill:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.video-active-pill {
  background: rgba(126, 166, 118, 0.22);
  border-color: #8eb886;
  color: #b8df6d;
}

.player-slide-enter-active,
.player-slide-leave-active,
.lyrics-fade-enter-active,
.lyrics-fade-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.player-slide-enter-from,
.player-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.lyrics-fade-enter-from,
.lyrics-fade-leave-to {
  transform: translateY(16px);
  opacity: 0;
}

@media (max-width: 980px) {
  .lyrics-window.lyrics-expanded {
    left: 78px;
    width: calc(100vw - 78px);
  }
}

@media (max-width: 900px) {
  .bottom-player-footer {
    grid-template-columns: 1fr 1.2fr;
    height: auto;
    padding: 12px 18px;
  }

  .player-right {
    display: none;
  }
}
</style>
