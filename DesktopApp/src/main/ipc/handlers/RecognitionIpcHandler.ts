import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'

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

// Shazam API constants
const SHAZAM_HOST   = 'https://amp.shazam.com'
const SHAZAM_PARAMS = 'sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3'

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  }).toUpperCase()
}

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

    ipcMain.handle(IpcChannel.RECOGNIZE_SIGNATURE, async (_, signatureUri: string, samplems: number) => {
      try {
        const result = await queryShazamApi(signatureUri, samplems)
        if (!result) return { success: false, error: 'Not recognized' }
        return { success: true, data: result }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  }
}

/**
 * Main recognition pipeline — fetches stream bytes, generates signatures
 * via shazamio-core WASM, and queries Shazam API using Node.js https
 * (not Electron's fetch, which has issues on Windows).
 */
async function recognizeStream(streamUrl: string): Promise<RecognitionResult | null> {
  // 1. Fetch a chunk of the live stream
  const audioBuffer = await fetchStreamChunk(streamUrl)
  if (!audioBuffer) return null

  // 2. Generate signatures from the raw audio bytes using shazamio-core WASM
  const { recognizeBytes } = await import('shazamio-core')
  const signatures = recognizeBytes(new Uint8Array(audioBuffer), 0, Number.MAX_SAFE_INTEGER)

  if (!signatures || signatures.length === 0) return null

  // 3. Try signatures from the middle outward (middle of the clip is most
  //    likely to contain clean audio without stream-join artifacts)
  let result: RecognitionResult | null = null
  try {
    for (let i = Math.floor(signatures.length / 2); i < signatures.length; i += 4) {
      const sig = signatures[i]
      if (!sig) continue
      result = await queryShazamApi(sig.uri, sig.samplems)
      if (result) break
    }
  } finally {
    // Free all WASM-allocated signatures
    for (const sig of signatures) {
      try { sig.free() } catch { /* ignore */ }
    }
  }

  return result
}

/**
 * POST a Shazam signature to the Shazam API using Node.js https module.
 * This bypasses Electron's fetch/net module which can have issues on Windows
 * with certain SSL/proxy configurations.
 */
async function queryShazamApi(signatureUri: string, samplems: number): Promise<RecognitionResult | null> {
  const https = await import('https')
  const { URL } = await import('url')

  const url = `${SHAZAM_HOST}/discovery/v5/en/US/iphone/-/tag/${uuidv4()}/${uuidv4()}?${SHAZAM_PARAMS}`

  const body = JSON.stringify({
    timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    signature:   { uri: signatureUri, samplems },
    timestamp:   Date.now(),
    context:     {},
    geolocation: {},
  })

  const parsed = new URL(url)

  const responseText = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        headers: {
          'Content-Type':        'application/json',
          'Content-Length':      Buffer.byteLength(body),
          'X-Shazam-Platform':   'IPHONE',
          'X-Shazam-AppVersion': '14.1.0',
          'Accept':              '*/*',
          'Accept-Language':     'en-US',
          'User-Agent':          'Shazam/3685 CFNetwork/1485 Darwin/23.1.0',
        },
        timeout: FETCH_TIMEOUT,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        res.on('error', reject)
      }
    )

    req.on('timeout', () => { req.destroy(); reject(new Error('Shazam API timeout')) })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  let data: { matches?: unknown[]; track?: ShazamTrackResponse }
  try {
    data = JSON.parse(responseText)
  } catch {
    return null
  }

  if (!data.matches?.length || !data.track) return null
  return parseShazamTrack(data.track)
}

// ── Shazam response parsing ─────────────────────────────────────────────────

interface ShazamTrackResponse {
  title?: string
  subtitle?: string
  url?: string
  images?: { coverart?: string; coverarthq?: string }
  sections?: { type: string; metadata?: { title: string; text: string }[]; youtubeurl?: string }[]
  hub?: {
    providers?: { type?: string; actions?: { type?: string; uri?: string }[] }[]
    options?: { providername?: string; actions?: { type?: string; uri?: string }[] }[]
  }
}

function parseShazamTrack(track: ShazamTrackResponse): RecognitionResult | null {
  const title  = track.title?.trim()
  const artist = track.subtitle?.trim()
  if (!title || !artist) return null

  const songSection = track.sections?.find(s => s.type === 'SONG')
  const album       = songSection?.metadata?.find(m => m.title === 'Album')?.text
  const releaseDate = songSection?.metadata?.find(m => m.title === 'Released')?.text
  const coverArt    = track.images?.coverarthq ?? track.images?.coverart

  // Provider deep links
  let spotifyDirect: string | undefined
  let appleMusicDirect: string | undefined

  if (track.hub?.providers) {
    for (const provider of track.hub.providers) {
      const type = provider.type?.toLowerCase() ?? ''
      const openAction = provider.actions?.find(a => a.type === 'open')
      const uriAction  = provider.actions?.find(a => a.type === 'uri')
      let url = openAction?.uri ?? uriAction?.uri
      if (!url) continue
      if (url.startsWith('spotify:') && !url.startsWith('https://')) {
        const parts = url.split(':')
        parts.shift()
        url = 'https://open.spotify.com/' + parts.join('/')
      }
      if (type === 'spotify') spotifyDirect = url
      if (type === 'applemusic' || type === 'itunes') appleMusicDirect = url
    }
  }

  if (track.hub?.options) {
    const spotOpt  = track.hub.options.find(o => o.providername?.toUpperCase() === 'SPOTIFY')
    const appleOpt = track.hub.options.find(o => o.providername?.toUpperCase() === 'APPLEMUSIC')
    spotifyDirect    ??= spotOpt?.actions?.find(a => a.type === 'uri')?.uri
    appleMusicDirect ??= appleOpt?.actions?.find(a => a.type === 'uri')?.uri
  }

  const searchQuery     = encodeURIComponent(`${title} ${artist}`)
  const spotifyUrl      = spotifyDirect ?? `https://open.spotify.com/search/${searchQuery}`
  const appleMusicUrl   = appleMusicDirect
  const youtubeMusicUrl = `https://music.youtube.com/search?q=${searchQuery}`
  const deezerUrl       = `https://www.deezer.com/search/${searchQuery}`
  const youtubeUrl      = track.sections?.find(s => s.youtubeurl)?.youtubeurl
  const shazamUrl       = track.url ?? undefined

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
}

// ── Stream chunk fetcher ────────────────────────────────────────────────────

async function fetchStreamChunk(url: string): Promise<Buffer | null> {
  const http  = await import('http')
  const https = await import('https')
  const { URL } = await import('url')

  return new Promise((resolve) => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      resolve(null)
      return
    }

    const lib = parsed.protocol === 'https:' ? https : http
    const chunks: Buffer[] = []
    let total = 0
    let settled = false

    const finish = (value: Buffer | null): void => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const req = lib.request(
      {
        method: 'GET',
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: (parsed.pathname || '/') + (parsed.search || ''),
        headers: {
          'User-Agent': 'AetherRadio/1.1',
          'Icy-MetaData': '0',
          'Accept': '*/*',
        },
        timeout: FETCH_TIMEOUT,
      },
      (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.destroy()
          try {
            const next = new URL(res.headers.location, url).toString()
            fetchStreamChunk(next).then(finish)
          } catch {
            finish(null)
          }
          return
        }

        if (!res.statusCode || res.statusCode >= 400) {
          res.destroy()
          finish(null)
          return
        }

        res.on('data', (chunk: Buffer) => {
          if (settled) return
          chunks.push(chunk)
          total += chunk.byteLength
          if (total >= FETCH_BYTES) {
            res.destroy()
            finish(Buffer.concat(chunks))
          }
        })

        res.on('end', () => {
          if (total === 0) finish(null)
          else finish(Buffer.concat(chunks))
        })

        res.on('error', () => {
          if (total > 0) finish(Buffer.concat(chunks))
          else finish(null)
        })
      }
    )

    req.on('timeout', () => {
      req.destroy()
      if (total > 0) finish(Buffer.concat(chunks))
      else finish(null)
    })

    req.on('error', () => {
      if (total > 0) finish(Buffer.concat(chunks))
      else finish(null)
    })

    req.end()
  })
}
