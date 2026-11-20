<template>
  <div class="shell">
    <!-- BACKDROP PARA MENÚ LATERAL EN MÓVIL -->
    <div
      v-if="mobileSidebarOpen"
      class="mobile-sidebar-backdrop"
      @click="mobileSidebarOpen = false"
    ></div>

    <!-- PANEL LATERAL ESTÁTICO (DESPLEGABLE EN MÓVIL) -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileSidebarOpen }">
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
          <span class="nav-text">Apps Conectadas</span>
        </RouterLink>

        <RouterLink
          to="/quiz"
          class="nav"
          :class="{ active: route.path === '/quiz' }"
        >
          <span class="nav-icon"><AppIcon name="trophy" :size="18" /></span>
          <span class="nav-text">Quiz Musical</span>
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
          <!-- Pinned: Tus me gusta (Diseño Aurora exclusivo de Gavify) -->
          <button
            class="recent-pl-item fav-pinned-item"
            :class="{ active: route.path === '/playlists' && playlistFavoritos && route.query.id === playlistFavoritos.id }"
            @click="abrirFavoritos"
          >
            <div class="recent-pl-thumb fav-art-thumb">
              <FavoritosArtwork size="thumb" />
            </div>
            <div class="recent-pl-meta">
              <strong class="pl-name">Tus me gusta</strong>
              <span class="pl-creator">Playlist • {{ totalFavoritos }} {{ totalFavoritos === 1 ? 'canción' : 'canciones' }}</span>
            </div>
          </button>

          <button
            v-for="pl in recentPlaylistsFiltradas"
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
          <button
            type="button"
            class="mobile-menu-btn"
            title="Abrir menú"
            @click="mobileSidebarOpen = !mobileSidebarOpen"
          >
            <AppIcon name="menu" :size="20" />
          </button>
          <h1>{{ pageTitle }}</h1>
        </div>

        <!-- BUSCADOR CENTRAL DE CANCIONES (EN MÓVIL SOLO LUPA) -->
        <div class="topbar-search-wrap">
          <button
            type="button"
            class="mobile-search-icon-btn"
            title="Buscar canción o artista"
            @click="abrirBuscadorGlobal"
          >
            <AppIcon name="search" :size="18" />
          </button>
          <div
            class="topbar-search-box"
            :class="{ active: showGlobalSearch }"
            @click="abrirBuscadorGlobal"
          >
            <AppIcon name="search" :size="16" />
            <input
              v-model="globalSearchQuery"
              type="text"
              placeholder="Artista, canción, álbum..."
              @focus="abrirBuscadorGlobal"
              @input="abrirBuscadorGlobal"
              @keydown.esc="showGlobalSearch = false"
            />
            <button
              v-if="globalSearchQuery"
              type="button"
              class="topbar-search-clear"
              title="Limpiar"
              @click.stop="globalSearchQuery = ''"
            >
              <AppIcon name="close" :size="13" />
            </button>
          </div>
        </div>

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
                <span>Apps conectadas</span>
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

    <!-- PANEL FLOTANTE DE BÚSQUEDA MULTI-PLATAFORMA (IDÉNTICO A EXPLORAR MÚSICA) -->
    <GlobalMusicSearch
      :is-open="showGlobalSearch"
      :initial-query="globalSearchQuery"
      @close="showGlobalSearch = false"
      @update:query="val => (globalSearchQuery = val)"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import FavoritosArtwork from '@/components/FavoritosArtwork.vue'
import BottomPlayer from '@/components/BottomPlayer.vue'
import GlobalMusicSearch from '@/components/GlobalMusicSearch.vue'
import { useAuth } from '@/services/auth'
import { dbService, playlistsRevision } from '@/services/db'
import { usePlayer } from '@/services/player'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const player = usePlayer()

const showUserMenu = ref(false)
const mobileSidebarOpen = ref(false)
const showGlobalSearch = ref(false)
const globalSearchQuery = ref('')
const recentPlaylists = ref([])

function abrirBuscadorGlobal() {
  showUserMenu.value = false
  showGlobalSearch.value = true
}
const playlistFavoritos = ref(null)
const totalFavoritos = ref(0)

const recentPlaylistsFiltradas = computed(() => {
  return recentPlaylists.value.filter(
    p => p.nombre?.toLowerCase() !== 'tus me gusta' && p.tipo !== 'favoritos'
  )
})

const pageTitle = computed(() => {
  if (route.path === '/playlists' && route.query.id) {
    if (playlistFavoritos.value && route.query.id === playlistFavoritos.value.id) {
      return 'Tus me gusta'
    }
    const found = recentPlaylists.value.find(p => p.id === route.query.id)
    return found ? found.nombre : 'Playlist'
  }
  return route.meta.title || 'Tu música'
})

async function cargarPlaylistsRecientes() {
  try {
    recentPlaylists.value = await dbService.getRecentPlaylists()
    const fav = await dbService.getOrCreateFavoritosPlaylist()
    playlistFavoritos.value = fav
    const favCanciones = await dbService.getCancionesByPlaylist(fav.id)
    totalFavoritos.value = favCanciones.length
  } catch (e) {
    console.warn('Error cargando playlists recientes:', e)
  }
}

function abrirFavoritos() {
  if (playlistFavoritos.value) {
    dbService.markPlaylistUsed(playlistFavoritos.value.id)
    router.push({ path: '/playlists', query: { id: playlistFavoritos.value.id } })
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
  () => route.fullPath,
  () => {
    showGlobalSearch.value = false
    showUserMenu.value = false
    mobileSidebarOpen.value = false
  }
)

watch(
  () => [playlistsRevision.value, auth.currentUser.value?.id, route.fullPath],
  () => {
    cargarPlaylistsRecientes()
  }
)

function onLibraryUpdated() {
  cargarPlaylistsRecientes()
}

onMounted(() => {
  cargarPlaylistsRecientes()
  window.addEventListener('gavify:library-updated', onLibraryUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('gavify:library-updated', onLibraryUpdated)
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}

.recent-list::-webkit-scrollbar {
  width: 5px;
}

.recent-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
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

.fav-art-thumb {
  background: transparent !important;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 190, 85, 0.35);
  box-shadow: 0 2px 10px rgba(235, 63, 91, 0.28);
}

.fav-pinned-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
  padding-bottom: 8px;
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
  gap: 20px;
  flex-shrink: 0;
  z-index: 40;
}

.topbar-search-wrap {
  flex: 1;
  max-width: 460px;
  display: flex;
  justify-content: center;
}

.topbar-search-box {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #171c17;
  border: 1px solid #283027;
  border-radius: 999px;
  padding: 8px 14px;
  color: var(--muted);
  cursor: text;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.topbar-search-box:hover,
.topbar-search-box.active {
  background: #1c221c;
  border-color: var(--lime);
  box-shadow: 0 0 0 3px rgba(184, 223, 109, 0.12);
  color: var(--cream);
}

.topbar-search-box input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  color: var(--cream);
  font-size: 13px;
  outline: none;
}

.topbar-search-box input::placeholder {
  color: #7d857c;
}

.topbar-search-clear {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--cream);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.topbar-search-clear:hover {
  background: rgba(255, 255, 255, 0.16);
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

.mobile-menu-btn,
.mobile-search-icon-btn {
  display: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #181c18;
  border: 1px solid #2b312a;
  color: var(--cream);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.mobile-sidebar-backdrop {
  display: none;
}

@media (max-width: 960px) {
  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-menu-btn {
    display: inline-flex !important;
  }

  .mobile-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(3px);
    z-index: 960;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 265px !important;
    padding: 20px 14px !important;
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 970;
    box-shadow: 12px 0 36px rgba(0, 0, 0, 0.75);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar .brand span,
  .sidebar .nav-text,
  .sidebar .recent-playlists-section,
  .sidebar .sidebar-action-wrap {
    display: flex;
  }

  .sidebar .brand span {
    display: inline;
  }

  .sidebar .recent-playlists-section {
    flex-direction: column;
  }

  .sync-pill {
    display: none;
  }
}

@media (max-width: 720px) {
  .topbar {
    padding: 12px 14px;
    gap: 10px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .topbar-left h1 {
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topbar-search-wrap {
    flex: 0 0 auto;
    width: auto;
  }

  .topbar-search-box {
    display: none;
  }

  .mobile-search-icon-btn {
    display: inline-flex;
  }

  .profile-top-btn {
    padding: 3px;
    border-radius: 50%;
  }

  .profile-top-info,
  .caret-icon,
  .admin-chip {
    display: none;
  }

  .connected-apps-pill {
    display: none;
  }

  .content {
    padding: 14px 14px 48px;
  }

  .content.has-player {
    padding-bottom: 215px;
  }
}
</style>
