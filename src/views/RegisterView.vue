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
      <span class="tiny">REGISTRO DE USUARIO</span>
    </div>

    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-card-top">
          <p class="eyebrow accent">ÚNETE A GAVIFY</p>
          <h1>Crea tu cuenta<br /><em>de usuario.</em></h1>
          <p class="auth-desc">
            Busca y agrega canciones desde Spotify, YT Music y YouTube, organiza tus playlists públicas o privadas y limpia canciones repetidas.
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

        <form class="auth-form" @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="name">Nombre completo *</label>
            <div class="input-wrapper">
              <input
                id="name"
                v-model="form.name"
                type="text"
                placeholder="Ej. Camila Romero"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reg-email">Correo electrónico *</label>
            <div class="input-wrapper">
              <input
                id="reg-email"
                v-model="form.email"
                type="email"
                placeholder="tu@correo.com"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>Plan de Suscripción *</label>
            <CustomSelect
              v-model="form.plan_id"
              :options="opcionesPlanes"
            />
          </div>

          <div class="form-group">
            <label for="reg-password">Contraseña (mínimo 6 caracteres) *</label>
            <div class="input-wrapper">
              <input
                id="reg-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          </div>

          <button type="submit" class="primary auth-submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Crear Cuenta de Usuario</span>
          </button>
        </form>

        <div class="auth-footer-prompt">
          <span>¿Ya tienes una cuenta creada?</span>
          <router-link to="/login" class="accent-link">Inicia sesión</router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'
import AppIcon from '@/components/AppIcon.vue'
import CustomSelect from '@/components/CustomSelect.vue'

const router = useRouter()
const auth = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
  plan_id: 'gratis'
})

const opcionesPlanes = [
  { value: 'gratis', label: 'Plan Gratis ($0 / mes)' },
  { value: 'provilan', label: 'Plan Provilan Pro ($3.99 / mes)' },
  { value: 'sebagod', label: 'Plan SebaGod ($7.99 / mes)' },
  { value: 'sebagod_prime', label: 'Plan SebaGod Prime ($12.99 / mes)' }
]

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleRegister() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const result = await auth.register({
      name: form.name,
      email: form.email,
      password: form.password,
      plan_id: form.plan_id
    })

    successMessage.value = `¡Cuenta creada con ${result.user?.plan}! Redirigiendo...`
    setTimeout(() => {
      router.push('/dashboard')
    }, 450)
  } catch (err) {
    errorMessage.value = err.message || 'Ocurrió un error al registrar tu cuenta.'
  } finally {
    isLoading.value = false
  }
}
</script>
