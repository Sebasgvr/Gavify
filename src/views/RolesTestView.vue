<template>
  <div class="users-admin-view">
    <div class="row head-row">
      <div>
        <p class="eyebrow accent">
          PANEL DE ADMINISTRACIÓN • {{ auth.roleInfo.value?.etiqueta?.toUpperCase() }}
        </p>
        <h2>Administración de Usuarios y Roles</h2>
        <p class="subtext">
          <template v-if="auth.isSuperAdmin.value">
            Estás conectado como <strong>Super Admin ({{ auth.currentUser.value?.nombre }})</strong>. Puedes administrar a todos los <strong>Admins</strong> y <strong>Usuarios</strong> de la base de datos.
          </template>
          <template v-else>
            Estás conectado como <strong>Admin ({{ auth.currentUser.value?.nombre }})</strong>. Puedes administrar las cuentas y planes de los <strong>Usuarios</strong>.
          </template>
        </p>
      </div>

      <div class="top-btns">
        <button class="outline btn-sm" @click="restaurarUsuariosBase">
          <AppIcon name="repeat" :size="14" />
          <span>Restaurar 6 usuarios base</span>
        </button>
        <button class="primary btn-sm" @click="abrirModalNuevoUsuario">
          <AppIcon name="plus" :size="15" />
          <span>Nuevo usuario</span>
        </button>
      </div>
    </div>

    <!-- Mensajes de confirmación / error -->
    <div v-if="mensaje" class="alert-box alert-success">
      <AppIcon name="check" :size="16" />
      <span>{{ mensaje }}</span>
      <button class="alert-close" @click="mensaje = ''">
        <AppIcon name="close" :size="14" />
      </button>
    </div>

    <div v-if="errorMensaje" class="alert-box alert-error">
      <AppIcon name="alert" :size="16" />
      <span>{{ errorMensaje }}</span>
      <button class="alert-close" @click="errorMensaje = ''">
        <AppIcon name="close" :size="14" />
      </button>
    </div>

    <!-- Tarjetas de Resumen de la Base de Datos de Usuarios -->
    <div class="stats">
      <div class="stat">
        <span class="tiny">TOTAL EN BASE DE DATOS</span>
        <strong style="color: var(--lime);">{{ listaUsuarios.length }}</strong>
        <small>Cuentas registradas en Gavify</small>
      </div>
      <div class="stat">
        <span class="tiny">SUPER ADMIN</span>
        <strong>{{ conteoPorRol.super_admin }}</strong>
        <small>Sebastian Gavilan (Control de Admins)</small>
      </div>
      <div class="stat">
        <span class="tiny">ADMINISTRADORES</span>
        <strong style="color: #6bc2b6;">{{ conteoPorRol.admin }}</strong>
        <small>Administran cuentas de usuarios</small>
      </div>
      <div class="stat">
        <span class="tiny">USUARIOS (4 PLANES)</span>
        <strong style="color: #88a4cc;">{{ conteoPorRol.usuario }}</strong>
        <small>Gratis, Provilan Pro, SebaGod y Prime</small>
      </div>
    </div>

    <!-- Tabla Principal de los 6 Usuarios en la Base de Datos -->
    <section class="panel">
      <div class="panel-head toolbar-head">
        <div>
          <span class="tiny accent">BASE DE DATOS DE USUARIOS (SUPABASE + LOCAL STORE)</span>
          <h3>Usuarios registrados ({{ usuariosFiltrados.length }} de {{ listaUsuarios.length }})</h3>
        </div>

        <div class="filters-row">
          <div class="search-pill">
            <AppIcon name="search" :size="15" />
            <input
              v-model="busqueda"
              type="text"
              placeholder="Buscar por nombre o email..."
            />
          </div>

          <CustomSelect
            v-model="filtroRol"
            :options="opcionesFiltroRol"
          />

          <CustomSelect
            v-model="filtroPlan"
            :options="opcionesFiltroPlan"
          />
        </div>
      </div>

      <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol en el Sistema</th>
              <th>Plan Asignado</th>
              <th>APIs Conectadas</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuariosFiltrados" :key="u.id">
              <td>
                <div class="user-cell">
                  <div class="u-avatar" :class="`role-${u.rol}`">
                    {{ u.avatar || 'US' }}
                  </div>
                  <div class="u-meta">
                    <strong>
                      {{ u.nombre }}
                      <span v-if="u.id === auth.currentUser.value?.id" class="you-pill">Tú</span>
                    </strong>
                    <small>{{ u.email }}</small>
                  </div>
                </div>
              </td>

              <!-- Selector de Rol personalizado (Super Admin puede cambiar entre Admin y Usuario) -->
              <td>
                <div v-if="u.rol === 'super_admin'" class="role-badge role-super">
                  <AppIcon name="shield" :size="13" />
                  <span>Super Admin</span>
                </div>
                <div v-else-if="auth.isSuperAdmin.value" style="max-width: 170px;">
                  <CustomSelect
                    :model-value="u.rol"
                    :options="opcionesCambioRol"
                    size="sm"
                    @update:model-value="nuevoRol => cambiarRolUsuario(u, nuevoRol)"
                  />
                </div>
                <div v-else class="role-badge" :class="`role-${u.rol}`">
                  <span>{{ u.rol === 'admin' ? 'Admin' : 'Usuario' }}</span>
                </div>
              </td>

              <!-- Selector de Plan personalizado -->
              <td>
                <div v-if="puedeEditarUsuario(u)" style="max-width: 215px;">
                  <CustomSelect
                    :model-value="u.plan_id"
                    :options="opcionesPlanes"
                    size="sm"
                    @update:model-value="nuevoPlan => cambiarPlanUsuario(u, nuevoPlan)"
                  />
                </div>
                <span v-else class="plan-static-badge">{{ u.plan }}</span>
              </td>

              <td>
                <div class="api-dots-row">
                  <span class="api-mini-tag" :class="{ on: u.spotifyConnected }">Spotify</span>
                  <span class="api-mini-tag" :class="{ on: u.ytMusicConnected }">YT Music</span>
                  <span class="api-mini-tag" :class="{ on: u.youtubeConnected }">YouTube</span>
                </div>
              </td>

              <td style="text-align: right;">
                <div class="row-actions">
                  <span v-if="u.rol === 'super_admin'" class="protected-label">
                    Propietario Principal
                  </span>
                  <button
                    v-if="puedeEliminarUsuario(u)"
                    class="danger-btn btn-xs"
                    @click="usuarioPorEliminar = u"
                  >
                    <AppIcon name="trash" :size="13" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Explicación de los 3 únicos roles del sistema -->
    <section class="panel roles-summary-panel">
      <div class="panel-head">
        <div>
          <span class="tiny">ESTRUCTURA DE PERMISOS SIMPLIFICADA</span>
          <h3>Jerarquía de Roles en Gavify</h3>
        </div>
      </div>

      <div class="roles-cards-grid">
        <div
          v-for="rol in Object.values(auth.ROLES_DEFINICION)"
          :key="rol.id"
          class="role-explain-card"
        >
          <div class="role-card-top">
            <span class="role-dot" :style="{ backgroundColor: rol.color }"></span>
            <strong>{{ rol.etiqueta }}</strong>
          </div>
          <p>{{ rol.descripcion }}</p>
          <ul>
            <li v-for="(perm, i) in rol.permisos" :key="i">{{ perm }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Modal: Crear Nuevo Usuario -->
    <div v-if="mostrarModalCrear" class="modal-backdrop" @click.self="mostrarModalCrear = false">
      <div class="modal-card panel">
        <div class="panel-head">
          <div>
            <span class="tiny accent">ALTA EN BASE DE DATOS</span>
            <h3>Agregar nuevo usuario</h3>
          </div>
          <button class="outline btn-sm" @click="mostrarModalCrear = false">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <form class="user-form" @submit.prevent="guardarNuevoUsuario">
          <div class="form-group">
            <label>Nombre completo *</label>
            <input
              v-model="nuevoNombre"
              type="text"
              placeholder="Ej. Sofía Benítez"
              required
            />
          </div>

          <div class="form-group">
            <label>Correo electrónico *</label>
            <input
              v-model="nuevoEmail"
              type="email"
              placeholder="sofia@gavify.io"
              required
            />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Rol asignado</label>
              <CustomSelect
                v-model="nuevoRol"
                :options="opcionesRolParaCrear"
              />
            </div>

            <div class="form-group">
              <label>Plan de suscripción</label>
              <CustomSelect
                v-model="nuevoPlanId"
                :options="opcionesPlanes"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="primary">Guardar en Base de Datos</button>
            <button type="button" class="outline" @click="mostrarModalCrear = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Confirmación antes de eliminar usuario -->
    <div v-if="usuarioPorEliminar" class="modal-backdrop" @click.self="usuarioPorEliminar = null">
      <div class="modal-card panel">
        <span class="tiny danger-text">CONFIRMAR BAJA DE USUARIO</span>
        <h3>¿Eliminar a "{{ usuarioPorEliminar.nombre }}"?</h3>
        <p class="subtext">
          Se quitará la cuenta <strong>{{ usuarioPorEliminar.email }}</strong> ({{ usuarioPorEliminar.plan }}) de la base de datos.
        </p>
        <div class="modal-actions">
          <button class="danger-btn" @click="confirmarEliminarUsuario">
            <AppIcon name="trash" :size="14" />
            <span>Sí, eliminar usuario</span>
          </button>
          <button class="outline" @click="usuarioPorEliminar = null">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import { useAuth } from '@/services/auth'

const auth = useAuth()

const listaUsuarios = ref([])
const busqueda = ref('')
const filtroRol = ref('todos')
const filtroPlan = ref('todos')
const mensaje = ref('')
const errorMensaje = ref('')

// Modal crear usuario
const mostrarModalCrear = ref(false)
const nuevoNombre = ref('')
const nuevoEmail = ref('')
const nuevoRol = ref('usuario')
const nuevoPlanId = ref('gratis')
const usuarioPorEliminar = ref(null)

const opcionesFiltroRol = [
  { value: 'todos', label: 'Rol: Todos' },
  { value: 'super_admin', label: 'Super Admin', dot: '#b8df6d' },
  { value: 'admin', label: 'Admin', dot: '#6bc2b6' },
  { value: 'usuario', label: 'Usuario', dot: '#88a4cc' }
]

const opcionesFiltroPlan = [
  { value: 'todos', label: 'Plan: Todos' },
  { value: 'gratis', label: 'Plan Gratis' },
  { value: 'provilan', label: 'Plan Provilan Pro' },
  { value: 'sebagod', label: 'Plan SebaGod' },
  { value: 'sebagod_prime', label: 'Plan SebaGod Prime' }
]

const opcionesCambioRol = [
  { value: 'usuario', label: 'Usuario', dot: '#88a4cc' },
  { value: 'admin', label: 'Admin', dot: '#6bc2b6' }
]

const opcionesPlanes = [
  { value: 'gratis', label: 'Plan Gratis' },
  { value: 'provilan', label: 'Plan Provilan Pro' },
  { value: 'sebagod', label: 'Plan SebaGod' },
  { value: 'sebagod_prime', label: 'Plan SebaGod Prime' }
]

const opcionesRolParaCrear = computed(() => {
  if (auth.isSuperAdmin.value) {
    return [
      { value: 'usuario', label: 'Usuario', dot: '#88a4cc' },
      { value: 'admin', label: 'Admin', dot: '#6bc2b6' }
    ]
  }
  return [{ value: 'usuario', label: 'Usuario', dot: '#88a4cc' }]
})

function cargarUsuarios() {
  listaUsuarios.value = auth.getUsers()
}

const conteoPorRol = computed(() => {
  const counts = { super_admin: 0, admin: 0, usuario: 0 }
  for (const u of listaUsuarios.value) {
    counts[u.rol] = (counts[u.rol] || 0) + 1
  }
  return counts
})

const usuariosFiltrados = computed(() => {
  let list = [...listaUsuarios.value]

  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase().trim()
    list = list.filter(
      u =>
        u.nombre?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
  }

  if (filtroRol.value !== 'todos') {
    list = list.filter(u => u.rol === filtroRol.value)
  }

  if (filtroPlan.value !== 'todos') {
    list = list.filter(u => u.plan_id === filtroPlan.value)
  }

  return list
})

function puedeEditarUsuario(target) {
  return auth.canAdministerTargetUser(target)
}

function puedeEliminarUsuario(target) {
  if (target.rol === 'super_admin') return false
  if (target.id === auth.currentUser.value?.id) return false
  return auth.canAdministerTargetUser(target)
}

async function cambiarRolUsuario(target, nuevoRolVal) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const actualizado = await auth.updateUserByAdmin(target.id, { rol: nuevoRolVal })
    cargarUsuarios()
    mensaje.value = `El rol de "${actualizado.nombre}" fue actualizado a ${actualizado.rol === 'admin' ? 'Admin' : 'Usuario'}.`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function cambiarPlanUsuario(target, nuevoPlanVal) {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const actualizado = await auth.updateUserByAdmin(target.id, { plan_id: nuevoPlanVal })
    cargarUsuarios()
    mensaje.value = `El plan de "${actualizado.nombre}" fue actualizado a ${actualizado.plan}.`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

function abrirModalNuevoUsuario() {
  nuevoNombre.value = ''
  nuevoEmail.value = ''
  nuevoRol.value = 'usuario'
  nuevoPlanId.value = 'gratis'
  mostrarModalCrear.value = true
}

async function guardarNuevoUsuario() {
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const creado = await auth.createUserByAdmin({
      nombre: nuevoNombre.value,
      email: nuevoEmail.value,
      rol: nuevoRol.value,
      plan_id: nuevoPlanId.value
    })
    mostrarModalCrear.value = false
    cargarUsuarios()
    mensaje.value = `Usuario "${creado.nombre}" (${creado.plan}) agregado a la base de datos.`
  } catch (err) {
    errorMensaje.value = err.message
  }
}

async function confirmarEliminarUsuario() {
  if (!usuarioPorEliminar.value) return
  errorMensaje.value = ''
  mensaje.value = ''
  try {
    const nombreEliminado = usuarioPorEliminar.value.nombre
    await auth.deleteUserByAdmin(usuarioPorEliminar.value.id)
    usuarioPorEliminar.value = null
    cargarUsuarios()
    mensaje.value = `El usuario "${nombreEliminado}" fue eliminado de la base de datos.`
  } catch (err) {
    errorMensaje.value = err.message
    usuarioPorEliminar.value = null
  }
}

function restaurarUsuariosBase() {
  auth.resetUsersSeed()
  cargarUsuarios()
  mensaje.value = 'Se restauraron los 6 usuarios iniciales de la base de datos (4 Usuarios con cada plan, 1 Admin y 1 Super Admin).'
}

onMounted(() => {
  cargarUsuarios()
})
</script>

<style scoped>
.users-admin-view {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.head-row {
  flex-wrap: wrap;
  gap: 16px;
}

.subtext {
  color: var(--muted);
  font-size: 13px;
  margin-top: 6px;
  max-width: 680px;
  line-height: 1.5;
}

.top-btns {
  display: flex;
  gap: 10px;
  align-items: center;
}

.alert-box {
  padding: 13px 18px;
  border-radius: 14px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-box span {
  flex: 1;
}

.alert-close {
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.alert-success {
  background: rgba(184, 223, 109, 0.14);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.alert-error {
  background: rgba(232, 121, 93, 0.14);
  border: 1px solid var(--red);
  color: var(--red);
}

.toolbar-head {
  flex-wrap: wrap;
  gap: 14px;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #121512;
  border: 1px solid var(--line);
  padding: 8px 14px;
  border-radius: 999px;
  min-width: 240px;
  color: #8f988d;
}

.search-pill input {
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
  width: 100%;
}

.users-table-wrap {
  margin-top: 16px;
  overflow-x: visible;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th {
  text-align: left;
  padding: 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
}

.users-table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.u-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  color: #101510;
  background: #88a4cc;
  flex-shrink: 0;
}

.u-avatar.role-super_admin {
  background: linear-gradient(135deg, var(--lime), #7eb338);
}

.u-avatar.role-admin {
  background: #6bc2b6;
}

.u-meta strong {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.u-meta small {
  color: var(--muted);
  font-size: 12px;
}

.you-pill {
  background: rgba(184, 223, 109, 0.18);
  border: 1px solid var(--lime);
  color: var(--lime);
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-super {
  background: rgba(184, 223, 109, 0.16);
  border: 1px solid var(--lime);
  color: var(--lime);
}

.role-admin {
  background: rgba(107, 194, 182, 0.16);
  border: 1px solid #6bc2b6;
  color: #6bc2b6;
}

.role-usuario {
  background: rgba(136, 164, 204, 0.16);
  border: 1px solid #88a4cc;
  color: #88a4cc;
}

.plan-static-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: #171c17;
  border: 1px solid #2b332a;
  font-size: 12px;
  font-weight: 600;
}

.api-dots-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.api-mini-tag {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #161a16;
  border: 1px solid #262d26;
  color: #6d756c;
}

.api-mini-tag.on {
  border-color: rgba(184, 223, 109, 0.4);
  color: #d6dfd4;
  background: rgba(184, 223, 109, 0.08);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.protected-label {
  font-size: 11px;
  color: var(--lime);
  font-weight: 600;
}

.roles-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.role-explain-card {
  background: #141814;
  border: 1px solid #262d25;
  border-radius: 16px;
  padding: 16px;
}

.role-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.role-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.role-explain-card p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 10px;
}

.role-explain-card ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #cfd6ce;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 500px;
  background: #181c18;
  border: 1px solid var(--line);
  border-radius: 20px;
}

.user-form {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}

.form-group input {
  background: #121512;
  border: 1px solid var(--line);
  color: var(--cream);
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  border-radius: 999px;
}

.btn-xs {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 11px;
  border-radius: 999px;
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(232, 121, 93, 0.16);
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: 999px;
  font-weight: 700;
}
</style>
