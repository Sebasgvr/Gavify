<template>
  <div>
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

        <!-- COLUMNA IZQUIERDA: Carátula, Título, Artista, Guardar y Quitar -->
        <div class="player-left">
          <div class="player-artwork-box">
            <img
              v-if="player.currentTrack.value.portada_url"
              :src="player.currentTrack.value.portada_url"
              :alt="player.currentTrack.value.titulo"
              class="player-artwork-img"
            />
            <div v-else class="player-artwork-fallback">
              <AppIcon name="music" :size="20" />
            </div>
          </div>

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
              class="player-icon-btn"
              :class="{ saved: player.isCurrentSaved.value }"
              :title="player.isCurrentSaved.value ? 'Guardada en tu biblioteca' : 'Guardar canción'"
              @click="guardarCancionActual"
            >
              <AppIcon :name="player.isCurrentSaved.value ? 'heart-filled' : 'heart'" :size="18" />
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
              :class="{ active: player.isRepeat.value }"
              title="Repetir canción"
              @click="player.toggleRepeat()"
            >
              <AppIcon name="repeat" :size="17" />
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

        <!-- COLUMNA DERECHA: Video (ojito), Letras (texto), Volumen y Quitar -->
        <div class="player-right">
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
import { computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MarqueeText from '@/components/MarqueeText.vue'
import { usePlayer } from '@/services/player'
import { dbService } from '@/services/db'
import { useAuth } from '@/services/auth'

const player = usePlayer()
const auth = useAuth()

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
  () => player.currentTrack.value?.id,
  async (newId) => {
    if (newId) {
      player.isCurrentSaved.value = await dbService.isCancionFavorita(newId)
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

.player-artwork-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  background: #1d231d;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
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
  color: var(--lime);
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

.player-icon-btn.saved {
  color: #1ed760;
  border-color: rgba(30, 215, 96, 0.45);
  background: rgba(30, 215, 96, 0.12);
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
