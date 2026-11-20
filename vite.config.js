import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import {
  searchYouTubeInnerTube,
  extractSpotifyPlaylistFromEmbed,
  extractYoutubePlaylistInnerTube,
  resolveRealTrackPlays
} from './netlify/functions/music-helpers.js'

function attachYtMiddleware(server) {
  server.middlewares.use('/api/spotify-config', (req, res) => {
    const clientId = (process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID || '').trim()
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(
      JSON.stringify({
        ok: true,
        configured: Boolean(clientId && clientId !== 'your-spotify-client-id'),
        clientId: clientId && clientId !== 'your-spotify-client-id' ? clientId : ''
      })
    )
  })

  server.middlewares.use('/api/google-config', (req, res) => {
    const clientId = (
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_YOUTUBE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      ''
    ).trim()
    const configured = Boolean(clientId && !clientId.startsWith('your-'))
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(
      JSON.stringify({
        ok: true,
        configured,
        clientId: configured ? clientId : ''
      })
    )
  })

  server.middlewares.use('/api/yt-search', async (req, res) => {
    try {
      const urlObj = new URL(req.url || '', 'http://127.0.0.1')
      const q = urlObj.searchParams.get('q') || ''
      const mode = urlObj.searchParams.get('mode') || 'lyrics'

      const items = await searchYouTubeInnerTube(q, mode)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(JSON.stringify({ ok: true, items }))
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ ok: false, error: err.message, items: [] }))
    }
  })

  server.middlewares.use('/api/track-stats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      const urlObj = new URL(req.url || '', 'http://127.0.0.1')
      const q = urlObj.searchParams.get('q') || ''
      const platform = urlObj.searchParams.get('platform') || 'spotify'
      const videoId = urlObj.searchParams.get('videoId') || ''
      const plays = await resolveRealTrackPlays({ query: q, platform, videoId })
      res.statusCode = 200
      res.end(JSON.stringify({ ok: true, plays, platform }))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, plays: 0, error: err.message }))
    }
  })

  server.middlewares.use('/api/extract-playlist', async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      const urlObj = new URL(req.url || '', 'http://127.0.0.1')
      const targetUrl = (urlObj.searchParams.get('url') || '').trim()
      if (!targetUrl) {
        res.statusCode = 400
        res.end(JSON.stringify({ ok: false, error: 'Ingresa un enlace válido de playlist.' }))
        return
      }

      const spMatch = targetUrl.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/)
      if (spMatch && spMatch[1]) {
        const spotifyToken = urlObj.searchParams.get('spotifyToken') || ''
        const playlist = await extractSpotifyPlaylistFromEmbed(spMatch[1], spotifyToken)
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, playlist }))
        return
      }

      const ytMatch = targetUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/)
      if (ytMatch && ytMatch[1]) {
        const isYtMusic = targetUrl.includes('music.youtube.com')
        const playlist = await extractYoutubePlaylistInnerTube(ytMatch[1], isYtMusic)
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, playlist }))
        return
      }

      res.statusCode = 400
      res.end(
        JSON.stringify({
          ok: false,
          error:
            'Formato de enlace no reconocido. Pega un enlace de playlist de Spotify (open.spotify.com/playlist/...), YouTube o YouTube Music (?list=...).'
        })
      )
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, error: err.message || 'Error al extraer la playlist.' }))
    }
  })
}

function gavifyYoutubeAudioPlugin() {
  return {
    name: 'gavify-youtube-audio-plugin',
    configureServer(server) {
      attachYtMiddleware(server)
    },
    configurePreviewServer(server) {
      attachYtMiddleware(server)
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.SPOTIFY_CLIENT_ID) process.env.SPOTIFY_CLIENT_ID = env.SPOTIFY_CLIENT_ID
  if (env.SPOTIFY_CLIENT_SECRET) process.env.SPOTIFY_CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET
  if (env.VITE_SPOTIFY_CLIENT_ID) process.env.VITE_SPOTIFY_CLIENT_ID = env.VITE_SPOTIFY_CLIENT_ID
  if (env.VITE_SPOTIFY_CLIENT_SECRET) process.env.VITE_SPOTIFY_CLIENT_SECRET = env.VITE_SPOTIFY_CLIENT_SECRET
  if (env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID
  if (env.VITE_YOUTUBE_CLIENT_ID) process.env.VITE_YOUTUBE_CLIENT_ID = env.VITE_YOUTUBE_CLIENT_ID
  if (env.VITE_GOOGLE_CLIENT_ID) process.env.VITE_GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID

  return {
    base: process.env.VITE_BASE_PATH || '/',
    server: {
      host: '127.0.0.1',
      port: 5173
    },
    plugins: [vue(), gavifyYoutubeAudioPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
