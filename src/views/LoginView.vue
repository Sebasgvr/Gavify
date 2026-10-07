<template>
  <main class="auth-page">
    <div class="auth-header">
      <router-link to="/" class="back-link">
        <span>←</span> Volver al inicio
      </router-link>
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>
      <span class="tiny">ACCESO</span>
    </div>

    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-card-top">
          <p class="eyebrow accent">BIENVENIDO DE NUEVO</p>
          <h1>Inicia sesión en<br /><em>Gavify.</em></h1>
          <p class="auth-desc">Accede a tus estadísticas, canciones repetidas y el análisis profundo de tu Spotify.</p>
        </div>

        <!-- Feedback message -->
        <div v-if="errorMessage" class="auth-alert error">
          <span class="alert-icon">!</span>
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="auth-alert success">
          <span class="alert-icon">✓</span>
          <span>{{ successMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <div class="input-wrapper">
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="tu@correo.com"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="label-with-action">
              <label for="password">Contraseña</label>
              <button type="button" class="link-btn" @click="handleForgotPassword">¿Olvidaste tu clave?</button>
            </div>
            <div class="input-wrapper">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
                :title="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                {{ showPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.rememberMe" />
              <span>Recordar sesión</span>
            </label>
          </div>

          <button type="submit" class="primary auth-submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Iniciar Sesión <span>→</span></span>
          </button>
        </form>

        <div class="auth-divider">
          <span>O ACCEDE RÁPIDAMENTE</span>
        </div>

        <div class="auth-quick-actions">
          <button type="button" class="outline demo-btn" @click="handleDemoLogin" :disabled="isLoading">
            <span>⚡</span> Entrar con cuenta Demo (Lucía M.)
          </button>

          <button type="button" class="spotify spotify-compact" @click="handleSpotifyLogin">
            <span>●</span> Continuar con Spotify
          </button>
        </div>

        <div class="auth-footer-prompt">
          <span>¿No tienes una cuenta aún?</span>
          <router-link to="/register" class="accent-link">Regístrate gratis</router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/services/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const form = reactive({
  email: '',
  password: '',
  rememberMe: true
})

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    await auth.login({
      email: form.email,
      password: form.password
    })

    successMessage.value = '¡Bienvenido! Redirigiendo a tu música...'
    const redirectPath = route.query.redirect || '/dashboard'
    setTimeout(() => {
      router.push(redirectPath)
    }, 600)
  } catch (err) {
    errorMessage.value = err.message || 'Error al iniciar sesión. Inténtalo de nuevo.'
  } finally {
    isLoading.value = false
  }
}

function handleDemoLogin() {
  errorMessage.value = ''
  isLoading.value = true
  try {
    auth.loginDemo()
    successMessage.value = 'Iniciando sesión con cuenta de demostración...'
    setTimeout(() => {
      router.push('/dashboard')
    }, 400)
  } catch (e) {
    errorMessage.value = 'No se pudo iniciar modo demo.'
  } finally {
    isLoading.value = false
  }
}

function handleSpotifyLogin() {
  auth.loginDemo()
  router.push('/connect')
}

function handleForgotPassword() {
  alert('Para la versión de demostración, puedes ingresar con:\nEmail: lucia@gavify.com\nContraseña: password123\nO crear una cuenta nueva en el botón de registro.')
}
</script>
