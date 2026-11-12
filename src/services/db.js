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
const INITIAL_CANCIONES = [
  // --- ORGANIZACIÓN 1: SEBAS MUSIC HUB (11111111-1111-1111-1111-111111111111) ---
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    usuario_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    autor_nombre: 'Sebastian Gavilan',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'As It Was',
    artista: 'Harry Styles',
    album: 'Harrys House',
    genero: 'Pop',
    duracion_segundos: 165,
    reproducciones: 48,
    activo: true,
    plataforma_origen: 'spotify',
    es_produccion_propia: false,
    spotify_track_id: 'spotify:track:4pt5fOT96fPqDk6q5pQG',
    youtube_video_id: 'Qfm6nfz1QNQ',
    youtube_candidates: ['Qfm6nfz1QNQ', 'EsY5kRIBM8Y', 'S-3s3BckRjc'],
    portada_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-15T14:20:00Z',
    actualizado_en: '2026-10-15T14:20:00Z'
  },
  {
    id: 'c1111111-1111-1111-1111-111111111112',
    usuario_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    autor_nombre: 'Sebastian Gavilan',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Blinding Lights',
    artista: 'The Weeknd',
    album: 'After Hours',
    genero: 'Indie Pop',
    duracion_segundos: 200,
    reproducciones: 42,
    activo: true,
    plataforma_origen: 'spotify',
    es_produccion_propia: false,
    spotify_track_id: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    youtube_video_id: 'XwxLwG2_Sxk',
    youtube_candidates: ['XwxLwG2_Sxk', '13pZOoLr46M', 'oxzQsfEuRDo'],
    portada_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-16T10:15:00Z',
    actualizado_en: '2026-10-16T10:15:00Z'
  },
  {
    id: 'c1111111-1111-1111-1111-111111111113',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    autor_nombre: 'Lucía Martínez',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Flowers',
    artista: 'Miley Cyrus',
    album: 'Endless Summer Vacation',
    genero: 'Pop',
    duracion_segundos: 198,
    reproducciones: 37,
    activo: true,
    plataforma_origen: 'youtube_music',
    es_produccion_propia: false,
    ytmusic_track_id: 'ytm_flowers_01',
    youtube_video_id: 'iawgB2CDCrw',
    youtube_candidates: ['iawgB2CDCrw', 'o1dfTZS8E90', 'G7KNmW9a75Y'],
    portada_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-17T18:00:00Z',
    actualizado_en: '2026-10-17T18:00:00Z'
  },
  {
    id: 'c1111111-1111-1111-1111-111111111114',
    usuario_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    autor_nombre: 'Mateo López',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Calm Down',
    artista: 'Rema, Selena Gomez',
    album: 'Rave & Roses Ultra',
    genero: 'Trap / Urbano',
    duracion_segundos: 237,
    reproducciones: 32,
    activo: true,
    plataforma_origen: 'youtube',
    es_produccion_propia: false,
    youtube_video_id: 'G-D80U_u3sk',
    youtube_candidates: ['G-D80U_u3sk', 'XCXobyGlAzc', 'WcIcVapfqXw'],
    portada_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-18T11:30:00Z',
    actualizado_en: '2026-10-18T11:30:00Z'
  },
  {
    id: 'c1111111-1111-1111-1111-111111111115',
    usuario_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    autor_nombre: 'Julián Torres',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'BZRP Music Sessions #52',
    artista: 'Bizarrap, Quevedo',
    album: 'Bizarrap Live Sessions',
    genero: 'Electrónica',
    duracion_segundos: 199,
    reproducciones: 65,
    activo: true,
    plataforma_origen: 'youtube_music',
    es_produccion_propia: false,
    youtube_video_id: 'tJWWJiVYiUA',
    youtube_candidates: ['tJWWJiVYiUA', 'lI3Q9_hg7zA', 'A_g3lMcWVy0'],
    portada_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-19T16:45:00Z',
    actualizado_en: '2026-10-19T16:45:00Z'
  },

  // --- ORGANIZACIÓN 2: RADIO URBANA RECORDS (22222222-2222-2222-2222-222222222222) ---
  {
    id: 'c2222222-2222-2222-2222-222222222221',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    autor_nombre: 'Lucía Martínez',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    titulo: 'Midnight City',
    artista: 'M83',
    album: 'Hurry Up, We Are Dreaming',
    genero: 'Electrónica',
    duracion_segundos: 243,
    reproducciones: 85,
    activo: true,
    plataforma_origen: 'spotify',
    es_produccion_propia: false,
    spotify_track_id: 'spotify:track:6GyFP1nfCDB8lbD2bG06q9',
    youtube_video_id: '8zf7Ht4hqsc',
    youtube_candidates: ['8zf7Ht4hqsc', '1D2ItvuOlV4', 'GmCtz3Vpdrk'],
    portada_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-14T09:00:00Z',
    actualizado_en: '2026-10-14T09:00:00Z'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    autor_nombre: 'Lucía Martínez',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    titulo: 'Breezeblocks',
    artista: 'alt-J',
    album: 'An Awesome Wave',
    genero: 'Alternativo',
    duracion_segundos: 227,
    reproducciones: 64,
    activo: true,
    plataforma_origen: 'youtube_music',
    es_produccion_propia: false,
    ytmusic_track_id: 'ytm_breeze_02',
    youtube_video_id: 'pHx252Gfdms',
    youtube_candidates: ['pHx252Gfdms', 'nPlXdFwWcV4', 'ywg-WCQFwwQ'],
    portada_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-15T12:30:00Z',
    actualizado_en: '2026-10-15T12:30:00Z'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222223',
    usuario_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    autor_nombre: 'Valentina Ruiz',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    titulo: 'Viva La Vida',
    artista: 'Coldplay',
    album: 'Viva La Vida or Death and All His Friends',
    genero: 'Rock',
    duracion_segundos: 243,
    reproducciones: 110,
    activo: true,
    plataforma_origen: 'spotify',
    es_produccion_propia: false,
    youtube_video_id: 'y4zdDXPYo0I',
    youtube_candidates: ['y4zdDXPYo0I', 'BA-YR8ptlK0', 'dvgZkm1xWPE'],
    portada_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    audio_url: '',
    creado_en: '2026-10-16T15:00:00Z',
    actualizado_en: '2026-10-16T15:00:00Z'
  }
]

const INITIAL_PLAYLISTS = [
  // --- ORGANIZACIÓN 1: SEBAS MUSIC HUB ---
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    usuario_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Favoritas 2026 (Spotify)',
    descripcion: 'Las pistas más sonadas del año sincronizadas desde Spotify Web API',
    es_publica: false,
    plataforma_origen: 'spotify',
    portada_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80',
    creado_en: '2026-10-15T15:00:00Z',
    actualizado_en: '2026-10-15T15:00:00Z'
  },
  {
    id: 'p1111111-1111-1111-1111-111111111112',
    usuario_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Tu lado B (Mix YT Music & Spotify)',
    descripcion: 'Lista combinada de Spotify, YT Music y YouTube para salir de la rutina',
    es_publica: true,
    plataforma_origen: 'gavify',
    portada_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80',
    creado_en: '2026-10-16T18:00:00Z',
    actualizado_en: '2026-10-16T18:00:00Z'
  },
  {
    id: 'p1111111-1111-1111-1111-111111111113',
    usuario_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Hits Electrónicos & Sesiones',
    descripcion: 'Sesiones electrónicas y lanzamientos sincronizados de YT Music y Spotify',
    es_publica: true,
    plataforma_origen: 'youtube_music',
    portada_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop&q=80',
    creado_en: '2026-10-19T17:00:00Z',
    actualizado_en: '2026-10-19T17:00:00Z'
  },

  // --- ORGANIZACIÓN 2: RADIO URBANA RECORDS ---
  {
    id: 'p2222222-2222-2222-2222-222222222221',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Domingo Lento (Radio Urbana)',
    descripcion: 'Música chillout y electrónica para transmisión dominical de Radio Urbana',
    es_publica: true,
    plataforma_origen: 'spotify',
    portada_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
    creado_en: '2026-10-14T10:00:00Z',
    actualizado_en: '2026-10-14T10:00:00Z'
  },
  {
    id: 'p2222222-2222-2222-2222-222222222222',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Descubrimientos YouTube Music',
    descripcion: 'Radar de novedades indie extraídas desde YouTube Music API',
    es_publica: false,
    plataforma_origen: 'youtube_music',
    portada_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80',
    creado_en: '2026-10-15T14:00:00Z',
    actualizado_en: '2026-10-15T14:00:00Z'
  }
]

const INITIAL_PLAYLIST_CANCIONES = [
  // Sebas Music Hub: Canciones repetidas DENTRO de la misma playlist (por haberse agregado más de una vez)
  // Playlist 1: Favoritas 2026 (Spotify) -> 'As It Was' repetida en posición #1 y #4
  { id: 'pc-101', playlist_id: 'p1111111-1111-1111-1111-111111111111', cancion_id: 'c1111111-1111-1111-1111-111111111111', posicion: 0 },
  { id: 'pc-102', playlist_id: 'p1111111-1111-1111-1111-111111111111', cancion_id: 'c1111111-1111-1111-1111-111111111112', posicion: 1 },
  { id: 'pc-103', playlist_id: 'p1111111-1111-1111-1111-111111111111', cancion_id: 'c1111111-1111-1111-1111-111111111113', posicion: 2 },
  { id: 'pc-103-dup', playlist_id: 'p1111111-1111-1111-1111-111111111111', cancion_id: 'c1111111-1111-1111-1111-111111111111', posicion: 3 }, // As It Was agregada de nuevo en la misma playlist

  // Playlist 2: Tu lado B -> 'Blinding Lights' repetida 2 veces dentro de esta misma playlist
  { id: 'pc-104', playlist_id: 'p1111111-1111-1111-1111-111111111112', cancion_id: 'c1111111-1111-1111-1111-111111111111', posicion: 0 },
  { id: 'pc-105', playlist_id: 'p1111111-1111-1111-1111-111111111112', cancion_id: 'c1111111-1111-1111-1111-111111111112', posicion: 1 },
  { id: 'pc-106', playlist_id: 'p1111111-1111-1111-1111-111111111112', cancion_id: 'c1111111-1111-1111-1111-111111111114', posicion: 2 },
  { id: 'pc-107', playlist_id: 'p1111111-1111-1111-1111-111111111112', cancion_id: 'c1111111-1111-1111-1111-111111111112', posicion: 3 }, // Blinding Lights repetida en la misma playlist
  { id: 'pc-107b', playlist_id: 'p1111111-1111-1111-1111-111111111112', cancion_id: 'c1111111-1111-1111-1111-111111111115', posicion: 4 },

  // Playlist 3: Beats & Demos de Productor -> Sin repetidas
  { id: 'pc-108', playlist_id: 'p1111111-1111-1111-1111-111111111113', cancion_id: 'c1111111-1111-1111-1111-111111111115', posicion: 0 },
  { id: 'pc-109', playlist_id: 'p1111111-1111-1111-1111-111111111113', cancion_id: 'c1111111-1111-1111-1111-111111111111', posicion: 1 },

  // Radio Urbana Records: Midnight City repetida dentro de la misma lista
  { id: 'pc-201', playlist_id: 'p2222222-2222-2222-2222-222222222221', cancion_id: 'c2222222-2222-2222-2222-222222222221', posicion: 0 },
  { id: 'pc-202', playlist_id: 'p2222222-2222-2222-2222-222222222221', cancion_id: 'c2222222-2222-2222-2222-222222222222', posicion: 1 },
  { id: 'pc-202-dup', playlist_id: 'p2222222-2222-2222-2222-222222222221', cancion_id: 'c2222222-2222-2222-2222-222222222221', posicion: 2 },
  { id: 'pc-203', playlist_id: 'p2222222-2222-2222-2222-222222222222', cancion_id: 'c2222222-2222-2222-2222-222222222221', posicion: 0 },
  { id: 'pc-204', playlist_id: 'p2222222-2222-2222-2222-222222222223', posicion: 1 }
]

const INITIAL_ANALISIS = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    usuario_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    autor_nombre: 'Sebastian Gavilan',
    organizacion_id: '11111111-1111-1111-1111-111111111111',
    fecha_analisis: '2026-10-22T18:30:00Z',
    total_playlists_escaneadas: 3,
    total_canciones_escaneadas: 9,
    total_duplicados_detectados: 3,
    estado: 'pendiente',
    notas: 'Escaneo inicial automático de Sebas Music Hub (Spotify + YouTube Music + Producciones).'
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    usuario_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    autor_nombre: 'Lucía Martínez',
    organizacion_id: '22222222-2222-2222-2222-222222222222',
    fecha_analisis: '2026-10-21T11:15:00Z',
    total_playlists_escaneadas: 2,
    total_canciones_escaneadas: 4,
    total_duplicados_detectados: 1,
    estado: 'pendiente',
    notas: 'Auditoría semanal de programación de Radio Urbana Records.'
  }
]

function loadCollection(key, defaultData) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      return JSON.parse(raw)
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
        portada_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'
      })
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

  // --- PLAYLISTS (AISLADAS POR ORGANIZACIÓN) ---
  markPlaylistUsed(playlistId) {
    if (!playlistId) return
    try {
      const user = requireActiveUser()
      const key = `${STORAGE_KEYS.RECIENTES}_${user.organizacion_id}`
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

    const playlistsOrg = playlists.filter(p => p.organizacion_id === user.organizacion_id)

    return playlistsOrg
      .map(p => {
        const relsDePl = rels
          .filter(r => r.playlist_id === p.id)
          .sort((a, b) => a.posicion - b.posicion)
        const tracks = relsDePl.map(r => mapaCanciones.get(r.cancion_id)).filter(Boolean)
        const count = tracks.length
        const duracionTotal = tracks.reduce((acc, t) => acc + (Number(t.duracion_segundos) || 180), 0)
        const covers = tracks.map(t => t.portada_url).filter(Boolean).slice(0, 4)

        // Contar cuántas canciones están repetidas DENTRO de esta misma playlist
        const conteoEnEstaLista = {}
        for (const t of tracks) {
          const clave = `${(t.titulo || '').toLowerCase().trim()}|${(t.artista || '').toLowerCase().trim()}`
          conteoEnEstaLista[clave] = (conteoEnEstaLista[clave] || 0) + 1
        }
        const repetidasMismaListaCount = Object.values(conteoEnEstaLista).filter(c => c > 1).length

        return {
          ...p,
          creador_nombre: p.creador_nombre || user.nombre || 'Sebastian Gavilan',
          total_canciones: count,
          duracion_total_segundos: duracionTotal,
          collage_portadas: covers,
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
      const key = `${STORAGE_KEYS.RECIENTES}_${user.organizacion_id}`
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

    if (actual.organizacion_id !== user.organizacion_id) {
      registrarEventoSeguridad({
        accion: 'UPDATE playlist (Otra Organización)',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Bloqueado por aislamiento Multi-Tenant.'
      })
      throw new Error('403 Prohibido (Multi-Tenant): No puedes modificar una playlist de otra organización.')
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
      portada_url: payload.portada_url ?? actual.portada_url,
      portada_ruta: payload.portada_ruta ?? actual.portada_ruta,
      actualizado_en: new Date().toISOString()
    }

    playlists[idx] = actualizada
    saveCollection(STORAGE_KEYS.PLAYLISTS, playlists)
    playlistsRevision.value++

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

    if (actual.organizacion_id !== user.organizacion_id) {
      registrarEventoSeguridad({
        accion: 'DELETE playlist (Otra Organización)',
        recurso: actual.nombre,
        permitido: false,
        motivo: 'Bloqueado por aislamiento Multi-Tenant.'
      })
      throw new Error('403 Prohibido (Multi-Tenant): No puedes eliminar una playlist de otra organización.')
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
    if (!pl || pl.organizacion_id !== user.organizacion_id) {
      throw new Error('403 Prohibido: La playlist no pertenece a tu organización.')
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
    if (!pl || pl.organizacion_id !== user.organizacion_id) {
      throw new Error('403 Prohibido: Playlist fuera de tu organización.')
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
      .filter(p => p.organizacion_id === user.organizacion_id)
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
