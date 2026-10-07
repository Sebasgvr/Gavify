<template>
  <main class="connect">
    <div class="connect-top">
      <button class="back" @click="goBack">← Volver</button>
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>
      <span class="tiny">PASO 02 / 02</span>
    </div>

    <section class="connect-content">
      <div class="connect-icon">◉</div>
      <p class="eyebrow accent">VINCULAR BIBLIOTECA</p>
      <h1>Conecta tu cuenta<br /><em>de Spotify.</em></h1>
      <p>
        {{ auth.currentUser.value?.name ? `Hola ${auth.currentUser.value.name}, solo` : 'Solo' }} necesitamos acceso de lectura para analizar tus canciones, artistas y playlists. Nunca publicamos ni modificamos nada.
      </p>
      
      <button class="spotify" :disabled="isConnecting" @click="continueToDashboard">
        <span v-if="isConnecting" class="spinner"></span>
        <span v-else>● &nbsp; Conectar con Spotify <span>→</span></span>
      </button>

      <button class="outline skip-btn" @click="skipForNow">
        Explorar con datos de muestra
      </button>

      <small class="privacy">▣ Tus datos están protegidos y el acceso es 100% seguro.</small>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

const router = useRouter()
const auth = useAuth()
const isConnecting = ref(false)

function goBack() {
  router.push('/')
}

function continueToDashboard() {
  isConnecting.value = true
  auth.connectSpotify(auth.currentUser.value?.name || 'SpotifyUser')
  setTimeout(() => {
    router.push('/dashboard')
  }, 700)
}

function skipForNow() {
  router.push('/dashboard')
}
</script>
