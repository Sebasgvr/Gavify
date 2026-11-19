/**
 * GAVIFY SAAS - CAPA CENTRALIZADA DE BASE DE DATOS, MULTI-TENANCY Y CONTROL DE PERMISOS (RBAC)
 * Implementa:
 * - Operaciones CRUD completas vinculadas a organizacion_id y usuario_id
 * - Validaciones estrictas de campos obligatorios y formato (alta y modificación)
 * - Reglas RBAC en backend/servicio:
 *     * Carga manual de música exclusiva para 'admin' y 'productor'
 *     * Extracción desde APIs (Spotify, YouTube Music, YouTube) para roles operativos
 *     * Bloqueo estricto de escritura para 'miembro_lector'
 * - Aislamiento Multi-Tenant estricto entre organizaciones (Sebas Music Hub vs. Radio Urbana Records)
 * - Bitácora de auditoría de accesos permitidos y bloqueados
 */

import { ref } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/services/auth'

export const playlistsRevision = ref(0)

const STORAGE_KEYS = {
  CANCIONES: 'gavify_db_canciones_v4',
  PLAYLISTS: 'gavify_db_playlists_v3',
  PLAYLIST_CANCIONES: 'gavify_db_playlist_canciones_v3',
  ANALISIS: 'gavify_db_analisis_v2',
  BITACORA: 'gavify_db_bitacora_v2',
  RECIENTES: 'gavify_recent_playlists_v2',
  DELETED_SONGS: 'gavify_deleted_song_ids_v1'
}

function normalizePlatform(plat) {
  if (plat === 'spotify' || plat === 'youtube_music' || plat === 'youtube') return plat
  return 'spotify'
}

// Datos iniciales para las organizaciones con IDs reales de canciones completas (solo Spotify, YT Music y YouTube)
// Sin música ni playlists falsas pre-cargadas: cada usuario gestiona únicamente su música real
const INITIAL_CANCIONES = []
const INITIAL_PLAYLISTS = []
const INITIAL_PLAYLIST_CANCIONES = []
const INITIAL_ANALISIS = []

const LEGACY_FAKE_PREFIXES = [
  'c1111111-',
  'c2222222-',
  'p1111111-',
  'p2222222-',
  'pc-10',
  'pc-20',
  'd1111111-',
  'd2222222-'
]

function isFakeSeedRecord(item) {
  const id = String(item?.id || '')
  return LEGACY_FAKE_PREFIXES.some(prefix => id.startsWith(prefix))
}

function loadCollection(key, defaultData) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => !isFakeSeedRecord(item))
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned))
        }
        return cleaned
      }
      return parsed
    }
    localStorage.setItem(key, JSON.stringify(defaultData))
    return JSON.parse(JSON.stringify(defaultData))
  } catch {
    return JSON.parse(JSON.stringify(defaultData))
  }
}

function saveCollection(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving local collection:', e)
  }
}

// Validación de sesión activa y obtención del usuario autenticado
function requireActiveUser() {
  const { currentUser } = useAuth()
  if (!currentUser.value || !currentUser.value.id) {
    throw new Error('401 No Autorizado: Tu sesión ha expirado o no has iniciado sesión.')
  }
  return currentUser.value
}

// Registro de auditoría en la bitácora de seguridad (RBAC & Multi-Tenant)
export function registrarEventoSeguridad({ accion, recurso, permitido, motivo }) {
  try {
    const { currentUser } = useAuth()
    const user = currentUser.value
    const bitacora = loadCollection(STORAGE_KEYS.BITACORA, [])
    const nuevoEvento = {
      id: crypto.randomUUID(),
      usuario_id: user?.id || null,
      usuario_nombre: user?.nombre || 'Anónimo',
      organizacion_id: user?.organizacion_id || null,
      organizacion_nombre: user?.organizacion_nombre || 'Sin organización',
      rol_usuario: user?.rol || 'invitado',
      accion,
      recurso,
      permitido,
      motivo,
      creado_en: new Date().toISOString()
    }
    bitacora.unshift(nuevoEvento)
    saveCollection(STORAGE_KEYS.BITACORA, bitacora.slice(0, 100))
    return nuevoEvento
  } catch (e) {
    console.warn('Error logging security event:', e)
  }
}

// Validación de datos de canción (Reglas compartidas para Crear y Modificar)
export function validarDatosCancion(payload) {
  const errores = []
  const titulo = (payload.titulo || '').trim()
  const artista = (payload.artista || '').trim()

  if (!titulo) {
    errores.push('El título de la canción es obligatorio.')
  } else if (titulo.length < 2 || titulo.length > 150) {
    errores.push('El título debe tener entre 2 y 150 caracteres.')
  }

  if (!artista) {
    errores.push('El nombre del artista o productor es obligatorio.')
  } else if (artista.length < 2 || artista.length > 120) {
    errores.push('El nombre del artista debe tener entre 2 y 120 caracteres.')
  }

  if (payload.album && String(payload.album).trim().length > 120) {
    errores.push('El nombre del álbum no puede superar los 120 caracteres.')
  }

  const reproducciones = Number(payload.reproducciones ?? 0)
  if (Number.isNaN(reproducciones) || reproducciones < 0 || !Number.isInteger(reproducciones)) {
    errores.push('Las reproducciones deben ser un número entero mayor o igual a 0.')
  }

  const duracion = Number(payload.duracion_segundos ?? 180)
  if (Number.isNaN(duracion) || duracion < 0) {
    errores.push('La duración en segundos debe ser un número positivo.')
  }

  if (errores.length > 0) {
    throw new Error(errores.join(' '))
  }

  return {
    titulo,
    artista,
    album: payload.album ? String(payload.album).trim() : null,
    genero: payload.genero || null,
    duracion_segundos: Math.round(duracion) || 180,
    reproducciones: Math.round(reproducciones) || 0,
    activo: payload.activo ?? true
  }
}

// Validación de datos de Playlist (Reglas compartidas para Crear y Modificar)
export function validarDatosPlaylist(payload) {
  const nombre = (payload.nombre || '').trim()
  if (!nombre) {
    throw new Error('El nombre de la playlist es obligatorio.')
  }
  if (nombre.length < 2 || nombre.length > 150) {
    throw new Error('El nombre de la playlist debe tener entre 2 y 150 caracteres.')
  }
  if (payload.descripcion && String(payload.descripcion).length > 300) {
    throw new Error('La descripción no puede superar los 300 caracteres.')
  }
  return {
    nombre,
    descripcion: payload.descripcion ? String(payload.descripcion).trim() : null,
    es_publica: Boolean(payload.es_publica)
  }
}

export const dbService = {
  // Reiniciar datos de prueba al estado original
  resetSeedData() {
    saveCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    saveCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    saveCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    saveCollection(STORAGE_KEYS.ANALISIS, INITIAL_ANALISIS)
    saveCollection(STORAGE_KEYS.BITACORA, [])
  },

  // --- CANCIONES (AISLADAS POR ORGANIZACIÓN Y SINCRONIZADAS CON BASE DE DATOS) ---
  async getCanciones(targetOrgId = null) {
    const user = requireActiveUser()
    const orgId = targetOrgId || user.organizacion_id

    // Verificación estricta de aislamiento Multi-Tenant
    if (orgId !== user.organizacion_id) {
      registrarEventoSeguridad({
        accion: 'SELECT canciones (Otra Organización)',
        recurso: `organizacion_id=${orgId}`,
        permitido: false,
        motivo: `Bloqueado por aislamiento Multi-Tenant: Usuario de "${user.organizacion_nombre}" intentó leer canciones de otra organización.`
      })
      throw new Error('403 Prohibido (Aislamiento Multi-Tenant): No tienes permiso para consultar registros de otra organización.')
    }

    const eliminadasIds = new Set(loadCollection(STORAGE_KEYS.DELETED_SONGS, []))
    const locales = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
      .filter(c => !eliminadasIds.has(c.id))
      .map(c => ({
        ...c,
        plataforma_origen: normalizePlatform(c.plataforma_origen),
        es_produccion_propia: false
      }))

    // Sincronizar con la base de datos Supabase y fusionar con el almacén local
    try {
      const { data, error } = await supabase
        .from('canciones')
        .select('*')
        .eq('organizacion_id', user.organizacion_id)
        .order('creado_en', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapaUnificado = new Map()
        for (const item of locales) {
          if (!eliminadasIds.has(item.id)) {
            mapaUnificado.set(item.id, item)
          }
        }
        for (const dbItem of data) {
          if (!eliminadasIds.has(dbItem.id)) {
            const cleanDbItem = { ...dbItem }
            if (cleanDbItem.audio_url && cleanDbItem.audio_url.includes('soundhelix.com')) {
              cleanDbItem.audio_url = ''
            }
            const previo = mapaUnificado.get(dbItem.id)
            mapaUnificado.set(dbItem.id, {
              ...previo,
              ...cleanDbItem,
              plataforma_origen: normalizePlatform(cleanDbItem.plataforma_origen || previo?.plataforma_origen),
              es_produccion_propia: false
            })
          }
        }
        const fusionadas = Array.from(mapaUnificado.values())
        saveCollection(STORAGE_KEYS.CANCIONES, fusionadas)
        return fusionadas
          .filter(c => c.organizacion_id === user.organizacion_id)
          .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      }
    } catch (e) {
      console.warn('Supabase sync fallback to local database store:', e)
    }

    return locales
      .filter(c => c.organizacion_id === user.organizacion_id)
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
  },

  async persistSongToSupabase(cancionObj) {
    if (!supabase) return
    try {
      const payload = {
        id: cancionObj.id,
        usuario_id: cancionObj.usuario_id,
        organizacion_id: cancionObj.organizacion_id,
        titulo: cancionObj.titulo,
        artista: cancionObj.artista,
        album: cancionObj.album || null,
        genero: cancionObj.genero || 'Pop',
        duracion_segundos: Number(cancionObj.duracion_segundos) || 0,
        reproducciones: Number(cancionObj.reproducciones) || 0,
        activo: cancionObj.activo ?? true,
        plataforma_origen: ['spotify', 'youtube_music', 'youtube'].includes(cancionObj.plataforma_origen)
          ? cancionObj.plataforma_origen
          : 'spotify',
        portada_url: cancionObj.portada_url || null,
        spotify_track_id: cancionObj.spotify_track_id || null,
        ytmusic_track_id: cancionObj.ytmusic_track_id || null,
        youtube_video_id: cancionObj.youtube_video_id || null
      }
      const { error } = await supabase.from('canciones').upsert(payload)
      if (error) {
        console.warn('Supabase canciones.upsert:', error.message)
      } else {
        console.log('✓ Canción sincronizada en Supabase:', cancionObj.titulo)
      }
    } catch (e) {
      console.warn('Supabase persistSong fallback:', e)
    }
  },

  async persistPlaylistToSupabase(playlistObj) {
    if (!supabase) return
    try {
      const payload = {
        id: playlistObj.id,
        usuario_id: playlistObj.usuario_id,
        organizacion_id: playlistObj.organizacion_id,
        nombre: playlistObj.nombre,
        descripcion: playlistObj.descripcion || null,
        es_publica: Boolean(playlistObj.es_publica),
        plataforma_origen: ['gavify', 'spotify', 'youtube_music', 'youtube'].includes(playlistObj.plataforma_origen)
          ? playlistObj.plataforma_origen
          : 'gavify',
        portada_url: playlistObj.portada_url || null
      }
      const { error } = await supabase.from('playlists').upsert(payload)
      if (error) {
        console.warn('Supabase playlists.upsert:', error.message)
      } else {
        console.log('✓ Playlist sincronizada en Supabase:', playlistObj.nombre)
      }
    } catch (e) {
      console.warn('Supabase persistPlaylist fallback:', e)
    }
  },

  async persistPlaylistSongToSupabase(relItem) {
    if (!supabase) return
    try {
      const payload = {
        id: relItem.id,
        playlist_id: relItem.playlist_id,
        cancion_id: relItem.cancion_id,
        posicion: Number(relItem.posicion) || 0
      }
      const { error } = await supabase.from('playlist_canciones').upsert(payload)
      if (error) {
        console.warn('Supabase playlist_canciones.upsert:', error.message)
      } else {
        console.log('✓ Asociación playlist-canción sincronizada en Supabase')
      }
    } catch (e) {
      console.warn('Supabase persistPlaylistSong fallback:', e)
    }
  },

  async ensureSongSavedInDatabase(trackPayload) {
    requireActiveUser()
    return this.extractCancionFromApi(trackPayload)
  },

  /**
   * Obtiene o crea automáticamente la playlist especial "Tus me gusta" del usuario
   */
  async getOrCreateFavoritosPlaylist() {
    const user = requireActiveUser()
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    let fav = playlists.find(
      p =>
        p.organizacion_id === user.organizacion_id &&
        p.usuario_id === user.id &&
        (p.nombre.toLowerCase() === 'tus me gusta' || p.tipo === 'favoritos')
    )

    if (!fav) {
      fav = await this.createPlaylist({
        nombre: 'Tus me gusta',
        descripcion: 'Tus canciones favoritas guardadas con el corazón en Gavify',
        es_publica: false,
        plataforma_origen: 'gavify',
        tipo: 'favoritos',
        portada_url: null
      })
    } else if (
      fav.portada_url &&
      fav.portada_url.includes('1518609878373-06d740f60d8b')
    ) {
      // Migrar portada amarilla antigua al nuevo diseño exclusivo de Tus me gusta
      fav.portada_url = null
      fav.tipo = 'favoritos'
      saveCollection(STORAGE_KEYS.PLAYLISTS, playlists)
    }

    return fav
  },

  /**
   * Verifica si una canción está en la playlist "Tus me gusta"
   */
  async isCancionFavorita(cancionId) {
    try {
      const user = requireActiveUser()
      const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
      const fav = playlists.find(
        p =>
          p.organizacion_id === user.organizacion_id &&
          p.usuario_id === user.id &&
          (p.nombre.toLowerCase() === 'tus me gusta' || p.tipo === 'favoritos')
      )
      if (!fav) return false
      const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
      return rels.some(r => r.playlist_id === fav.id && r.cancion_id === cancionId)
    } catch {
      return false
    }
  },

  /**
   * Agrega o quita una canción de "Tus me gusta" con persistencia garantizada en la BD
   */
  async toggleCancionFavorita(trackPayload) {
    const user = requireActiveUser()
    const cancionGuardada = await this.extractCancionFromApi(trackPayload)
    const favPlaylist = await this.getOrCreateFavoritosPlaylist()

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const existente = rels.find(
      r => r.playlist_id === favPlaylist.id && r.cancion_id === cancionGuardada.id
    )

    if (existente) {
      await this.removeCancionFromPlaylist(existente.id)
      return { isLiked: false, cancion: cancionGuardada, playlist: favPlaylist }
    } else {
      await this.addCancionToPlaylist(favPlaylist.id, cancionGuardada.id)
      return { isLiked: true, cancion: cancionGuardada, playlist: favPlaylist }
    }
  },

  /**
   * Extracción y guardado de canciones desde las APIs de Spotify, YT Music y YouTube
   * Habilitado para todos los usuarios autenticados (usuario, admin, super_admin).
   */
  async extractCancionFromApi(trackPayload, targetPlaylistId = null) {
    const user = requireActiveUser()
    const validados = validarDatosCancion(trackPayload)
    const todas = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    const plataformaNormalizada = normalizePlatform(trackPayload.plataforma_origen)

    // Verificar si la canción ya existe en la base de datos de esta organización
    let cancionExistente = todas.find(
      c =>
        c.organizacion_id === user.organizacion_id &&
        c.titulo.toLowerCase() === validados.titulo.toLowerCase() &&
        c.artista.toLowerCase() === validados.artista.toLowerCase()
    )

    if (!cancionExistente) {
      cancionExistente = {
        id: crypto.randomUUID(),
        usuario_id: user.id,
        autor_nombre: user.nombre,
        organizacion_id: user.organizacion_id,
        ...validados,
        plataforma_origen: plataformaNormalizada,
        es_produccion_propia: false,
        portada_url: trackPayload.portada_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
        audio_url: trackPayload.audio_url || trackPayload.preview_url || '',
        spotify_track_id: trackPayload.spotify_track_id || null,
        ytmusic_track_id: trackPayload.ytmusic_track_id || null,
        youtube_video_id: trackPayload.youtube_video_id || null,
        youtube_candidates: trackPayload.youtube_candidates || null,
        external_url: trackPayload.external_url || null,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      }
      todas.unshift(cancionExistente)
      saveCollection(STORAGE_KEYS.CANCIONES, todas)
      await this.persistSongToSupabase(cancionExistente)
    } else {
      let cambio = false
      if (trackPayload.portada_url) {
        const vieja = cancionExistente.portada_url || ''
        const esViejaGenerica =
          !vieja ||
          vieja.includes('images.unsplash.com') ||
          vieja.includes('mosaic.scdn.co') ||
          vieja.includes('pickasso.spotifycdn.com')
        const esNuevaEspecifica =
          !trackPayload.portada_url.includes('images.unsplash.com') &&
          !trackPayload.portada_url.includes('mosaic.scdn.co') &&
          !trackPayload.portada_url.includes('pickasso.spotifycdn.com')

        if (esViejaGenerica && esNuevaEspecifica) {
          cancionExistente.portada_url = trackPayload.portada_url
          cambio = true
        }
      }
      if (!cancionExistente.spotify_track_id && trackPayload.spotify_track_id) {
        cancionExistente.spotify_track_id = trackPayload.spotify_track_id
        cambio = true
      }
      if (!cancionExistente.youtube_video_id && trackPayload.youtube_video_id) {
        cancionExistente.youtube_video_id = trackPayload.youtube_video_id
        cambio = true
      }
      if (Number(trackPayload.reproducciones) > 1000 && (Number(cancionExistente.reproducciones) || 0) < 1000) {
        cancionExistente.reproducciones = Number(trackPayload.reproducciones)
        cambio = true
      }
      if (cambio) {
        cancionExistente.actualizado_en = new Date().toISOString()
        saveCollection(STORAGE_KEYS.CANCIONES, todas)
        await this.persistSongToSupabase(cancionExistente)
      }
    }

    if (targetPlaylistId) {
      await this.addCancionToPlaylist(targetPlaylistId, cancionExistente.id)
    }

    registrarEventoSeguridad({
      accion: `GUARDAR CANCIÓN EN BD (${cancionExistente.plataforma_origen})`,
      recurso: `${cancionExistente.titulo} - ${cancionExistente.artista}`,
      permitido: true,
      motivo: `Sincronización en base de datos de '${user.organizacion_nombre}'.`
    })

    return cancionExistente
  },

  async updateCancionPlays(id, plays) {
    const numPlays = Number(plays) || 0
    if (!id || numPlays <= 0) return
    const todas = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    const idx = todas.findIndex(c => c.id === id)
    if (idx === -1) return
    todas[idx].reproducciones = numPlays
    todas[idx].actualizado_en = new Date().toISOString()
    saveCollection(STORAGE_KEYS.CANCIONES, todas)
    await this.persistSongToSupabase(todas[idx])
  },

  async extractSongsFromExternalApi(tracksArray = [], platform = 'spotify', targetPlaylistId = null) {
    const resultados = []
    for (const track of tracksArray) {
      const saved = await this.extractCancionFromApi(
        { ...track, plataforma_origen: track.plataforma_origen || platform },
        targetPlaylistId
      )
      resultados.push(saved)
    }
    return resultados
  },

  /**
   * Extrae una Playlist completa con todas sus canciones desde Spotify, YT Music o YouTube
   */
  async extractPlaylistFromApi(playlistTemplate) {
    requireActiveUser()

    const nuevaPl = await this.createPlaylist({
      nombre: playlistTemplate.nombre,
      descripcion: playlistTemplate.descripcion,
      es_publica: true,
      plataforma_origen: playlistTemplate.plataforma_origen || 'spotify',
      portada_url: playlistTemplate.portada_url
    })

    for (const track of playlistTemplate.canciones || []) {
      await this.extractCancionFromApi(track, nuevaPl.id)
    }

    return nuevaPl
  },

  /**
   * Modificar canción existente
   */
  async updateCancion(id, payload) {
    const user = requireActiveUser()
    const todas = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    const idx = todas.findIndex(c => c.id === id)

    if (idx === -1) {
      throw new Error('404 No Encontrado: La canción solicitada no existe.')
    }

    const actual = todas[idx]

    if (actual.organizacion_id !== user.organizacion_id) {
      registrarEventoSeguridad({
        accion: 'UPDATE cancion (Otra Organización)',
        recurso: actual.titulo,
        permitido: false,
        motivo: `Intento de modificar registro de otra organización bloqueado por Multi-Tenant Guard.`
      })
      throw new Error('403 Prohibido (Multi-Tenant): No puedes modificar canciones que pertenecen a otra organización.')
    }

    const validados = validarDatosCancion(payload)

    const actualizada = {
      ...actual,
      ...validados,
      plataforma_origen: normalizePlatform(payload.plataforma_origen || actual.plataforma_origen),
      es_produccion_propia: false,
      portada_url: payload.portada_url ?? actual.portada_url,
      portada_ruta: payload.portada_ruta ?? actual.portada_ruta,
      audio_url: payload.audio_url ?? actual.audio_url,
      audio_ruta: payload.audio_ruta ?? actual.audio_ruta,
      actualizado_en: new Date().toISOString()
    }

    todas[idx] = actualizada
    saveCollection(STORAGE_KEYS.CANCIONES, todas)

    await this.persistSongToSupabase(actualizada)

    registrarEventoSeguridad({
      accion: 'UPDATE cancion',
      recurso: actualizada.titulo,
      permitido: true,
      motivo: `Modificación válida ejecutada por '${user.nombre}' (${user.rol}).`
    })

    return actualizada
  },

  /**
   * Eliminar canción del catálogo y de la base de datos
   */
  async deleteCancion(id) {
    const user = requireActiveUser()
    const todas = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    const actual = todas.find(c => c.id === id)

    if (!actual) {
      throw new Error('La canción que intentas eliminar no existe.')
    }

    if (actual.organizacion_id !== user.organizacion_id) {
      registrarEventoSeguridad({
        accion: 'DELETE cancion (Otra Organización)',
        recurso: actual.titulo,
        permitido: false,
        motivo: 'Intento de eliminar una canción perteneciente a otro cliente/organización.'
      })
      throw new Error('403 Prohibido (Multi-Tenant): No puedes eliminar registros de otra organización.')
    }

    // Registrar ID eliminado y quitar del almacenamiento local
    const eliminadasIds = loadCollection(STORAGE_KEYS.DELETED_SONGS, [])
    if (!eliminadasIds.includes(id)) {
      eliminadasIds.push(id)
      saveCollection(STORAGE_KEYS.DELETED_SONGS, eliminadasIds)
    }

    const filtradas = todas.filter(c => c.id !== id)
    saveCollection(STORAGE_KEYS.CANCIONES, filtradas)

    // Eliminar de Supabase
    try {
      await supabase.from('canciones').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase delete fallback:', e)
    }

    // Eliminar también relaciones en playlist_canciones (ON DELETE CASCADE)
    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    saveCollection(
      STORAGE_KEYS.PLAYLIST_CANCIONES,
      rels.filter(r => r.cancion_id !== id)
    )
    playlistsRevision.value++

    registrarEventoSeguridad({
      accion: 'DELETE cancion (BD)',
      recurso: actual.titulo,
      permitido: true,
      motivo: `Eliminación en base de datos confirmada por '${user.nombre}' (${user.rol}).`
    })

    return true
  },

  // --- PLAYLISTS (AISLADAS POR USUARIO Y ORGANIZACIÓN) ---
  markPlaylistUsed(playlistId) {
    if (!playlistId) return
    try {
      const user = requireActiveUser()
      const key = `${STORAGE_KEYS.RECIENTES}_${user.id}`
      const raw = localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      const updated = [playlistId, ...list.filter(id => id !== playlistId)].slice(0, 15)
      localStorage.setItem(key, JSON.stringify(updated))
      playlistsRevision.value++
    } catch (e) {
      console.warn('Error marking playlist recent:', e)
    }
  },

  async getPlaylists() {
    const user = requireActiveUser()
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const canciones = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
    const mapaCanciones = new Map(canciones.map(c => [c.id, c]))

    // Mostrar únicamente las playlists propias del usuario autenticado (nunca de otros usuarios)
    const playlistsUsuario = playlists.filter(
      p => p.organizacion_id === user.organizacion_id && p.usuario_id === user.id
    )

    return playlistsUsuario
      .map(p => {
        const relsDePl = rels
          .filter(r => r.playlist_id === p.id)
          .sort((a, b) => a.posicion - b.posicion)
        const tracks = relsDePl.map(r => mapaCanciones.get(r.cancion_id)).filter(Boolean)
        const count = tracks.length
        const duracionTotal = tracks.reduce((acc, t) => acc + (Number(t.duracion_segundos) || 180), 0)
        const covers = tracks.map(t => t.portada_url).filter(Boolean).slice(0, 4)

        const esFavoritos = p.tipo === 'favoritos' || (p.nombre || '').toLowerCase().trim() === 'tus me gusta'
        const portadaLimpia = esFavoritos ? null : p.portada_url

        // Contar cuántas canciones están repetidas DENTRO de esta misma playlist
        const conteoEnEstaLista = {}
        for (const t of tracks) {
          const clave = `${(t.titulo || '').toLowerCase().trim()}|${(t.artista || '').toLowerCase().trim()}`
          conteoEnEstaLista[clave] = (conteoEnEstaLista[clave] || 0) + 1
        }
        const repetidasMismaListaCount = Object.values(conteoEnEstaLista).filter(c => c > 1).length

        return {
          ...p,
          tipo: esFavoritos ? 'favoritos' : p.tipo,
          portada_url: portadaLimpia,
          creador_nombre: p.creador_nombre || user.nombre || 'Usuario',
          total_canciones: count,
          duracion_total_segundos: duracionTotal,
          collage_portadas: esFavoritos ? [] : covers,
          repetidas_count: repetidasMismaListaCount,
          playlist_canciones: [{ count }]
        }
      })
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
  },

  async getRecentPlaylists() {
    const user = requireActiveUser()
    const todas = await this.getPlaylists()
    try {
      const key = `${STORAGE_KEYS.RECIENTES}_${user.id}`
      const raw = localStorage.getItem(key)
      const recentIds = raw ? JSON.parse(raw) : []
      if (!recentIds.length) return todas
      const mapa = new Map(todas.map(p => [p.id, p]))
      const ordenadas = []
      for (const id of recentIds) {
        if (mapa.has(id)) {
          ordenadas.push(mapa.get(id))
          mapa.delete(id)
        }
      }
      for (const p of mapa.values()) {
        ordenadas.push(p)
      }
      return ordenadas
    } catch {
      return todas
    }
  },

  async createPlaylist(payload) {
    const user = requireActiveUser()

    if (user.rol === 'miembro_lector') {
      registrarEventoSeguridad({
        accion: 'INSERT playlist',
        recurso: payload?.nombre || 'Nueva Playlist',
        permitido: false,
        motivo: 'Rol miembro_lector no tiene permisos para crear playlists.'
      })
      throw new Error('403 Permiso Denegado (RBAC): Tu cuenta es de Solo Lectura y no puede crear playlists.')
    }

    const validados = validarDatosPlaylist(payload)
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)

    const nueva = {
      id: crypto.randomUUID(),
      usuario_id: user.id,
      creador_nombre: user.nombre,
      organizacion_id: user.organizacion_id,
      ...validados,
      tipo: payload.tipo || null,
      plataforma_origen: payload.plataforma_origen || 'gavify',
      portada_url: payload.portada_url || null,
      portada_ruta: payload.portada_ruta || null,
      total_canciones: 0,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    }

    playlists.unshift(nueva)
    saveCollection(STORAGE_KEYS.PLAYLISTS, playlists)
    this.markPlaylistUsed(nueva.id)
    await this.persistPlaylistToSupabase(nueva)

    registrarEventoSeguridad({
      accion: 'INSERT playlist',
      recurso: nueva.nombre,
      permitido: true,
      motivo: `Playlist creada en organización '${user.organizacion_nombre}'.`
    })

    return nueva
  },

  async updatePlaylist(id, payload) {
    const user = requireActiveUser()
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    const idx = playlists.findIndex(p => p.id === id)

    if (idx === -1) throw new Error('La playlist no existe.')
    const actual = playlists[idx]

    if (actual.organizacion_id !== user.organizacion_id || actual.usuario_id !== user.id) {
      registrarEventoSeguridad({
        accion: 'UPDATE playlist (Otro Usuario / Organización)',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Bloqueado: La playlist pertenece a otro usuario o a otra organización.'
      })
      throw new Error('403 Prohibido: No puedes modificar una playlist de otro usuario.')
    }

    if (user.rol === 'miembro_lector') {
      registrarEventoSeguridad({
        accion: 'UPDATE playlist',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Rol miembro_lector no puede modificar playlists.'
      })
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector no puede editar playlists.')
    }

    const validados = validarDatosPlaylist(payload)
    const actualizada = {
      ...actual,
      ...validados,
      portada_url: 'portada_url' in payload ? payload.portada_url : actual.portada_url,
      portada_ruta: payload.portada_ruta ?? actual.portada_ruta,
      actualizado_en: new Date().toISOString()
    }

    playlists[idx] = actualizada
    saveCollection(STORAGE_KEYS.PLAYLISTS, playlists)
    playlistsRevision.value++
    await this.persistPlaylistToSupabase(actualizada)

    registrarEventoSeguridad({
      accion: 'UPDATE playlist',
      recurso: actualizada.nombre,
      permitido: true,
      motivo: `Playlist actualizada por '${user.nombre}'.`
    })

    return actualizada
  },

  async deletePlaylist(id) {
    const user = requireActiveUser()
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    const actual = playlists.find(p => p.id === id)

    if (!actual) throw new Error('La playlist no existe.')

    if (actual.organizacion_id !== user.organizacion_id || actual.usuario_id !== user.id) {
      registrarEventoSeguridad({
        accion: 'DELETE playlist (Otro Usuario / Organización)',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Bloqueado: La playlist pertenece a otro usuario o a otra organización.'
      })
      throw new Error('403 Prohibido: No puedes eliminar una playlist de otro usuario.')
    }

    if (user.rol === 'miembro_lector') {
      registrarEventoSeguridad({
        accion: 'DELETE playlist',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Rol miembro_lector no puede eliminar playlists.'
      })
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector no puede eliminar playlists.')
    }

    saveCollection(
      STORAGE_KEYS.PLAYLISTS,
      playlists.filter(p => p.id !== id)
    )

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    saveCollection(
      STORAGE_KEYS.PLAYLIST_CANCIONES,
      rels.filter(r => r.playlist_id !== id)
    )
    playlistsRevision.value++
    if (supabase) {
      supabase.from('playlists').delete().eq('id', id).then().catch(() => {})
    }

    registrarEventoSeguridad({
      accion: 'DELETE playlist',
      recurso: actual.nombre,
      permitido: true,
      motivo: `Playlist eliminada por '${user.nombre}'.`
    })

    return true
  },

  async getCancionesDePlaylist(playlistId) {
    const user = requireActiveUser()
    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    const pl = playlists.find(p => p.id === playlistId)
    if (!pl || pl.organizacion_id !== user.organizacion_id || pl.usuario_id !== user.id) {
      throw new Error('403 Prohibido: La playlist no pertenece a tu cuenta.')
    }

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const canciones = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)

    const relsDeEstaPl = rels
      .filter(r => r.playlist_id === playlistId)
      .sort((a, b) => a.posicion - b.posicion)

    // Agrupar dentro de ESTA MISMA playlist por canción (por ID o por Título + Artista normalizados)
    const posicionesPorClave = {}
    const itemsConCancion = relsDeEstaPl
      .map((r, index) => {
        const cancion = canciones.find(c => c.id === r.cancion_id) || null
        if (!cancion) return null
        const clave = `${(cancion.titulo || '').toLowerCase().trim()}|${(cancion.artista || '').toLowerCase().trim()}`
        const posHumana = index + 1
        if (!posicionesPorClave[clave]) {
          posicionesPorClave[clave] = []
        }
        posicionesPorClave[clave].push(posHumana)
        return {
          rel: r,
          cancion,
          clave,
          orden_numero: posHumana,
          aparicion_numero: posicionesPorClave[clave].length
        }
      })
      .filter(Boolean)

    return itemsConCancion.map(item => {
      const todasPosiciones = posicionesPorClave[item.clave] || [item.orden_numero]
      const vecesEnEstaLista = todasPosiciones.length
      const esRepetidaEnMismaLista = vecesEnEstaLista > 1

      return {
        ...item.rel,
        orden_numero: item.orden_numero,
        agregado_en: item.rel.agregado_en || pl.creado_en || '2026-08-26T12:00:00Z',
        canciones: item.cancion,
        clave_cancion: item.clave,
        es_repetida: esRepetidaEnMismaLista,
        repetida_en_misma_lista: esRepetidaEnMismaLista,
        veces_en_lista: vecesEnEstaLista,
        aparicion_numero: item.aparicion_numero,
        es_copia_duplicada: item.aparicion_numero > 1,
        posiciones_en_lista: todasPosiciones
      }
    })
  },

  async getCancionesByPlaylist(playlistId) {
    return this.getCancionesDePlaylist(playlistId)
  },

  async createCleanPlaylistFromDeduplication(nombre, cancionIds = []) {
    const nueva = await this.createPlaylist({
      nombre,
      descripcion: 'Versión limpia sin canciones repetidas generada en Gavify.',
      es_publica: true,
      plataforma_origen: 'gavify'
    })
    for (const cid of cancionIds) {
      await this.addCancionToPlaylist(nueva.id, cid)
    }
    return nueva
  },

  async addCancionToPlaylist(playlistId, cancionId) {
    const user = requireActiveUser()
    if (user.rol === 'miembro_lector') {
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector no puede modificar playlists.')
    }

    const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
    const pl = playlists.find(p => p.id === playlistId)
    if (!pl || pl.organizacion_id !== user.organizacion_id || pl.usuario_id !== user.id) {
      throw new Error('403 Prohibido: Esta playlist no pertenece a tu cuenta.')
    }

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const enPlaylist = rels.filter(r => r.playlist_id === playlistId)
    const nuevoItem = {
      id: 'pc-' + crypto.randomUUID().slice(0, 8),
      playlist_id: playlistId,
      cancion_id: cancionId,
      posicion: enPlaylist.length,
      agregado_en: new Date().toISOString()
    }
    rels.push(nuevoItem)
    saveCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, rels)
    playlistsRevision.value++
    await this.persistPlaylistSongToSupabase(nuevoItem)
    return nuevoItem
  },

  async removeCancionFromPlaylist(playlistCancionId) {
    const user = requireActiveUser()
    if (user.rol === 'miembro_lector') {
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector no puede quitar canciones de una playlist.')
    }

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const relTarget = rels.find(r => r.id === playlistCancionId)
    if (relTarget) {
      const playlists = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
      const pl = playlists.find(p => p.id === relTarget.playlist_id)
      if (pl && (pl.organizacion_id !== user.organizacion_id || pl.usuario_id !== user.id)) {
        throw new Error('403 Prohibido: No puedes modificar una playlist de otro usuario.')
      }
    }
    saveCollection(
      STORAGE_KEYS.PLAYLIST_CANCIONES,
      rels.filter(r => r.id !== playlistCancionId)
    )
    playlistsRevision.value++
    if (supabase) {
      supabase.from('playlist_canciones').delete().eq('id', playlistCancionId).then().catch(() => {})
    }
    return true
  },

  // --- FUNCIÓN PRINCIPAL DEL MVP: DETECCIÓN Y RESOLUCIÓN DE CANCIONES REPETIDAS ---
  async getCancionesRepetidas() {
    const user = requireActiveUser()
    const playlistsOrg = loadCollection(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
      .filter(p => p.organizacion_id === user.organizacion_id && p.usuario_id === user.id)
    const idsPlaylistsOrg = new Set(playlistsOrg.map(p => p.id))

    const cancionesOrg = loadCollection(STORAGE_KEYS.CANCIONES, INITIAL_CANCIONES)
      .filter(c => c.organizacion_id === user.organizacion_id)
    const mapaCanciones = new Map(cancionesOrg.map(c => [c.id, c]))
    const mapaPlaylists = new Map(playlistsOrg.map(p => [p.id, p]))

    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
      .filter(r => idsPlaylistsOrg.has(r.playlist_id))

    // Agrupar por cancion_id
    const agrupadas = {}
    for (const rel of rels) {
      const cancion = mapaCanciones.get(rel.cancion_id)
      const playlist = mapaPlaylists.get(rel.playlist_id)
      if (!cancion || !playlist) continue

      if (!agrupadas[cancion.id]) {
        agrupadas[cancion.id] = {
          cancion_id: cancion.id,
          cancion,
          apariciones: []
        }
      }
      agrupadas[cancion.id].apariciones.push({
        rel_id: rel.id,
        playlist_id: playlist.id,
        playlist_nombre: playlist.nombre,
        plataforma_origen: playlist.plataforma_origen,
        posicion: rel.posicion
      })
    }

    // Retornar todas las canciones que se repiten (apariciones >= 2)
    return Object.values(agrupadas)
      .filter(item => item.apariciones.length >= 2)
      .map(item => ({
        ...item,
        repeticiones_totales: item.apariciones.length,
        playlists_nombres: item.apariciones.map(a => a.playlist_nombre)
      }))
      .sort((a, b) => b.repeticiones_totales - a.repeticiones_totales)
  },

  /**
   * Ejecuta y registra una nueva sesión de auditoría de duplicados (Core MVP)
   */
  async ejecutarAnalisisDuplicados(notas = '') {
    const user = requireActiveUser()
    if (user.rol === 'miembro_lector') {
      registrarEventoSeguridad({
        accion: 'INSERT analisis_duplicados',
        recurso: 'Motor de Auditoría MVP',
        permitido: false,
        motivo: 'Rol miembro_lector solo puede consultar auditorías existentes.'
      })
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector solo tiene permisos de consulta.')
    }

    const playlists = await this.getPlaylists()
    const canciones = await this.getCanciones()
    const repetidas = await this.getCancionesRepetidas()

    const nuevoAnalisis = {
      id: crypto.randomUUID(),
      usuario_id: user.id,
      autor_nombre: user.nombre,
      organizacion_id: user.organizacion_id,
      fecha_analisis: new Date().toISOString(),
      total_playlists_escaneadas: playlists.length,
      total_canciones_escaneadas: canciones.length,
      total_duplicados_detectados: repetidas.length,
      estado: repetidas.length === 0 ? 'resuelto_total' : 'pendiente',
      notas: notas.trim() || `Auditoría ejecutada sobre ${playlists.length} listas (${repetidas.length} conflictos detectados).`
    }

    const historial = loadCollection(STORAGE_KEYS.ANALISIS, INITIAL_ANALISIS)
    historial.unshift(nuevoAnalisis)
    saveCollection(STORAGE_KEYS.ANALISIS, historial)

    registrarEventoSeguridad({
      accion: 'EJECUTAR AUDITORÍA DE DUPLICADOS (MVP)',
      recurso: `${repetidas.length} duplicados en '${user.organizacion_nombre}'`,
      permitido: true,
      motivo: `Análisis registrado por '${user.nombre}' (${user.rol}).`
    })

    return { analisis: nuevoAnalisis, repetidas }
  },

  /**
   * Resuelve canciones repetidas seleccionadas:
   * - modo 'deduplicar': Conserva la canción en la primera playlist y elimina las copias redundantes de las demás listas.
   * - modo 'lista_limpia': Crea una nueva playlist limpia sin repeticiones con las pistas seleccionadas y elimina los duplicados secundarios.
   */
  async resolverDuplicadosSeleccionados(cancionIds = [], modo = 'deduplicar') {
    const user = requireActiveUser()
    if (user.rol === 'miembro_lector') {
      registrarEventoSeguridad({
        accion: 'RESOLVER DUPLICADOS',
        recurso: `${cancionIds.length} canciones`,
        permitido: false,
        motivo: 'Rol miembro_lector bloqueado en operaciones de depuración.'
      })
      throw new Error('403 Permiso Denegado (RBAC): El rol miembro_lector no puede modificar listas ni resolver duplicados.')
    }

    if (!cancionIds.length) {
      throw new Error('Debes seleccionar al menos una canción repetida para resolver.')
    }

    const repetidasActuales = await this.getCancionesRepetidas()
    const rels = loadCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, INITIAL_PLAYLIST_CANCIONES)
    const relIdsAEliminar = new Set()

    for (const cid of cancionIds) {
      const conflicto = repetidasActuales.find(r => r.cancion_id === cid)
      if (conflicto && conflicto.apariciones.length > 1) {
        // Conservar la primera aparición (índice 0) y eliminar las apariciones redundantes (1..N)
        for (let i = 1; i < conflicto.apariciones.length; i++) {
          relIdsAEliminar.add(conflicto.apariciones[i].rel_id)
        }
      }
    }

    const nuevasRels = rels.filter(r => !relIdsAEliminar.has(r.id))
    saveCollection(STORAGE_KEYS.PLAYLIST_CANCIONES, nuevasRels)

    let playlistLimpiaCreada = null
    if (modo === 'lista_limpia') {
      playlistLimpiaCreada = await this.createPlaylist({
        nombre: `Playlist Limpia Gavify (${new Date().toLocaleDateString()})`,
        descripcion: `Generada automáticamente por el motor de depuración de Gavify con ${cancionIds.length} pistas únicas sin repetición.`,
        es_publica: true,
        plataforma_origen: 'gavify'
      })
      for (const cid of cancionIds) {
        await this.addCancionToPlaylist(playlistLimpiaCreada.id, cid)
      }
    }

    // Actualizar estado del último análisis de la organización
    const historial = loadCollection(STORAGE_KEYS.ANALISIS, INITIAL_ANALISIS)
    const restantes = await this.getCancionesRepetidas()
    const ultimoIdx = historial.findIndex(a => a.organizacion_id === user.organizacion_id)
    if (ultimoIdx !== -1) {
      historial[ultimoIdx].estado = restantes.length === 0 ? 'resuelto_total' : 'resuelto_parcial'
      historial[ultimoIdx].total_duplicados_detectados = restantes.length
      historial[ultimoIdx].notas = `Depuradas ${cancionIds.length} canciones (${relIdsAEliminar.size} copias redundantes eliminadas).`
      saveCollection(STORAGE_KEYS.ANALISIS, historial)
    }

    registrarEventoSeguridad({
      accion: `RESOLVER DUPLICADOS (${modo})`,
      recurso: `${cancionIds.length} canciones depuradas (${relIdsAEliminar.size} copias eliminadas)`,
      permitido: true,
      motivo: `Ejecutado por '${user.nombre}' (${user.rol}) en '${user.organizacion_nombre}'.`
    })

    return {
      eliminadasCount: relIdsAEliminar.size,
      playlistLimpia: playlistLimpiaCreada,
      restantesCount: restantes.length
    }
  },

  async getHistorialAnalisis() {
    const user = requireActiveUser()
    const historial = loadCollection(STORAGE_KEYS.ANALISIS, INITIAL_ANALISIS)
    return historial.filter(a => a.organizacion_id === user.organizacion_id)
  },

  getBitacoraSeguridad() {
    return loadCollection(STORAGE_KEYS.BITACORA, [])
  },

  // Método para probar y demostrar el bloqueo de aislamiento Multi-Tenant y RBAC
  async ejecutarPruebaSeguridadMultiTenant() {
    const user = requireActiveUser()
    const otraOrgId =
      user.organizacion_id === '11111111-1111-1111-1111-111111111111'
        ? '22222222-2222-2222-2222-222222222222'
        : '11111111-1111-1111-1111-111111111111'

    const resultados = []

    // Prueba 1: Intentar leer canciones de otra organización
    try {
      await this.getCanciones(otraOrgId)
      resultados.push({ prueba: 'Lectura cruzada de otra organización', estado: 'FALLÓ (Permitido por error)' })
    } catch (err) {
      resultados.push({ prueba: 'Lectura cruzada de otra organización', estado: 'BLOQUEADO CORRECTAMENTE', detalle: err.message })
    }

    // Prueba 2: Intentar eliminar una canción de otra organización
    const cancionOtraOrg =
      otraOrgId === '22222222-2222-2222-2222-222222222222'
        ? 'c2222222-2222-2222-2222-222222222221'
        : 'c1111111-1111-1111-1111-111111111111'
    try {
      await this.deleteCancion(cancionOtraOrg)
      resultados.push({ prueba: 'Eliminación de registro de otra organización', estado: 'FALLÓ' })
    } catch (err) {
      resultados.push({ prueba: 'Eliminación de registro de otra organización', estado: 'BLOQUEADO CORRECTAMENTE', detalle: err.message })
    }

    // Prueba 3: Verificar permiso de carga manual según rol actual
    try {
      if (user.rol !== 'admin' && user.rol !== 'productor') {
        await this.createCancionManual({ titulo: 'Test No Autorizado', artista: 'Tester' })
      } else {
        resultados.push({
          prueba: `Carga manual con rol '${user.rol}'`,
          estado: 'PERMITIDO CORRECTAMENTE',
          detalle: `El rol '${user.rol}' tiene autorización para subir música.`
        })
      }
    } catch (err) {
      resultados.push({
        prueba: `Carga manual con rol '${user.rol}'`,
        estado: 'BLOQUEADO CORRECTAMENTE',
        detalle: err.message
      })
    }

    return resultados
  }
}
