<template>
  <main class="landing">
    <div class="landing-nav">
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>
      
      <div class="landing-nav-actions">
        <template v-if="auth.isAuthenticated.value">
          <router-link to="/dashboard" class="landing-btn-pill">
            <span class="avatar-dot">{{ auth.userInitials.value }}</span>
            <span>Mi Dashboard</span>
          </router-link>
          <button @click="handleLogout" class="landing-text-btn">Cerrar sesión</button>
        </template>
        <template v-else>
          <router-link to="/login" class="landing-nav-link">Iniciar sesión</router-link>
          <router-link to="/register" class="landing-btn-pill primary-pill">Registrarse</router-link>
        </template>
      </div>
    </div>

    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow accent">TU MÚSICA, EN UN SOLO LUGAR</p>
        <h1>Conoce lo que<br /><em>realmente</em> escuchas.</h1>
        <p class="hero-text">
          Gavify convierte tus datos de Spotify, YouTube Music y YouTube en insights simples para descubrir tus hábitos, limpiar tu biblioteca y escuchar mejor.
        </p>
        <div class="hero-cta-group">
          <button class="primary" @click="handleGetStarted">
            {{ auth.isAuthenticated.value ? 'Ir al Dashboard de Música' : 'Comenzar gratis ahora' }} <span>→</span>
          </button>
          <router-link v-if="!auth.isAuthenticated.value" to="/login" class="outline hero-login-btn">
            Ya tengo cuenta
          </router-link>
        </div>
        <div class="proof">
          <div class="avatars"><i>S</i><i>Y</i><i>G</i></div>
          Conecta Spotify y YouTube Music en una sola biblioteca
        </div>
      </div>

      <div class="hero-art">
        <div class="vinyl-stage">
          <div class="vinyl-light-wave"></div>
          <div class="vinyl"><span class="vinyl-label">G</span></div>
        </div>
        <div class="card one">
          <span class="tiny">MULTI-PLATAFORMA</span>
          <strong>Spotify + YouTube</strong>
          <small>Todas tus playlists reunidas</small>
        </div>
        <div class="card two">
          <span class="tiny">BIBLIOTECA LIMPIA</span>
          <strong>Sin repetidas</strong>
          <small>Detecta duplicados al instante</small>
        </div>
        <div class="equalizer">
          <i
            v-for="(height, idx) in equalizerHeights"
            :key="idx"
            :style="{
              height: height + 'px',
              animationDelay: (idx * 0.14) + 's',
              animationDuration: (0.85 + (idx % 3) * 0.22) + 's'
            }"
          ></i>
        </div>
      </div>
    </section>

    <div class="footer">
      <span>GAVIFY · TU REPRODUCTOR Y GESTOR DE PLAYLISTS</span>
      <span>INICIA SESIÓN PARA CONECTAR TUS CUENTAS</span>
    </div>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

const router = useRouter()
const auth = useAuth()
const equalizerHeights = [30, 50, 24, 72, 42, 61, 33]

function handleGetStarted() {
  if (auth.isAuthenticated.value) {
    router.push('/dashboard')
  } else {
    router.push('/register')
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>
