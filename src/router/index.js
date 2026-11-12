import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ConnectView from '@/views/ConnectView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import RepeatedView from '@/views/RepeatedView.vue'
import MusicaView from '@/views/MusicaView.vue'
import PlaylistsView from '@/views/PlaylistsView.vue'
import RolesTestView from '@/views/RolesTestView.vue'
import { useAuth } from '@/services/auth'
import { registrarEventoSeguridad } from '@/services/db'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    alias: '/registro',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true }
  },
  {
    path: '/connect',
    name: 'connect',
    component: ConnectView,
    meta: { requiresAuth: true, title: 'Conectar APIs Musicales' }
  },
  {
    path: '/dashboard',
    alias: '/inicio',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Tu resumen', requiresAuth: true }
      },
      {
        path: '/musica',
        name: 'musica',
        component: MusicaView,
        meta: { title: 'Catálogo & Extractor de APIs', requiresAuth: true }
      },
      {
        path: '/repeated',
        name: 'repeated',
        component: RepeatedView,
        meta: { title: 'Canciones repetidas (MVP)', requiresAuth: true }
      },
      {
        path: '/playlists',
        name: 'playlists',
        component: PlaylistsView,
        meta: { title: 'Playlists & Listas', requiresAuth: true }
      },
      {
        path: '/seguridad',
        alias: '/usuarios',
        name: 'seguridad',
        component: RolesTestView,
        meta: {
          title: 'Administración de Usuarios',
          requiresAuth: true,
          allowedRoles: ['super_admin', 'admin']
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Navigation Guard (Protección de Rutas Privadas, Sesiones Vencidas y Roles RBAC)
router.beforeEach((to) => {
  const { isAuthenticated, currentUser } = useAuth()
  const authenticated = isAuthenticated.value

  // 1. Si la ruta es privada y el usuario cerró sesión o no tiene sesión activa -> Bloquear y redirigir a /login
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authenticated || !currentUser.value?.id) {
      registrarEventoSeguridad({
        accion: `ACCESO A RUTA PRIVADA (${to.fullPath})`,
        recurso: to.fullPath,
        permitido: false,
        motivo: 'Usuario sin sesión activa o sesión cerrada intentó acceder por ruta directa.'
      })
      return {
        path: '/login',
        query: { redirect: to.fullPath }
      }
    }
  }

  // 2. Si la ruta exige roles específicos (allowedRoles)
  const requiredRoles = to.meta?.allowedRoles
  if (requiredRoles && Array.isArray(requiredRoles)) {
    const userRole = currentUser.value?.rol
    if (!requiredRoles.includes(userRole)) {
      registrarEventoSeguridad({
        accion: `RUTA RESTRINGIDA POR ROL (${to.fullPath})`,
        recurso: to.fullPath,
        permitido: false,
        motivo: `Rol '${userRole}' no autorizado para la ruta.`
      })
      return { path: '/dashboard' }
    }
  }

  // 3. Si es una ruta solo para invitados (/login, /register) y ya hay sesión activa
  if (to.matched.some(record => record.meta.guestOnly)) {
    if (authenticated) {
      return { path: '/dashboard' }
    }
  }

  return true
})

export default router
