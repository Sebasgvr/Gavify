<template>
  <div>
    <div class="page-intro">
      <div>
        <p class="eyebrow accent">TU BIBLIOTECA</p>
        <h2>Lo que no puedes dejar de escuchar.</h2>
        <p>Selecciona canciones para crear una playlist limpia o resolver tus loops.</p>
      </div>
      <button class="primary" @click="resolveSongs">
        {{ isResolved ? '✓ Lista actualizada' : 'Resolver seleccionadas' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <button
        v-for="filter in filterOptions"
        :key="filter.id"
        class="filter"
        :class="{ active: currentFilter === filter.id }"
        @click="currentFilter = filter.id"
      >
        {{ filter.label }}　{{ filter.count }}
      </button>
      <span class="selection">{{ selectedSongs.length }} seleccionadas</span>
    </div>

    <!-- Table panel -->
    <section class="panel">
      <div class="table-head">
        <span></span>
        <span>CANCIÓN</span>
        <span>ARTISTA</span>
        <span>VECES</span>
        <span>ACCIÓN</span>
      </div>

      <label
        v-for="song in songs"
        :key="song.id"
        class="table-row"
        :class="{ checked: isSelected(song.id) }"
      >
        <input
          class="check"
          type="checkbox"
          :checked="isSelected(song.id)"
          @change="toggleSongSelection(song.id)"
        />
        <span class="art" :style="{ background: song.color }"></span>
        <span class="song-info">
          <strong>{{ song.title }}</strong>
          <small>{{ song.artist }}</small>
        </span>
        <span class="artist">{{ song.artist }}</span>
        <strong>{{ song.plays }}</strong>
        <button class="more" type="button" @click.stop>•••</button>
      </label>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { songs, selectedSongs, isResolved, toggleSongSelection, resolveSongs } from '@/data/music'

const currentFilter = ref('week')

const filterOptions = [
  { id: 'week', label: 'Esta semana', count: 24 },
  { id: 'month', label: 'Este mes', count: 68 },
  { id: 'all', label: 'Siempre', count: 204 }
]

function isSelected(id) {
  return selectedSongs.value.includes(id)
}
</script>
