import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const ytSearchCache = new Map()

function parseDurationToSeconds(durationText = '') {
  if (!durationText) return 215
  const parts = String(durationText).trim().split(':').map(Number)
  if (parts.some(isNaN)) return 215
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 215
}

async function searchYouTubeInnerTube(rawQuery, mode = 'lyrics') {
  const clean = String(rawQuery || '').trim()
  if (!clean) return []

  const effectiveQuery =
    mode === 'lyrics' && !clean.toLowerCase().includes('lyrics') && !clean.toLowerCase().includes('letra')
      ? `${clean} lyrics`
      : clean

  const cacheKey = `${mode}:${effectiveQuery.toLowerCase()}`
  if (ytSearchCache.has(cacheKey)) {
    return ytSearchCache.get(cacheKey)
  }

  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240726.00.00',
          hl: 'es',
          gl: 'AR'
        }
      },
      query: effectiveQuery
    })
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []

  const videos = []
  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || []
    for (const item of items) {
      const v = item.videoRenderer
      if (v && v.videoId) {
        const title = v.title?.runs?.map(r => r.text).join('') || 'Canción'
        const channel = v.ownerText?.runs?.[0]?.text || 'Canal Oficial'
        const durationText = v.lengthText?.simpleText || '3:35'
        const durationSeconds = parseDurationToSeconds(durationText)
        const thumbnail =
          v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`

        const lowerTitle = title.toLowerCase()
        const lowerChannel = channel.toLowerCase()
        // Priorizar versiones con letra/audio que permiten reproducción embebida sin bloqueo VEVO
        const isEmbedFriendly =
          lowerTitle.includes('lyric') ||
          lowerTitle.includes('letra') ||
          lowerTitle.includes('audio') ||
          lowerTitle.includes('sub') ||
          lowerChannel.includes('topic') ||
          lowerChannel.includes('7clouds') ||
          lowerChannel.includes('vibe')

        videos.push({
          videoId: v.videoId,
          title,
          channel,
          durationText,
          durationSeconds,
          thumbnail,
          isEmbedFriendly
        })
      }
    }
  }

  if (mode === 'lyrics') {
    videos.sort((a, b) => Number(b.isEmbedFriendly) - Number(a.isEmbedFriendly))
  }

  const result = videos.slice(0, 10)
  ytSearchCache.set(cacheKey, result)
  return result
}

function attachYtMiddleware(server) {
  server.middlewares.use('/api/yt-search', async (req, res) => {
    try {
      const urlObj = new URL(req.url || '', 'http://localhost')
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

export default defineConfig({
  plugins: [vue(), gavifyYoutubeAudioPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
