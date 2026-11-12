<template>
  <div class="shell">
    <!-- PANEL LATERAL ESTÁTICO (SIN SCROLL DE PÁGINA) -->
    <aside class="sidebar">
      <router-link to="/dashboard" class="brand">
        <img class="logo-image" src="/GavifyLogo.png" alt="Gavify" />
        <span>GAVIFY</span>
      </router-link>

      <!-- Navegación Principal -->
      <nav class="main-nav">
        <RouterLink
          to="/dashboard"
          class="nav"
          :class="{ active: route.path === '/dashboard' || route.path === '/inicio' }"
        >
          <span class="nav-icon"><AppIcon name="home" :size="18" /></span>
          <span class="nav-text">Principal</span>
        </RouterLink>

        <RouterLink
          to="/musica"
          class="nav"
          :class="{ active: route.path === '/musica' }"
        >
          <span class="nav-icon"><AppIcon name="music" :size="18" /></span>
          <span class="nav-text">Explorar Música</span>
        </RouterLink>

        <RouterLink
          to="/playlists"
          class="nav"
          :class="{ active: route.path === '/playlists' && !route.query.id }"
        >
          <span class="nav-icon"><AppIcon name="playlist" :size="18" /></span>
          <span class="nav-text">Playlists</span>
        </RouterLink>

        <RouterLink
          to="/connect"
          class="nav"
          :class="{ active: route.path === '/connect' }"
        >
          <span class="nav-icon"><AppIcon name="link" :size="18" /></span>
          <span class="nav-text">Conectar APIs</span>
        </RouterLink>

        <RouterLink
          v-if="auth.canManageUsers.value"
          to="/seguridad"
          class="nav"
          :class="{ active: route.path === '/seguridad' || route.path === '/usuarios' }"
        >
          <span class="nav-icon"><AppIcon name="shield" :size="18" /></span>
          <span class="nav-text">Administrar Usuarios</span>
        </RouterLink>
      </nav>

      <!-- Botón + Nueva Playlist estilo YouTube Music / Spotify -->
      <div v-if="auth.canManagePlaylists.value" class="sidebar-action-wrap">
        <button class="new-playlist-pill" @click="irACrearPlaylist">
          <AppIcon name="plus" :size="16" />
          <span class="nav-text">Nueva playlist</span>
        </button>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Sección de Playlists Usadas Recientemente -->
      <div class="recent-playlists-section">
        <div class="recent-header">
          <span class="recent-label">Recientes</span>
          <RouterLink to="/playlists" class="see-all-link">Ver todas</RouterLink>
        </div>

        <div class="recent-list">
          <button
            v-for="pl in recentPlaylists"
            :key="pl.id"
            class="recent-pl-item"
            :class="{ active: route.path === '/playlists' && route.query.id === pl.id }"
            @click="abrirPlaylistReciente(pl.id)"
          >
            <div class="recent-pl-thumb">
              <img
                v-if="pl.portada_url"
                :src="pl.portada_url"
                :alt="pl.nombre"
                class="thumb-single"
              />
              <div
                v-else-if="pl.collage_portadas && pl.collage_portadas.length >= 4"
                class="thumb-collage"
              >
                <img
                  v-for="(img, idx) in pl.collage_portadas.slice(0, 4)"
                  :key="idx"
                  :src="img"
                  alt=""
                />
              </div>
              <div v-else class="thumb-fallback">
                <AppIcon name="music" :size="16" />
              </div>
            </div>

            <div class="recent-pl-meta">
              <strong>{{ pl.nombre }}</strong>
              <small>
                Playlist • {{ pl.creador_nombre || auth.currentUser.value?.nombre }}
              </small>
            </div>
          </button>
        </div>
      </div>
    </aside>

    <!-- ÁREA PRINCIPAL (CONTENIDO SCROLLEABLE + PERFIL ARRIBA A LA DERECHA) -->
    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1>{{ pageTitle }}</h1>
        </div>

        <button class="mobile-logo" @click="router.push('/dashboard')">G.</button>

        <!-- PERFIL Y CUENTA ARRIBA A LA DERECHA -->
        <div class="top-actions">
          <div class="sync-pill">
            <span class="sync"></span>
            <span class="sync-text">
              Spotify • YT Music • YouTube
            </span>
          </div>

          <span v-if="auth.isSuperAdmin.value" class="admin-chip">
            SUPER ADMIN
          </span>
          <span v-else-if="auth.isAdmin.value" class="admin-chip">
            ADMIN
          </span>

          <div class="user-menu-wrapper">
            <button
              class="profile-top-btn"
              @click="showUserMenu = !showUserMenu"
            >
              <div class="avatar-top">{{ auth.currentUser.value?.avatar || 'SG' }}</div>
              <div class="profile-top-info">
                <strong>{{ auth.currentUser.value?.nombre || 'Usuario' }}</strong>
                <small>{{ auth.roleInfo.value?.etiqueta }}</small>
              </div>
              <span class="caret-icon"><AppIcon name="chevron-down" :size="14" /></span>
            </button>

            <div v-if="showUserMenu" class="user-dropdown-menu">
              <div class="dropdown-profile-card">
                <div class="avatar-lg">{{ auth.currentUser.value?.avatar || 'SG' }}</div>
                <div class="dropdown-profile-meta">
                  <strong>{{ auth.currentUser.value?.nombre }}</strong>
                  <small>{{ auth.currentUser.value?.email }}</small>
                  <span class="user-badge">{{ auth.roleInfo.value?.etiqueta }}</span>
                </div>
              </div>

              <div class="dropdown-org-box">
                <span class="tiny">ORGANIZACIÓN</span>
                <strong>{{ auth.currentUser.value?.organizacion_nombre }}</strong>
                <small>{{ auth.currentUser.value?.plan }}</small>
              </div>

              <div class="dropdown-divider"></div>

              <button class="dropdown-item" @click="goToConnect">
                <AppIcon name="link" :size="15" />
                <span>APIs conectadas</span>
              </button>

              <button
                v-if="auth.canManageUsers.value"
                class="dropdown-item"
                @click="goToAdminUsers"
              >
                <AppIcon name="shield" :size="15" />
                <span>Administrar Usuarios</span>
              </button>

              <div class="dropdown-divider"></div>

              <button class="dropdown-item danger" @click="handleLogout">
                <AppIcon name="logout" :size="15" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- ÚNICO CONTENEDOR CON SCROLL VERTICAL -->
      <div class="content" :class="{ 'has-player': Boolean(player.currentTrack.value) }" @click="showUserMenu = false">
        <RouterView />
      </div>
    </main>

    <!-- REPRODUCTOR GLOBAL FIJO DE LADO A LADO EN EL FOOTER -->
    <BottomPlayer />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BottomPlayer from '@/components/BottomPlayer.vue'
import { useAuth } from '@/services/auth'
import { dbService, playlistsRevision } from '@/services/db'
import { usePlayer } from '@/services/player'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const player = usePlayer()

const showUserMenu = ref(false)
const recentPlaylists = ref([])

const pageTitle = computed(() => {
  if (route.path === '/playlists' && route.query.id) {
    const found = recentPlaylists.value.find(p => p.id === route.query.id)
    return found ? found.nombre : 'Playlist'
  }
  return route.meta.title || 'Tu música'
})

async function cargarPlaylistsRecientes() {
  try {
    recentPlaylists.value = await dbService.getRecentPlaylists()
  } catch (e) {
    console.warn('Error cargando playlists recientes:', e)
  }
}

function abrirPlaylistReciente(playlistId) {
  dbService.markPlaylistUsed(playlistId)
  router.push({ path: '/playlists', query: { id: playlistId } })
}

function irACrearPlaylist() {
  router.push({ path: '/playlists', query: { action: 'new' } })
}

function goToConnect() {
  showUserMenu.value = false
  router.push('/connect')
}

function goToAdminUsers() {
  showUserMenu.value = false
  router.push('/seguridad')
}

async function handleLogout() {
  showUserMenu.value = false
  player.closePlayer()
  await auth.logout()
  router.replace('/login')
}

watch(
  () => [playlistsRevision.value, auth.currentUser.value?.id, route.fullPath],
  () => {
    cargarPlaylistsRecientes()
  }
)

onMounted(() => {
  cargarPlaylistsRecientes()
})
</script>

<style scoped>
/* Layout fijo en pantalla: panel lateral estático, solo el contenido scrollea */
.shell {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  background: #0d0f0d;
}

.sidebar {
  width: 264px;
  height: 100vh;
  overflow: hidden;
  background: #0a0c0a;
  border-right: 1px solid #1f241f;
  padding: 22px 16px 18px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  user-select: none;
}

.sidebar .brand {
  margin: 0 8px 22px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-nav {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav {
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #a1a8a0;
  transition: background 0.15s ease, color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.nav.active {
  background: #20271f;
  color: var(--lime);
}

.sidebar-action-wrap {
  margin-top: 14px;
  padding: 0 4px;
}

.new-playlist-pill {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 999px;
  background: #1b201b;
  border: 1px solid #2e362d;
  color: var(--cream);
  font-size: 13px;
  font-weight: 700;
  transition: all 0.18s ease;
}

.new-playlist-pill:hover {
  background: #262d25;
  border-color: var(--lime);
  color: var(--lime);
}

.sidebar-divider {
  height: 1px;
  background: #1f241f;
  margin: 16px 6px 12px;
  flex-shrink: 0;
}

/* Playlists usadas recientemente en el panel lateral */
.recent-playlists-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px 10px;
}

.recent-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #7c847b;
  text-transform: uppercase;
}

.see-all-link {
  font-size: 11px;
  font-weight: 600;
  color: var(--lime);
  opacity: 0.85;
}

.see-all-link:hover {
  opacity: 1;
  text-decoration: underline;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.recent-pl-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 12px;
  text-align: left;
  transition: background 0.15s ease;
}

.recent-pl-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.recent-pl-item.active {
  background: rgba(184, 223, 109, 0.13);
}

.recent-pl-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #1b211b;
}

.thumb-single {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-collage {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.thumb-collage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--lime);
}

.recent-pl-meta {
  min-width: 0;
  flex: 1;
}

.recent-pl-meta strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-pl-item.active .recent-pl-meta strong {
  color: var(--lime);
}

.recent-pl-meta small {
  display: block;
  font-size: 11px;
  color: #7d857c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* Contenedor derecho: Topbar fija + Contenido con scroll propio */
.main {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111411;
}

.topbar {
  height: 74px;
  padding: 0 34px;
  border-bottom: 1px solid #202620;
  background: rgba(17, 20, 17, 0.92);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  z-index: 40;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 30px 36px 60px;
  max-width: 1520px;
  width: 100%;
  margin: 0 auto;
}

.content.has-player {
  padding-bottom: 120px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  background: #171b17;
  border: 1px solid #272e26;
}

.sync-text {
  margin-right: 0;
  font-size: 11px;
  color: #939b92;
}

.admin-chip {
  background: rgba(184, 223, 109, 0.16);
  border: 1px solid var(--lime);
  color: var(--lime);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 5px 12px;
  border-radius: 999px;
}

.producer-chip {
  background: rgba(231, 187, 89, 0.16);
  border: 1px solid var(--yellow);
  color: var(--yellow);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 5px 12px;
  border-radius: 999px;
}

/* Botón de Perfil arriba a la derecha */
.profile-top-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: #191e19;
  border: 1px solid #2e362d;
  transition: all 0.15s ease;
}

.profile-top-btn:hover {
  border-color: var(--lime);
  background: #202720;
}

.avatar-top {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--lime), #7eb338);
  color: #111511;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
}

.profile-top-info {
  text-align: left;
  line-height: 1.2;
}

.profile-top-info strong {
  display: block;
  font-size: 12px;
  color: var(--cream);
}

.profile-top-info small {
  display: block;
  font-size: 10px;
  color: var(--lime);
}

.caret-icon {
  color: var(--muted);
  display: inline-flex;
  align-items: center;
}

.user-dropdown-menu {
  width: 270px;
  padding: 14px;
  border-radius: 16px;
}

.dropdown-profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.avatar-lg {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--lime), #7eb338);
  color: #111511;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.dropdown-profile-meta strong {
  display: block;
  font-size: 14px;
  color: var(--cream);
}

.dropdown-profile-meta small {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.dropdown-org-box {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #141814;
  border: 1px solid #262d25;
}

.dropdown-org-box strong {
  display: block;
  font-size: 12px;
  color: var(--cream);
  margin-top: 2px;
}

.dropdown-org-box small {
  display: block;
  font-size: 11px;
  color: var(--lime);
  margin-top: 2px;
}

@media (max-width: 900px) {
  .sidebar {
    width: 78px;
    padding: 18px 10px;
  }

  .nav-text,
  .recent-playlists-section,
  .sidebar .brand span {
    display: none;
  }

  .new-playlist-pill {
    padding: 10px;
  }

  .sync-pill {
    display: none;
  }
}
</style>
