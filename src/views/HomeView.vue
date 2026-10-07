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
          Gavify convierte tus datos de Spotify en insights simples para descubrir tus hábitos, limpiar tu biblioteca y escuchar mejor.
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
          <div class="avatars"><i>AM</i><i>CR</i><i>JM</i></div>
          Más de 2.400 personas ya escuchan distinto
        </div>
      </div>

      <div class="hero-art">
        <div class="vinyl"><span class="vinyl-label">G</span></div>
        <div class="card one">
          <span class="tiny">TU ARTISTA #1</span>
          <strong>Maroon 5</strong>
          <small>12h 42min escuchadas</small>
        </div>
        <div class="card two">
          <span class="tiny">DIVERSIDAD</span>
          <strong>84%</strong>
          <small>de tu música es nueva</small>
        </div>
        <div class="equalizer">
          <i v-for="height in equalizerHeights" :key="height" :style="{ height: height + 'px' }"></i>
        </div>
      </div>
    </section>

    <div class="footer">
      <span>UN RESUMEN HONESTO DE TUS HÁBITOS</span>
      <span>SCROLL PARA EXPLORAR ↓</span>
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
