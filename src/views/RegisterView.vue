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
      <span class="tiny">REGISTRO</span>
    </div>

    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-card-top">
          <p class="eyebrow accent">ÚNETE A GAVIFY</p>
          <h1>Crea tu cuenta<br /><em>en segundos.</em></h1>
          <p class="auth-desc">Comienza a descubrir patrones reales en tus hábitos de escucha y organiza tu biblioteca.</p>
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

        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <label for="name">Nombre y apellido</label>
            <div class="input-wrapper">
              <input
                id="name"
                v-model="form.name"
                type="text"
                placeholder="Ej. Camila Romero"
                required
                autocomplete="name"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reg-email">Correo electrónico</label>
            <div class="input-wrapper">
              <input
                id="reg-email"
                v-model="form.email"
                type="email"
                placeholder="tu@correo.com"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reg-password">Contraseña</label>
            <div class="input-wrapper">
              <input
                id="reg-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                required
                autocomplete="new-password"
                @input="calculateStrength"
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
            <!-- Password strength indicator -->
            <div v-if="form.password" class="password-strength-bar">
              <div class="strength-track">
                <div
                  class="strength-fill"
                  :style="{ width: strengthPercent + '%', backgroundColor: strengthColor }"
                ></div>
              </div>
              <span class="strength-label" :style="{ color: strengthColor }">{{ strengthText }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirmar contraseña</label>
            <div class="input-wrapper">
              <input
                id="confirm-password"
                v-model="form.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Repite tu contraseña"
                required
                autocomplete="new-password"
              />
            </div>
            <span v-if="form.confirmPassword && form.password !== form.confirmPassword" class="field-error">
              Las contraseñas no coinciden.
            </span>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.agreeTerms" required />
              <span>Acepto los <a href="#" @click.prevent="showTermsInfo" class="terms-link">Términos de servicio</a> y la <a href="#" @click.prevent="showPrivacyInfo" class="terms-link">Política de privacidad</a></span>
            </label>
          </div>

          <button type="submit" class="primary auth-submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Crear Cuenta y Conectar <span>→</span></span>
          </button>
        </form>

        <div class="auth-divider">
          <span>O ACCEDE DIRECTAMENTE</span>
        </div>

        <div class="auth-quick-actions">
          <button type="button" class="outline demo-btn" @click="handleDemoLogin" :disabled="isLoading">
            <span>⚡</span> Probar con cuenta Demo
          </button>
        </div>

        <div class="auth-footer-prompt">
          <span>¿Ya tienes una cuenta creada?</span>
          <router-link to="/login" class="accent-link">Inicia sesión</router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

const router = useRouter()
const auth = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: true
})

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const strengthLevel = ref(0)

function calculateStrength() {
  const p = form.password
  let score = 0
  if (p.length >= 6) score += 1
  if (p.length >= 10) score += 1
  if (/[0-9]/.test(p)) score += 1
  if (/[A-Z]/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 1
  strengthLevel.value = score
}

const strengthPercent = computed(() => {
  return Math.min(100, strengthLevel.value * 25)
})

const strengthText = computed(() => {
  if (!form.password) return ''
  if (strengthLevel.value <= 1) return 'Débil (mínimo 6 caracteres)'
  if (strengthLevel.value === 2) return 'Aceptable'
  if (strengthLevel.value === 3) return 'Buena'
  return 'Fuerte y segura'
})

const strengthColor = computed(() => {
  if (strengthLevel.value <= 1) return 'var(--red, #e8795d)'
  if (strengthLevel.value === 2) return 'var(--yellow, #e7bb59)'
  if (strengthLevel.value >= 3) return 'var(--lime, #b8df6d)'
  return 'var(--muted)'
})

async function handleRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  if (!form.agreeTerms) {
    errorMessage.value = 'Debes aceptar los términos y condiciones.'
    return
  }

  isLoading.value = true

  try {
    const result = await auth.register({
      name: form.name,
      email: form.email,
      password: form.password
    })

    if (result.requiresConfirmation) {
      successMessage.value = 'Registro realizado con éxito. Revisa tu correo electrónico para confirmar la cuenta.'
    } else {
      successMessage.value = `¡Cuenta creada con éxito${result.user?.name ? ', ' + result.user.name : ''}! Conectando...`
      setTimeout(() => {
        router.push('/connect')
      }, 700)
    }
  } catch (err) {
    errorMessage.value = err.message || 'Ocurrió un error al registrar tu cuenta.'
  } finally {
    isLoading.value = false
  }
}

function handleDemoLogin() {
  auth.loginDemo()
  router.push('/dashboard')
}

function showTermsInfo() {
  alert('Términos de servicio de Gavify: Servicio orientado a la visualización y análisis de datos de Spotify con fines estadísticos y de optimización personal.')
}

function showPrivacyInfo() {
  alert('Privacidad: Tus datos se procesan localmente y solo leemos metadatos de reproducción autorizados por tu cuenta.')
}
</script>
