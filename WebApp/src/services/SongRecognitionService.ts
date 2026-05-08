/**
 * SongRecognitionService — web version.
 *
 * Pipeline:
 *  1. Tap the live <audio> graph via the shared AnalyserNode and capture
 *     ~8 s of mono PCM using a ScriptProcessorNode (same approach as
 *     AndroidApp — works on every browser).
 *  2. Feed PCM to shazamio-core/web (WASM) to produce a Shazam signature.
 *  3. POST the signature JSON to `/api/shazam` — our Netlify Edge Function
 *     forwards it to amp.shazam.com (bypasses browser CORS).
 *  4. Parse title/artist/album/cover/streaming links from the response.
 */

import { AudioService } from './AudioService'

const CAPTURE_SECONDS = 8

export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  coverArt?: string
  shazamUrl?: string
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeMusicUrl?: string
  youtubeUrl?: string
  deezerUrl?: string
}

// ── Shazam response types (subset) ──────────────────────────────────────────
interface ShazamHubAction {
  type?: string
  uri?: string
  providername?: string
}

interface ShazamHubProvider {
  type?: string
  actions?: ShazamHubAction[]
}

interface ShazamHubOption {
  providername?: string
  actions?: ShazamHubAction[]
}

interface ShazamHub {
  providers?: ShazamHubProvider[]
  options?: ShazamHubOption[]
  actions?: ShazamHubAction[]
}

interface ShazamSection {
  type: string
  metadata?: { title: string; text: string }[]
  youtubeurl?: string
}

interface ShazamTrack {
  title?: string
  subtitle?: string
  url?: string
  images?: { coverart?: string; coverarthq?: string }
  sections?: ShazamSection[]
  hub?: ShazamHub
}

interface ShazamResponse {
  matches?: unknown[]
  track?: ShazamTrack
}

export class SongRecognitionService {
  private static instance: SongRecognitionService
  private _busy = false
  private _wasmReady = false

  static getInstance(): SongRecognitionService {
    if (!this.instance) this.instance = new SongRecognitionService()
    return this.instance
  }

  get busy(): boolean { return this._busy }

  async recognize(_streamUrl: string): Promise<RecognitionResult | null> {
    if (this._busy) return null
    this._busy = true
    try {
      return await this.runPipeline()
    } catch (e) {
      console.warn('[Recognition] failed:', e)
      return null
    } finally {
      this._busy = false
    }
  }

  private async runPipeline(): Promise<RecognitionResult | null> {
    const pcm = await this.capturePcm()
    if (!pcm) return null

    const signature = await this.generateSignature(pcm.samples, pcm.sampleRate)
    if (!signature) return null

    return this.queryShazam(signature.uri, signature.samplems)
  }

  // ── Step 1: Capture PCM from the live audio graph ──────────────────────────

  private capturePcm(): Promise<{ samples: Float32Array; sampleRate: number } | null> {
    return new Promise((resolve) => {
      const audioService = AudioService.getInstance()
      const audioEl = audioService.getAudioElement()

      // We re-use whatever AudioContext the visualizer set up. The
      // VisualizerService is also initialised from AudioService on play, so
      // by the time the user can click "Identify", the analyser exists.
      // If not, bail.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analyser = (audioEl as any)._sharedAnalyser as AnalyserNode | undefined

      // Fallback: walk the audio context via the global registry
      // (VisualizerService exposes sharedAnalyser). Done below.
      const fallbackAnalyser = getSharedAnalyserFromWindow()
      const node = analyser ?? fallbackAnalyser
      if (!node) {
        resolve(null)
        return
      }

      const ctx = node.context as AudioContext
      const sr = ctx.sampleRate
      const bufSize = 4096
      const needed = CAPTURE_SECONDS * sr
      const recorded: Float32Array[] = []
      let collected = 0
      let done = false

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const proc = ctx.createScriptProcessor(bufSize, 1, 1)
      let disconnected = false

      const cleanup = (): void => {
        if (disconnected) return
        disconnected = true
        try { proc.disconnect() } catch { /* ignore */ }
        try { node.disconnect(proc) } catch { /* ignore */ }
      }

      const buildResult = (): { samples: Float32Array; sampleRate: number } => {
        const total = recorded.reduce((s, a) => s + a.length, 0)
        const merged = new Float32Array(total)
        let off = 0
        for (const chunk of recorded) { merged.set(chunk, off); off += chunk.length }
        return { samples: merged, sampleRate: sr }
      }

      const timeout = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        resolve(collected > sr * 3 ? buildResult() : null)
      }, (CAPTURE_SECONDS + 6) * 1000)

      proc.onaudioprocess = (e): void => {
        if (done) return
        const data = e.inputBuffer.getChannelData(0)
        recorded.push(new Float32Array(data))
        collected += data.length
        if (collected >= needed) {
          done = true
          clearTimeout(timeout)
          cleanup()
          resolve(buildResult())
        }
      }

      node.connect(proc)
      proc.connect(ctx.destination)
    })
  }

  // ── Step 2: Shazam signature via shazamio-core/web (WASM) ──────────────────

  private async generateSignature(
    samples: Float32Array,
    sampleRate: number
  ): Promise<{ uri: string; samplems: number } | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import('shazamio-core/web')
      if (!this._wasmReady) {
        await mod.default()
        this._wasmReady = true
      }
      const { DecodedSignature } = mod
      const sig = DecodedSignature.new(samples, sampleRate, 1)
      const uri = sig.uri as string
      const samplems = sig.samplems as number
      sig.free?.()
      if (!uri) return null
      return { uri, samplems }
    } catch (e) {
      console.warn('[Recognition] WASM signature failed:', e)
      return null
    }
  }

  // ── Step 3: POST to /api/shazam (Netlify Edge Function proxy) ─────────────

  private async queryShazam(
    signatureUri: string,
    samplems: number
  ): Promise<RecognitionResult | null> {
    const body = JSON.stringify({
      timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      signature:   { uri: signatureUri, samplems },
      timestamp:   Date.now(),
      context:     {},
      geolocation: {},
    })

    let response: Response
    try {
      response = await fetch('/api/shazam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
    } catch (e) {
      console.warn('[Recognition] Shazam proxy fetch failed:', e)
      return null
    }

    if (!response.ok) return null

    let data: ShazamResponse
    try {
      data = (await response.json()) as ShazamResponse
    } catch {
      return null
    }

    if (!data.matches?.length || !data.track) return null

    const track = data.track
    const title = track.title?.trim()
    const artist = track.subtitle?.trim()
    if (!title || !artist) return null

    const songSection = track.sections?.find(s => s.type === 'SONG')
    const album = songSection?.metadata?.find(m => m.title === 'Album')?.text
    const releaseDate = songSection?.metadata?.find(m => m.title === 'Released')?.text
    const coverArt = track.images?.coverarthq ?? track.images?.coverart

    const searchQuery = encodeURIComponent(`${title} ${artist}`)

    // Provider deep links from hub.providers (web API) or hub.options (iPhone API)
    let spotifyDirect: string | undefined
    let appleDirect: string | undefined

    if (track.hub?.providers) {
      for (const provider of track.hub.providers) {
        const type = provider.type?.toLowerCase() ?? ''
        const openAction = provider.actions?.find(a => a.type === 'open')
        const uriAction = provider.actions?.find(a => a.type === 'uri')
        let url = openAction?.uri ?? uriAction?.uri
        if (!url) continue
        if (url.startsWith('spotify:') && !url.startsWith('https://')) {
          const parts = url.split(':')
          parts.shift()
          url = 'https://open.spotify.com/' + parts.join('/')
        }
        if (type === 'spotify') spotifyDirect = url
        if (type === 'applemusic' || type === 'itunes') appleDirect = url
      }
    }

    if (track.hub?.options) {
      const spotOpt = track.hub.options.find(o => o.providername?.toUpperCase() === 'SPOTIFY')
      const appleOpt = track.hub.options.find(o => o.providername?.toUpperCase() === 'APPLEMUSIC')
      spotifyDirect ??= spotOpt?.actions?.find(a => a.type === 'uri')?.uri
      appleDirect ??= appleOpt?.actions?.find(a => a.type === 'uri')?.uri
    }

    const spotifyUrl = spotifyDirect ?? `https://open.spotify.com/search/${searchQuery}`
    const appleMusicUrl = appleDirect
    const youtubeMusicUrl = `https://music.youtube.com/search?q=${searchQuery}`
    const deezerUrl = `https://www.deezer.com/search/${searchQuery}`
    const youtubeUrl = track.sections?.find(s => s.youtubeurl)?.youtubeurl

    const result: RecognitionResult = {
      title,
      artist,
      spotifyUrl,
      youtubeMusicUrl,
      deezerUrl,
    }
    if (album) result.album = album
    if (releaseDate) result.releaseDate = releaseDate
    if (coverArt) result.coverArt = coverArt
    if (track.url) result.shazamUrl = track.url
    if (appleMusicUrl) result.appleMusicUrl = appleMusicUrl
    if (youtubeUrl) result.youtubeUrl = youtubeUrl
    return result
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────
// The VisualizerService registers its analyser on window so the recognition
// pipeline can borrow it without introducing a circular import.
interface AetherGlobals {
  __aetherSharedAnalyser?: AnalyserNode | null
}

function getSharedAnalyserFromWindow(): AnalyserNode | null {
  const g = window as unknown as AetherGlobals
  return g.__aetherSharedAnalyser ?? null
}
