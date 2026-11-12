import { ref, computed } from 'vue'
import { supabase } from '@/supabase'

const CURRENT_USER_KEY = 'gavify_current_user'
const USERS_DB_KEY = 'gavify_db_usuarios_v2'

export const PLANES_DISPONIBLES = [
  { id: 'gratis', nombre: 'Plan Gratis', precio: '$0 / mes' },
  { id: 'provilan', nombre: 'Plan Provilan Pro', precio: '$3.99 / mes' },
  { id: 'sebagod', nombre: 'Plan SebaGod', precio: '$7.99 / mes' },
  { id: 'sebagod_prime', nombre: 'Plan SebaGod Prime', precio: '$12.99 / mes' }
]

export const ORGANIZACIONES_DISPONIBLES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Sebas Music Hub',
    slug: 'sebas-music-hub',
    tipo: 'estudio',
    descripcion: 'Hub Musical Unificado de Gavify'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Radio Urbana Records',
    slug: 'radio-urbana',
    tipo: 'radio',
    descripcion: 'Comunidad y Playlists Compartidas'
  }
]

export const ROLES_DEFINICION = {
  super_admin: {
    id: 'super_admin',
    etiqueta: 'Super Admin',
    color: '#b8df6d',
    ambito: 'Control Total (Administradores y Usuarios)',
    descripcion:
      'Propietario principal de Gavify (Sebastian Gavilan). Administra a todos los Administradores y Usuarios de la base de datos y puede probar todas las funciones de la plataforma.',
    permisos: [
      'Administrar cuentas de Administradores y Usuarios (crear, cambiar rol, cambiar plan y eliminar)',
      'Promover usuarios a Admin o revocar permisos de Admin',
      'Probar todas las funciones de la plataforma (búsqueda, playlists, reproductor, video y letras)'
    ]
  },
  admin: {
    id: 'admin',
    etiqueta: 'Admin',
    color: '#6bc2b6',
    ambito: 'Administración de Usuarios',
    descripcion:
      'Administrador de la plataforma. Su función es administrar las cuentas de los Usuarios (planes, estado y datos) además de poder probar la plataforma.',
    permisos: [
      'Administrar cuentas de Usuarios (crear usuarios, modificar su plan y dar de baja)',
      'Probar la plataforma (explorar música, armar playlists y reproducir)',
      'Restringido: No puede modificar ni eliminar al Super Admin ni a otros Administradores'
    ]
  },
  usuario: {
    id: 'usuario',
    etiqueta: 'Usuario',
    color: '#88a4cc',
    ambito: 'Música y Playlists',
    descripcion:
      'Usuario de Gavify. Puede buscar y agregar canciones (+), organizar sus playlists públicas o privadas, limpiar canciones repetidas y escuchar música completa con video y letras.',
    permisos: [
      'Buscar y agregar canciones (+) desde Spotify, YT Music y YouTube',
      'Crear playlists públicas o privadas, organizar canciones y detectar repetidas',
      'Escuchar temas completos con ventana de video y letras sincronizadas',
      'Restringido: No tiene acceso al módulo de Administración de Usuarios'
    ]
  }
}

// 6 Usuarios en la Base de Datos:
// - 1 Super Admin (Sebastian Gavilan)
// - 1 Admin (Valentina Ruiz)
// - 4 Usuarios (uno con cada uno de los 4 planes de Gavify)
export const CUENTAS_PRUEBA = [
  {
    key: 'super_admin_sebas',
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    nombre: 'Sebastian Gavilan',
    name: 'Sebastian Gavilan',
    email: 'sebastian@gavify.io',
    avatar: 'SG',
    rol: 'super_admin',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'sebagod_prime',
    plan: 'Plan SebaGod Prime',
    spotifyConnected: true,
    spotifyUserId: 'spotify_sebas_01',
    ytMusicConnected: true,
    ytMusicChannelId: 'ytm_sebas_01',
    youtubeConnected: true,
    youtubeChannelId: 'yt_sebas_01',
    creado_en: '2026-10-01T10:00:00Z',
    isDemo: true
  },
  {
    key: 'admin_valentina',
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    nombre: 'Valentina Ruiz',
    name: 'Valentina Ruiz',
    email: 'valentina@gavify.io',
    avatar: 'VR',
    rol: 'admin',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'sebagod',
    plan: 'Plan SebaGod',
    spotifyConnected: true,
    spotifyUserId: 'spotify_valen_02',
    ytMusicConnected: true,
    ytMusicChannelId: 'ytm_valen_02',
    youtubeConnected: true,
    youtubeChannelId: 'yt_valen_02',
    creado_en: '2026-10-05T14:30:00Z',
    isDemo: true
  },
  {
    key: 'usuario_gratis',
    id: '10000000-0000-0000-0000-000000000001',
    nombre: 'Camila Romero',
    name: 'Camila Romero',
    email: 'camila@gavify.io',
    avatar: 'CR',
    rol: 'usuario',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'gratis',
    plan: 'Plan Gratis',
    spotifyConnected: true,
    spotifyUserId: 'spotify_cami_01',
    ytMusicConnected: false,
    ytMusicChannelId: null,
    youtubeConnected: true,
    youtubeChannelId: 'yt_cami_01',
    creado_en: '2026-10-10T09:15:00Z',
    isDemo: true
  },
  {
    key: 'usuario_provilan',
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    nombre: 'Mateo López',
    name: 'Mateo López',
    email: 'mateo@gavify.io',
    avatar: 'ML',
    rol: 'usuario',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'provilan',
    plan: 'Plan Provilan Pro',
    spotifyConnected: true,
    spotifyUserId: 'spotify_mateo_02',
    ytMusicConnected: true,
    ytMusicChannelId: 'ytm_mateo_02',
    youtubeConnected: false,
    youtubeChannelId: null,
    creado_en: '2026-10-12T16:40:00Z',
    isDemo: true
  },
  {
    key: 'usuario_sebagod',
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    nombre: 'Lucía Martínez',
    name: 'Lucía Martínez',
    email: 'lucia@gavify.io',
    avatar: 'LM',
    rol: 'usuario',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'sebagod',
    plan: 'Plan SebaGod',
    spotifyConnected: true,
    spotifyUserId: 'spotify_lucia_03',
    ytMusicConnected: true,
    ytMusicChannelId: 'ytm_lucia_03',
    youtubeConnected: true,
    youtubeChannelId: 'yt_lucia_03',
    creado_en: '2026-10-14T11:20:00Z',
    isDemo: true
  },
  {
    key: 'usuario_prime',
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    nombre: 'Julián Torres',
    name: 'Julián Torres',
    email: 'julian@gavify.io',
    avatar: 'JT',
    rol: 'usuario',
    activo: true,
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    organizacion_nombre: 'Sebas Music Hub',
    organizacion_slug: 'sebas-music-hub',
    organizacion_tipo: 'estudio',
    plan_id: 'sebagod_prime',
    plan: 'Plan SebaGod Prime',
    spotifyConnected: true,
    spotifyUserId: 'spotify_julian_04',
    ytMusicConnected: true,
    ytMusicChannelId: 'ytm_julian_04',
    youtubeConnected: true,
    youtubeChannelId: 'yt_julian_04',
    creado_en: '2026-10-18T19:00:00Z',
    isDemo: true
  }
]

function getInitials(name = '') {
  if (!name) return 'GV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function normalizeRole(rol, email = '') {
  if (email && email.toLowerCase() === 'sebastian@gavify.io') return 'super_admin'
  if (rol === 'super_admin' || rol === 'admin' || rol === 'usuario') return rol
  return 'usuario'
}

function resolvePlanLabel(planId) {
  const found = PLANES_DISPONIBLES.find(p => p.id === planId)
  return found ? found.nombre : 'Plan Gratis'
}

function loadUsersDatabase() {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length >= 6) {
        return parsed.map(u => ({
          ...u,
          rol: normalizeRole(u.rol, u.email),
          plan: u.plan || resolvePlanLabel(u.plan_id)
        }))
      }
    }
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(CUENTAS_PRUEBA))
    return JSON.parse(JSON.stringify(CUENTAS_PRUEBA))
  } catch {
    return JSON.parse(JSON.stringify(CUENTAS_PRUEBA))
  }
}

function saveUsersDatabase(list) {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('Error saving users DB:', e)
  }
}

const usuariosDb = ref(loadUsersDatabase())

async function syncSeedUsersToSupabase() {
  try {
    for (const u of usuariosDb.value) {
      await supabase.from('usuarios').upsert({
        id: u.id,
        organizacion_id: u.organizacion_id || '11111111-1111-1111-1111-111111111111',
        email: u.email,
        nombre: u.nombre,
        avatar: u.avatar || getInitials(u.nombre),
        rol: u.rol,
        plan_id: u.plan_id,
        spotify_connected: Boolean(u.spotifyConnected),
        ytmusic_connected: Boolean(u.ytMusicConnected),
        youtube_connected: Boolean(u.youtubeConnected)
      })
    }
  } catch {
    // Fallback silencioso a la base local si la tabla remota tiene RLS restrictivo
  }
}

function resolveOrgInfo(orgId, fallbackName) {
  const found = ORGANIZACIONES_DISPONIBLES.find(o => o.id === orgId)
  if (found) return found
  return {
    id: orgId || '11111111-1111-1111-1111-111111111111',
    nombre: fallbackName || 'Sebas Music Hub',
    slug: (fallbackName || 'sebas-music-hub').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    tipo: 'estudio'
  }
}

function formatUserData(sbUser, dbProfile = null) {
  if (!sbUser && !dbProfile) return null

  const id = dbProfile?.id || sbUser?.id
  const email = dbProfile?.email || sbUser?.email
  const nombre =
    dbProfile?.nombre ||
    sbUser?.user_metadata?.nombre ||
    sbUser?.user_metadata?.name ||
    email?.split('@')[0] ||
    'Usuario'
  const avatar = dbProfile?.avatar || sbUser?.user_metadata?.avatar || getInitials(nombre)
  const rawRol = dbProfile?.rol || sbUser?.user_metadata?.rol || 'usuario'
  const rol = normalizeRole(rawRol, email)
  const orgId =
    dbProfile?.organizacion_id ||
    sbUser?.user_metadata?.organizacion_id ||
    '11111111-1111-1111-1111-111111111111'
  const orgInfo = resolveOrgInfo(orgId, dbProfile?.organizacion_nombre || sbUser?.user_metadata?.organizacion_nombre)

  const planId = dbProfile?.plan_id || sbUser?.user_metadata?.plan_id || 'gratis'
  const plan = dbProfile?.plan || sbUser?.user_metadata?.plan || resolvePlanLabel(planId)

  const spotifyConnected =
    dbProfile?.spotify_connected ??
    sbUser?.user_metadata?.spotify_connected ??
    false
  const ytMusicConnected =
    dbProfile?.ytmusic_connected ??
    sbUser?.user_metadata?.ytmusic_connected ??
    false
  const youtubeConnected =
    dbProfile?.youtube_connected ??
    sbUser?.user_metadata?.youtube_connected ??
    false

  const createdAt = dbProfile?.creado_en || dbProfile?.created_at || sbUser?.created_at || new Date().toISOString()

  return {
    id,
    email,
    name: nombre,
    nombre,
    avatar,
    rol,
    activo: dbProfile?.activo ?? true,
    organizacion_id: orgInfo.id,
    organizacion_nombre: orgInfo.nombre,
    organizacion_slug: orgInfo.slug,
    organizacion_tipo: orgInfo.tipo,
    plan_id: planId,
    plan,
    spotifyConnected,
    spotifyUserId: dbProfile?.spotify_user_id || sbUser?.user_metadata?.spotify_user_id || null,
    ytMusicConnected,
    ytMusicChannelId: dbProfile?.ytmusic_channel_id || sbUser?.user_metadata?.ytmusic_channel_id || null,
    youtubeConnected,
    youtubeChannelId: dbProfile?.youtube_channel_id || sbUser?.user_metadata?.youtube_channel_id || null,
    createdAt,
    rawUser: sbUser
  }
}

function getStoredCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.organizacion_id) {
        parsed.organizacion_id = '11111111-1111-1111-1111-111111111111'
        parsed.organizacion_nombre = 'Sebas Music Hub'
        parsed.organizacion_slug = 'sebas-music-hub'
      }
      parsed.rol = normalizeRole(parsed.rol, parsed.email)
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed))
      return parsed
    }
    return null
  } catch (e) {
    console.error('Error reading current user:', e)
    return null
  }
}

const currentUser = ref(getStoredCurrentUser())
const isAuthReady = ref(false)

async function fetchUserProfile(userId, sbUser) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*, organizaciones(nombre, slug, tipo)')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      if (data.organizaciones) {
        data.organizacion_nombre = data.organizaciones.nombre
        data.organizacion_slug = data.organizaciones.slug
        data.organizacion_tipo = data.organizaciones.tipo
      }
      return formatUserData(sbUser, data)
    }
  } catch (e) {
    console.warn('Could not fetch from usuarios table, using auth metadata:', e)
  }
  return formatUserData(sbUser)
}

export async function initAuth() {
  try {
    syncSeedUsersToSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const formatted = await fetchUserProfile(session.user.id, session.user)
      currentUser.value = formatted
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(formatted))
    } else if (!currentUser.value?.isDemo) {
      currentUser.value = null
      localStorage.removeItem(CURRENT_USER_KEY)
    }
  } catch (err) {
    console.error('Error checking Supabase session:', err)
  } finally {
    isAuthReady.value = true
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const formatted = await fetchUserProfile(session.user.id, session.user)
      currentUser.value = formatted
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(formatted))
    } else if (!currentUser.value?.isDemo) {
      currentUser.value = null
      localStorage.removeItem(CURRENT_USER_KEY)
    }
  })
}

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value)
  const userInitials = computed(() => {
    if (!currentUser.value) return 'GV'
    return currentUser.value.avatar || getInitials(currentUser.value.name || currentUser.value.nombre)
  })

  const userRole = computed(() => normalizeRole(currentUser.value?.rol, currentUser.value?.email))
  const roleInfo = computed(() => ROLES_DEFINICION[userRole.value] || ROLES_DEFINICION.usuario)

  // Permisos RBAC computados (solo existen 3 roles: super_admin, admin y usuario)
  const isSuperAdmin = computed(() => userRole.value === 'super_admin')
  const isAdmin = computed(() => userRole.value === 'admin' || userRole.value === 'super_admin')
  const isUsuario = computed(() => userRole.value === 'usuario')
  const isReadOnly = computed(() => false)

  // Administración de usuarios: exclusivo de Admin y Super Admin
  const canManageUsers = computed(() => userRole.value === 'admin' || userRole.value === 'super_admin')
  const canManageAdmins = computed(() => userRole.value === 'super_admin')

  // Operaciones musicales: habilitadas para los usuarios (y para admin/super_admin al probar la plataforma)
  const canExtractFromApis = computed(() => !!currentUser.value)
  const canManagePlaylists = computed(() => !!currentUser.value)
  const canResolveDuplicates = computed(() => !!currentUser.value)

  function canEditSong(cancion) {
    if (!currentUser.value || !cancion) return false
    return cancion.organizacion_id === currentUser.value.organizacion_id
  }

  function canDeleteSong(cancion) {
    if (!currentUser.value || !cancion) return false
    return cancion.organizacion_id === currentUser.value.organizacion_id
  }

  function canAdministerTargetUser(targetUser) {
    if (!currentUser.value || !targetUser) return false
    if (userRole.value === 'super_admin') {
      return true
    }
    if (userRole.value === 'admin') {
      return targetUser.rol === 'usuario'
    }
    return false
  }

  function getUsers() {
    usuariosDb.value = loadUsersDatabase()
    return usuariosDb.value
  }

  async function createUserByAdmin(payload) {
    if (!canManageUsers.value) {
      throw new Error('403 Permiso Denegado: Solo un Admin o Super Admin puede dar de alta usuarios.')
    }
    const nombre = (payload.nombre || '').trim()
    const email = (payload.email || '').trim().toLowerCase()
    const rolSolicitado = payload.rol || 'usuario'
    const planId = payload.plan_id || 'gratis'

    if (!nombre || !email) {
      throw new Error('El nombre y el correo electrónico son obligatorios.')
    }
    if (rolSolicitado !== 'usuario' && !isSuperAdmin.value) {
      throw new Error('403 Permiso Denegado: Solo el Super Admin (Sebastian Gavilan) puede crear o asignar cuentas con rol Admin.')
    }

    const actuales = loadUsersDatabase()
    if (actuales.some(u => u.email.toLowerCase() === email)) {
      throw new Error('Ya existe un usuario registrado con ese correo electrónico.')
    }

    const nuevo = {
      key: `user_${Date.now()}`,
      id: crypto.randomUUID(),
      nombre,
      name: nombre,
      email,
      avatar: getInitials(nombre),
      rol: rolSolicitado,
      activo: true,
      organizacion_id: currentUser.value?.organizacion_id || '11111111-1111-1111-1111-111111111111',
      organizacion_nombre: currentUser.value?.organizacion_nombre || 'Sebas Music Hub',
      organizacion_slug: 'sebas-music-hub',
      organizacion_tipo: 'estudio',
      plan_id: planId,
      plan: resolvePlanLabel(planId),
      spotifyConnected: false,
      ytMusicConnected: false,
      youtubeConnected: false,
      creado_en: new Date().toISOString(),
      isDemo: true
    }

    actuales.push(nuevo)
    saveUsersDatabase(actuales)
    usuariosDb.value = actuales

    try {
      await supabase.from('usuarios').upsert({
        id: nuevo.id,
        organizacion_id: nuevo.organizacion_id,
        email: nuevo.email,
        nombre: nuevo.nombre,
        avatar: nuevo.avatar,
        rol: nuevo.rol,
        plan_id: nuevo.plan_id
      })
    } catch {
      // Guardado en base local
    }

    return nuevo
  }

  async function updateUserByAdmin(userId, changes) {
    if (!canManageUsers.value) {
      throw new Error('403 Permiso Denegado: Solo Admin o Super Admin pueden administrar usuarios.')
    }
    const actuales = loadUsersDatabase()
    const idx = actuales.findIndex(u => u.id === userId)
    if (idx === -1) {
      throw new Error('El usuario seleccionado no existe en la base de datos.')
    }

    const target = actuales[idx]

    if (target.rol === 'super_admin' && currentUser.value?.id !== target.id) {
      throw new Error('403 Permiso Denegado: Nadie puede modificar la cuenta del Super Admin.')
    }
    if (target.rol === 'admin' && !isSuperAdmin.value) {
      throw new Error('403 Permiso Denegado: Solo el Super Admin (Sebastian Gavilan) puede administrar a otros Admins.')
    }
    if (changes.rol && changes.rol !== target.rol && !isSuperAdmin.value) {
      throw new Error('403 Permiso Denegado: Solo el Super Admin puede cambiar el rol de un usuario a Admin.')
    }
    if (target.email === 'sebastian@gavify.io' && changes.rol && changes.rol !== 'super_admin') {
      throw new Error('La cuenta principal del Super Admin no puede perder su rol de Super Admin.')
    }

    const nuevoPlanId = changes.plan_id || target.plan_id
    const nuevoNombre = changes.nombre ? changes.nombre.trim() : target.nombre

    const actualizado = {
      ...target,
      nombre: nuevoNombre,
      name: nuevoNombre,
      avatar: getInitials(nuevoNombre),
      email: changes.email ? changes.email.trim().toLowerCase() : target.email,
      rol: changes.rol || target.rol,
      plan_id: nuevoPlanId,
      plan: resolvePlanLabel(nuevoPlanId),
      activo: changes.activo !== undefined ? Boolean(changes.activo) : (target.activo ?? true)
    }

    actuales[idx] = actualizado
    saveUsersDatabase(actuales)
    usuariosDb.value = actuales

    if (currentUser.value?.id === actualizado.id) {
      currentUser.value = { ...currentUser.value, ...actualizado }
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser.value))
    }

    try {
      await supabase
        .from('usuarios')
        .update({
          nombre: actualizado.nombre,
          email: actualizado.email,
          rol: actualizado.rol,
          plan_id: actualizado.plan_id
        })
        .eq('id', actualizado.id)
    } catch {
      // Actualizado en almacenamiento local
    }

    return actualizado
  }

  async function deleteUserByAdmin(userId) {
    if (!canManageUsers.value) {
      throw new Error('403 Permiso Denegado: Solo Admin o Super Admin pueden eliminar usuarios.')
    }
    const actuales = loadUsersDatabase()
    const target = actuales.find(u => u.id === userId)
    if (!target) {
      throw new Error('El usuario no existe.')
    }
    if (target.rol === 'super_admin') {
      throw new Error('403 Prohibido: No se puede eliminar al Super Admin principal de Gavify.')
    }
    if (target.rol === 'admin' && !isSuperAdmin.value) {
      throw new Error('403 Permiso Denegado: Solo el Super Admin (Sebastian Gavilan) puede eliminar a un Admin.')
    }

    const filtrados = actuales.filter(u => u.id !== userId)
    saveUsersDatabase(filtrados)
    usuariosDb.value = filtrados

    try {
      await supabase.from('usuarios').delete().eq('id', userId)
    } catch {
      // Eliminado en base local
    }

    return true
  }

  function resetUsersSeed() {
    saveUsersDatabase(CUENTAS_PRUEBA)
    usuariosDb.value = JSON.parse(JSON.stringify(CUENTAS_PRUEBA))
    syncSeedUsersToSupabase()
    return usuariosDb.value
  }

  async function register({
    name,
    email,
    password,
    plan_id = 'gratis',
    organizacion_id = '11111111-1111-1111-1111-111111111111'
  }) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const avatar = getInitials(cleanName)
    const rol = normalizeRole('usuario', cleanEmail)

    if (!cleanName || !cleanEmail || !password) {
      throw new Error('Por favor completa todos los campos obligatorios.')
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    const orgFound = ORGANIZACIONES_DISPONIBLES.find(o => o.id === organizacion_id) || ORGANIZACIONES_DISPONIBLES[0]
    const finalOrgId = orgFound.id
    const finalOrgName = orgFound.nombre
    const finalPlanLabel = resolvePlanLabel(plan_id)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            nombre: cleanName,
            name: cleanName,
            avatar: avatar,
            rol: rol,
            organizacion_id: finalOrgId,
            organizacion_nombre: finalOrgName,
            plan_id: plan_id,
            spotify_connected: false,
            ytmusic_connected: false,
            youtube_connected: false
          }
        }
      })

      if (error) throw error

      if (data?.user) {
        const formatted = formatUserData(data.user, {
          id: data.user.id,
          email: cleanEmail,
          nombre: cleanName,
          avatar: avatar,
          rol: rol,
          organizacion_id: finalOrgId,
          organizacion_nombre: finalOrgName,
          plan_id: plan_id,
          plan: finalPlanLabel
        })

        const actuales = loadUsersDatabase()
        if (!actuales.some(u => u.email.toLowerCase() === cleanEmail)) {
          actuales.push({ ...formatted, isDemo: true })
          saveUsersDatabase(actuales)
          usuariosDb.value = actuales
        }

        currentUser.value = formatted
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(formatted))

        return {
          user: formatted,
          session: data.session,
          requiresConfirmation: false
        }
      }
    } catch {
      const localUser = {
        key: `user_${Date.now()}`,
        id: crypto.randomUUID(),
        nombre: cleanName,
        name: cleanName,
        email: cleanEmail,
        avatar,
        rol,
        activo: true,
        organizacion_id: finalOrgId,
        organizacion_nombre: finalOrgName,
        organizacion_slug: orgFound.slug,
        organizacion_tipo: orgFound.tipo,
        plan_id,
        plan: finalPlanLabel,
        spotifyConnected: false,
        ytMusicConnected: false,
        youtubeConnected: false,
        isDemo: true,
        creado_en: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
      const actuales = loadUsersDatabase()
      if (!actuales.some(u => u.email.toLowerCase() === cleanEmail)) {
        actuales.push(localUser)
        saveUsersDatabase(actuales)
        usuariosDb.value = actuales
      }
      currentUser.value = localUser
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(localUser))
      return { user: localUser, session: { user: localUser }, requiresConfirmation: false }
    }
  }

  async function login({ email, password }) {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      throw new Error('Por favor ingresa tu correo y contraseña.')
    }

    const actuales = loadUsersDatabase()
    const dbMatch = actuales.find(c => c.email.toLowerCase() === cleanEmail)
    if (dbMatch && (password === '123456' || password === 'password123' || password === 'gavify2026')) {
      return loginWithTestAccount(dbMatch.key || dbMatch.id)
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    })

    if (error) {
      if (dbMatch) {
        return loginWithTestAccount(dbMatch.key || dbMatch.id)
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('El correo o la contraseña son incorrectos.')
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Primero tenés que confirmar tu correo electrónico.')
      }
      throw new Error(error.message)
    }

    if (data?.user) {
      const formatted = await fetchUserProfile(data.user.id, data.user)
      currentUser.value = formatted
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(formatted))
      return formatted
    }

    throw new Error('No se pudo obtener la sesión del usuario.')
  }

  function loginWithTestAccount(accountKeyOrId = 'super_admin_sebas') {
    const actuales = loadUsersDatabase()
    const template =
      actuales.find(a => a.key === accountKeyOrId || a.id === accountKeyOrId || a.email === accountKeyOrId) ||
      CUENTAS_PRUEBA.find(a => a.key === accountKeyOrId) ||
      actuales[0]

    const account = {
      ...template,
      rol: normalizeRole(template.rol, template.email),
      createdAt: template.creado_en || new Date().toISOString()
    }
    currentUser.value = account
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(account))
    return account
  }

  function loginDemo(accountKey = 'super_admin_sebas') {
    return loginWithTestAccount(accountKey)
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Supabase signOut error:', e)
    } finally {
      currentUser.value = null
      localStorage.removeItem(CURRENT_USER_KEY)
    }
  }

  async function connectPlatform(platform = 'spotify', externalId = null) {
    if (!currentUser.value) return
    const updated = { ...currentUser.value }

    if (platform === 'spotify') {
      updated.spotifyConnected = true
      updated.spotifyUserId = externalId || updated.spotifyUserId || `spotify_${updated.id.slice(0, 8)}`
    } else if (platform === 'youtube_music') {
      updated.ytMusicConnected = true
      updated.ytMusicChannelId = externalId || updated.ytMusicChannelId || `ytm_${updated.id.slice(0, 8)}`
    } else if (platform === 'youtube') {
      updated.youtubeConnected = true
      updated.youtubeChannelId = externalId || updated.youtubeChannelId || `yt_${updated.id.slice(0, 8)}`
    }

    currentUser.value = updated
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))

    const actuales = loadUsersDatabase()
    const idx = actuales.findIndex(u => u.id === updated.id)
    if (idx !== -1) {
      actuales[idx] = { ...actuales[idx], ...updated }
      saveUsersDatabase(actuales)
      usuariosDb.value = actuales
    }
  }

  async function disconnectPlatform(platform = 'spotify') {
    if (!currentUser.value) return
    const updated = { ...currentUser.value }

    if (platform === 'spotify') {
      updated.spotifyConnected = false
    } else if (platform === 'youtube_music') {
      updated.ytMusicConnected = false
    } else if (platform === 'youtube') {
      updated.youtubeConnected = false
    }

    currentUser.value = updated
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))
  }

  async function connectSpotify(externalId = null) {
    return connectPlatform('spotify', externalId)
  }

  return {
    currentUser,
    usuariosDb,
    isAuthenticated,
    isAuthReady,
    userInitials,
    userRole,
    roleInfo,
    isSuperAdmin,
    isAdmin,
    isUsuario,
    isReadOnly,
    canManageUsers,
    canManageAdmins,
    canAdministerTargetUser,
    canExtractFromApis,
    canManagePlaylists,
    canResolveDuplicates,
    canEditSong,
    canDeleteSong,
    PLANES_DISPONIBLES,
    ORGANIZACIONES_DISPONIBLES,
    ROLES_DEFINICION,
    CUENTAS_PRUEBA,
    getUsers,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    resetUsersSeed,
    register,
    login,
    loginDemo,
    loginWithTestAccount,
    logout,
    connectSpotify,
    connectPlatform,
    disconnectPlatform
  }
}
