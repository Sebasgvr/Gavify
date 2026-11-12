<template>
  <main class="auth-page">
    <div class="auth-header">
      <router-link to="/" class="back-link">
        <AppIcon name="arrow-left" :size="15" />
        <span>Volver al inicio</span>
      </router-link>
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>
      <span class="tiny">ACCESO PLATAFORMA</span>
    </div>

    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-card-top">
          <p class="eyebrow accent">BIENVENIDO A GAVIFY</p>
          <h1>Inicia sesión en<br /><em>tu biblioteca musical.</em></h1>
          <p class="auth-desc">
            Accede a tus estadísticas, playlists, detector de canciones repetidas y reproductor con Spotify, YT Music y YouTube.
          </p>
        </div>

        <div v-if="errorMessage" class="auth-alert error">
          <AppIcon name="alert" :size="15" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="auth-alert success">
          <AppIcon name="check" :size="15" />
          <span>{{ successMessage }}</span>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <div class="input-wrapper">
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="sebastian@gavify.io"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
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
              >
                <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="16" />
              </button>
            </div>
          </div>

          <button type="submit" class="primary auth-submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Iniciar Sesión</span>
          </button>
        </form>

        <div class="auth-divider">
          <span>6 USUARIOS EN BASE DE DATOS (1 SUPER ADMIN, 1 ADMIN, 4 PLANES)</span>
        </div>

        <div class="quick-roles-grid">
          <button
            v-for="cuenta in auth.usuariosDb.value"
            :key="cuenta.id"
            type="button"
            class="role-login-btn"
            @click="handleTestAccountLogin(cuenta)"
          >
            <div>
              <strong>{{ cuenta.nombre }}</strong>
              <small>
                {{ cuenta.email }} • Rol:
                <b>{{ etiquetaRol(cuenta.rol) }}</b> • {{ cuenta.plan }}
              </small>
            </div>
            <AppIcon name="chevron-right" :size="15" />
          </button>
        </div>

        <div class="auth-footer-prompt">
          <span>¿Todavía no tienes cuenta en Gavify?</span>
          <router-link to="/register" class="accent-link">Crear cuenta de usuario</router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/services/auth'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const form = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function etiquetaRol(rol) {
  if (rol === 'super_admin') return 'Super Admin'
  if (rol === 'admin') return 'Admin'
  return 'Usuario'
}

async function handleLogin() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    await auth.login({
      email: form.email,
      password: form.password
    })

    successMessage.value = '¡Bienvenido! Redirigiendo...'
    const redirectPath = route.query.redirect || '/dashboard'
    setTimeout(() => {
      router.push(redirectPath)
    }, 350)
  } catch (err) {
    errorMessage.value = err.message || 'Error al iniciar sesión.'
  } finally {
    isLoading.value = false
  }
}

function handleTestAccountLogin(cuenta) {
  errorMessage.value = ''
  auth.loginWithTestAccount(cuenta.key || cuenta.id)
  successMessage.value = `Ingresando como ${cuenta.nombre} (${etiquetaRol(cuenta.rol)} • ${cuenta.plan})...`
  const redirectPath = route.query.redirect || '/dashboard'
  setTimeout(() => {
    router.push(redirectPath)
  }, 250)
}
</script>

<style scoped>
.quick-roles-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-login-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #141814;
  border: 1px solid #30382f;
  padding: 10px 14px;
  border-radius: 12px;
  text-align: left;
  transition: 0.15s;
}

.role-login-btn:hover {
  border-color: var(--lime);
  background: #1c231b;
}

.role-login-btn strong {
  display: block;
  font-size: 12px;
  color: var(--cream);
}

.role-login-btn small {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.role-login-btn b {
  color: var(--lime);
}
</style>
