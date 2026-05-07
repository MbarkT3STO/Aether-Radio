import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import type { ShazamRoot } from 'node-shazam/dist/cjs/types/shazam'

export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeMusicUrl?: string
  youtubeUrl?: string
  deezerUrl?: string
  shazamUrl?: string
  coverArt?: string
}

const FETCH_BYTES   = 192 * 1024   // 192 KB ≈ 8 s at 192 kbps
const FETCH_TIMEOUT = 15_000

export class RecognitionIpcHandler {
  static register(): void {
    ipcMain.handle(IpcChannel.RECOGNIZE_SONG, async (_, streamUrl: string) => {
      try {
        const result = await recognizeStream(streamUrl)
        if (!result) return { success: false, error: 'Not recognized' }
        return { success: true, data: result }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  }
}

async function recognizeStream(streamUrl: string): Promise<RecognitionResult | null> {
  const os   = await import('os')
  const path = await import('path')
  const fs   = await import('fs/promises')
  const { net } = await import('electron')

  // 1. Fetch a chunk of the live stream
  const audioBuffer = await fetchStreamChunk(net, streamUrl)
  if (!audioBuffer) return null

  // 2. Write to a temp file — node-shazam reads from disk
  const tmpFile = path.join(os.tmpdir(), `aether-rec-${Date.now()}.mp3`)
  await fs.writeFile(tmpFile, audioBuffer)

  try {
    // 3. Recognise via node-shazam (uses shazamio-core WASM + Shazam API)
    const { Shazam } = await import('node-shazam')
    const shazam = new Shazam()
    const response = await shazam.recognise(tmpFile, 'en-US') as ShazamRoot | null

    if (!response?.track) return null
    const track = response.track

    const title  = track.title?.trim()
    const artist = track.subtitle?.trim()
    if (!title || !artist) return null

    // Album + release year from SONG section metadata
    const songSection = track.sections?.find(s => s.type === 'SONG')
    const album       = songSection?.metadata?.find(m => m.title === 'Album')?.text
    const releaseDate = songSection?.metadata?.find(m => m.title === 'Released')?.text

    // Cover art
    const coverArt = track.images?.coverarthq ?? track.images?.coverart

    // Streaming links from hub.options
    const spotifyOption    = track.hub?.options?.find(o => o.providername?.toUpperCase() === 'SPOTIFY')
    const appleMusicOption = track.hub?.options?.find(o => o.providername?.toUpperCase() === 'APPLEMUSIC')

    const spotifyDirect    = spotifyOption?.actions?.find(a => a.type === 'uri')?.uri
    const appleMusicUrl    = appleMusicOption?.actions?.find(a => a.type === 'uri')?.uri

    // YouTube URL from sections
    const videoSection  = track.sections?.find(s => s.youtubeurl)
    const youtubeUrl    = videoSection?.youtubeurl ?? undefined

    // Search-based URLs — always available as fallback
    const searchQuery     = encodeURIComponent(`${title} ${artist}`)
    const spotifyUrl      = spotifyDirect ?? `https://open.spotify.com/search/${searchQuery}`
    const youtubeMusicUrl = `https://music.youtube.com/search?q=${searchQuery}`
    const deezerUrl       = `https://www.deezer.com/search/${searchQuery}`

    // Shazam track page
    const shazamUrl = track.url ?? undefined

    return {
      title,
      artist,
      album:          album          ?? undefined,
      releaseDate:    releaseDate    ?? undefined,
      coverArt:       coverArt       ?? undefined,
      spotifyUrl:     spotifyUrl     ?? undefined,
      appleMusicUrl:  appleMusicUrl  ?? undefined,
      youtubeMusicUrl,
      youtubeUrl,
      deezerUrl,
      shazamUrl,
    }
  } finally {
    await fs.unlink(tmpFile).catch(() => {})
  }
}

async function fetchStreamChunk(
  net: Awaited<ReturnType<typeof import('electron')>>['net'],
  url: string
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), FETCH_TIMEOUT)

    net.fetch(url).then(async (res) => {
      if (!res.ok || !res.body) { clearTimeout(timer); resolve(null); return }

      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0

      try {
        while (total < FETCH_BYTES) {
          const { done, value } = await reader.read()
          if (done || !value) break
          chunks.push(value)
          total += value.byteLength
        }
        await reader.cancel()
      } catch { /* stream ended early — use what we have */ }

      clearTimeout(timer)
      if (total === 0) { resolve(null); return }

      resolve(Buffer.concat(chunks.map(c => Buffer.from(c))))
    }).catch(() => { clearTimeout(timer); resolve(null) })
  })
}
