<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </div>

      <nav>
        <p class="nav-label">TU MÚSICA</p>
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav"
          :class="{ active: route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="bottom">
        <div class="profile" @click="toggleUserMenu">
          <div class="avatar">{{ userInitials }}</div>
          <div>
            <strong>{{ userName }}</strong>
            <small>{{ isSpotifyConnected ? 'Spotify conectado' : 'Cuenta lista' }}</small>
          </div>
        </div>
        <button @click="handleLogout" class="logout-btn">
          Cerrar sesión <span>↗</span>
        </button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <router-link to="/dashboard" class="mobile-logo">
          <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        </router-link>
        <div>
          <p class="eyebrow">ANÁLISIS MUSICAL</p>
          <h1>{{ currentTitle }}</h1>
        </div>
        <div class="top-actions">
          <span class="sync"></span>
          <span class="sync-text">Sincronizado ahora</span>
          <div class="user-menu-wrapper">
            <button class="profile-btn" @click="toggleUserMenu">
              {{ userInitials }}　⌄
            </button>
            <div v-if="showUserMenu" class="user-dropdown-menu">
              <div class="dropdown-header">
                <strong>{{ userName }}</strong>
                <small>{{ userEmail }}</small>
                <span class="user-badge">{{ userPlan }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <router-link to="/connect" class="dropdown-item" @click="showUserMenu = false">
                <span>●</span> Conexión Spotify
              </router-link>
              <button class="dropdown-item danger" @click="handleLogout">
                <span>↗</span> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="content">
        <slot>
          <router-view />
        </slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const showUserMenu = ref(false)

const navItems = [
  { path: '/dashboard', icon: '◈', label: 'Resumen' },
  { path: '/repeated', icon: '↻', label: 'Repetidas' },
  { path: '/playlists', icon: '☷', label: 'Playlists' }
]

const currentTitle = computed(() => {
  return route.meta?.title || 'Tu resumen'
})

const userName = computed(() => {
  return auth.currentUser.value?.name || 'Usuario'
})

const userEmail = computed(() => {
  return auth.currentUser.value?.email || ''
})

const userInitials = computed(() => {
  return auth.userInitials.value
})

const userPlan = computed(() => {
  return auth.currentUser.value?.plan || 'Gavify Free'
})

const isSpotifyConnected = computed(() => {
  return auth.currentUser.value?.spotifyConnected ?? false
})

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

async function handleLogout() {
  showUserMenu.value = false
  await auth.logout()
  router.push('/login')
}
</script>
