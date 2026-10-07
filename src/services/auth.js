import { ref, computed } from 'vue'
import { supabase } from '@/supabase'

const CURRENT_USER_KEY = 'gavify_current_user'

function getInitials(name = '') {
  if (!name) return 'GV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
  const plan = dbProfile?.plan || sbUser?.user_metadata?.plan || 'Gavify Pro'
  const spotifyConnected =
    dbProfile?.spotify_connected ??
    dbProfile?.spotify_conected ??
    sbUser?.user_metadata?.spotify_connected ??
    false
  const createdAt = dbProfile?.created_at || sbUser?.created_at

  return {
    id,
    email,
    name: nombre,
    nombre,
    avatar,
    plan,
    spotifyConnected,
    createdAt,
    rawUser: sbUser
  }
}

function getStoredCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
    return null
  } catch (e) {
    console.error('Error reading current user:', e)
    return null
  }
}

// Reactive state
const currentUser = ref(getStoredCurrentUser())
const isAuthReady = ref(false)

// Fetch user profile from public.usuarios table
async function fetchUserProfile(userId, sbUser) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      return formatUserData(sbUser, data)
    }
  } catch (e) {
    console.warn('Could not fetch from usuarios table, using auth metadata:', e)
  }
  return formatUserData(sbUser)
}

// Initialize Supabase Auth Session
export async function initAuth() {
  try {
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

  // Listen to auth state changes
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

  async function register({ name, email, password }) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const avatar = getInitials(cleanName)

    if (!cleanName || !cleanEmail || !password) {
      throw new Error('Por favor completa todos los campos requeridos.')
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          nombre: cleanName,
          name: cleanName,
          avatar: avatar,
          plan: 'Gavify Pro',
          spotify_connected: false
        }
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    if (data?.user) {
      // Try inserting into public.usuarios table directly if trigger is not present
      try {
        await supabase.from('usuarios').upsert({
          id: data.user.id,
          email: cleanEmail,
          nombre: cleanName,
          avatar: avatar,
          plan: 'Gavify Pro',
          spotify_connected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } catch (dbErr) {
        console.warn('DB insert skipped or handled by trigger:', dbErr)
      }

      const formatted = formatUserData(data.user, {
        id: data.user.id,
        email: cleanEmail,
        nombre: cleanName,
        avatar: avatar,
        plan: 'Gavify Pro',
        spotify_connected: false
      })

      if (data.session) {
        currentUser.value = formatted
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(formatted))
      }

      return {
        user: formatted,
        session: data.session,
        requiresConfirmation: !data.session
      }
    }

    return { requiresConfirmation: true }
  }

  async function login({ email, password }) {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      throw new Error('Por favor ingresa tu correo y contraseña.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    })

    if (error) {
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

  function loginDemo() {
    const demo = {
      id: 'usr_demo_1',
      name: 'Lucía M.',
      nombre: 'Lucía M.',
      email: 'lucia@gavify.com',
      avatar: 'LM',
      createdAt: new Date().toISOString(),
      spotifyConnected: true,
      plan: 'Gavify Pro',
      isDemo: true
    }
    currentUser.value = demo
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(demo))
    return demo
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

  async function connectSpotify() {
    if (!currentUser.value) return
    const updated = {
      ...currentUser.value,
      spotifyConnected: true
    }
    currentUser.value = updated
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))

    // Update in database and auth metadata if logged in with Supabase
    try {
      if (!currentUser.value.isDemo && currentUser.value.id) {
        await supabase.from('usuarios').update({
          spotify_connected: true,
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.value.id)

        await supabase.auth.updateUser({
          data: {
            spotify_connected: true
          }
        })
      }
    } catch (e) {
      console.warn('Could not update spotify state in DB:', e)
    }
  }

  return {
    currentUser,
    isAuthenticated,
    isAuthReady,
    userInitials,
    register,
    login,
    loginDemo,
    logout,
    connectSpotify
  }
}
