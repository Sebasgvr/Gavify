<template>
  <div>
    <div class="row">
      <div>
        <p class="eyebrow accent">BUENOS DÍAS, LUCÍA</p>
        <h2>Esto es lo que está sonando.</h2>
      </div>
      <button class="outline" @click="updateAnalysis">↻ Actualizar análisis</button>
    </div>

    <!-- Stats -->
    <div class="stats">
      <div v-for="(stat, index) in statsList" :key="index" class="stat">
        <span class="tiny">{{ stat.label }}</span>
        <strong :style="stat.color ? { color: stat.color } : {}">{{ stat.value }}</strong>
        <small>{{ stat.subtext }}</small>
      </div>
    </div>

    <!-- Grid: Rhythm Chart + Top Repeated -->
    <div class="grid">
      <!-- Panel 1: Activity Chart -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="tiny">RITMO DE ESCUCHA</span>
            <h3>Tu actividad semanal</h3>
          </div>
          <span class="muted">Últimos 7 días⌄</span>
        </div>
        <div class="chart">
          <div class="chart-y">
            <span>3h</span>
            <span>2h</span>
            <span>1h</span>
            <span>0</span>
          </div>
          <div class="bars">
            <div
              v-for="item in weeklyActivity"
              :key="item.day"
              class="bar-column"
            >
              <div class="bar" :style="{ height: item.pct + '%' }"></div>
              <span>{{ item.day }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Panel 2: Top 3 Repeated -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="tiny">MÁS REPETIDAS</span>
            <h3>En loop últimamente</h3>
          </div>
          <router-link to="/repeated" class="text">Ver todas →</router-link>
        </div>
        <div class="songs">
          <div
            v-for="(song, index) in topSongs"
            :key="song.id"
            class="song"
          >
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="art" :style="{ background: song.color }"></span>
            <span class="song-info">
              <strong>{{ song.title }}</strong>
              <small>{{ song.artist }}</small>
            </span>
            <span class="plays">{{ song.plays }} veces</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Insight Box -->
    <div class="insight">
      <div class="insight-mark">✦</div>
      <div>
        <span class="tiny">INSIGHT DE GAVIFY</span>
        <p>Escuchas más música los sábados. Tu momento favorito empieza a las 18:00.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { songs } from '@/data/music'

const router = useRouter()

const statsList = [
  { label: 'MINUTOS ESCUCHADOS', value: '12,486', subtext: '↑ 18% vs. mes anterior', color: 'var(--lime)' },
  { label: 'CANCIONES ÚNICAS', value: '684', subtext: 'Este mes', color: '' },
  { label: 'ARTISTA FAVORITO', value: 'Maroon 5', subtext: '48 reproducciones', color: 'var(--yellow)' },
  { label: 'GÉNERO TOP', value: 'Indie pop', subtext: '32% de tu escucha', color: '' }
]

const weeklyActivity = [
  { day: 'L', pct: 45 },
  { day: 'M', pct: 68 },
  { day: 'X', pct: 58 },
  { day: 'J', pct: 88 },
  { day: 'V', pct: 63 },
  { day: 'S', pct: 100 },
  { day: 'D', pct: 77 }
]

const topSongs = computed(() => songs.slice(0, 3))

function updateAnalysis() {
  router.push('/connect')
}
</script>
