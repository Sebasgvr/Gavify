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
import { useAuth } from '@/services/auth'

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
    meta: { requiresAuth: true }
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
        meta: { title: 'Gestor de Música', requiresAuth: true }
      },
      {
        path: '/repeated',
        name: 'repeated',
        component: RepeatedView,
        meta: { title: 'Canciones repetidas', requiresAuth: true }
      },
      {
        path: '/playlists',
        name: 'playlists',
        component: PlaylistsView,
        meta: { title: 'Playlists & estadísticas', requiresAuth: true }
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

// Navigation Guard (Vue Router 4 standard return format)
router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()
  const authenticated = isAuthenticated.value

  // If route requires auth and user is not logged in
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath }
      }
    }
  }

  // If route is guest-only (login/register) and user is already logged in
  if (to.matched.some(record => record.meta.guestOnly)) {
    if (authenticated) {
      return { path: '/dashboard' }
    }
  }

  return true
})

export default router
