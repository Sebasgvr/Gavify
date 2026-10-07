<template>
  <div>
    <div class="row">
      <div>
        <p class="eyebrow accent">TU COLECCIÓN</p>
        <h2>Todo lo que has creado.</h2>
      </div>
      <button class="primary">+ Nueva playlist</button>
    </div>

    <!-- Playlists Grid -->
    <div class="playlists">
      <!-- Feature Card -->
      <div class="feature">
        <span class="tiny">GENERADA POR GAVIFY</span>
        <h3>Tu lado B</h3>
        <p>Una mezcla de tus canciones menos escuchadas. 42 canciones para salir de la rutina.</p>
        <button class="dark">Escuchar playlist　▶</button>
      </div>

      <!-- Playlist Cards -->
      <div
        v-for="playlist in playlistsList"
        :key="playlist.title"
        class="playlist"
      >
        <span class="tiny">PLAYLIST</span>
        <h3>{{ playlist.title }}</h3>
        <p>{{ playlist.count }} canciones</p>
        <button class="text">Abrir →</button>
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
const playlistsList = [
  { title: 'Favoritas 2024', count: 84 },
  { title: 'Domingo lento', count: 26 },
  { title: 'Descubrimientos', count: 52 }
]

const genres = [
  { name: 'Indie pop', barWidth: 82, percentage: 32 },
  { name: 'Alternativo', barWidth: 58, percentage: 24 },
  { name: 'R&B', barWidth: 43, percentage: 18 },
  { name: 'Electrónica', barWidth: 31, percentage: 12 }
]
</script>
