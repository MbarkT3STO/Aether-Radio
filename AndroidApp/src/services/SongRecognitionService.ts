/**
 * SongRecognitionService — identifies the currently playing song.
 *
 * Uses the same pipeline as the desktop app but adapted for the browser:
 *  1. Capture ~8 s of raw PCM float32 from the live AudioContext graph
 *     (no fetch/CORS — taps directly into the playing audio)
 *  2. Feed PCM to shazamio-core/web (Shazam's own fingerprinting WASM)
 *     via DecodedSignature.new() — gets a Shazam-format signature URI
 *  3. POST the signature to Shazam's internal API (amp.shazam.com)
 *  4. Parse title / artist / album / cover art from the response
 *
 * Free, unlimited, Shazam's full 100M+ track database.
 */

import { AudioService } from './AudioService'

// Shazam API endpoint
const SHAZAM_HOST   = 'https://amp.shazam.com'
const SHAZAM_PARAMS = 'sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3'

// Capture 8 seconds — enough for Shazam, same as desktop
const CAPTURE_SECONDS = 8

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  coverArt?: string
}

interface ShazamTrack {
  title?: string
  subtitle?: string
  images?: { coverart?: string; coverarthq?: string }
  sections?: { type: string; metadata?: { title: string; text: string }[] }[]
}

interface ShazamResponse {
  matches?: unknown[]
  track?: ShazamTrack
}

// ── Debug overlay ─────────────────────────────────────────────────────────────
function dbg(msg: string): void {
  console.log('[Recognition]', msg)
  let el = document.getElementById('rcm-debug-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'rcm-debug-overlay'
    Object.assign(el.style, {
      position: 'fixed', bottom: '80px', left: '10px', right: '10px',
      background: 'rgba(0,0,0,0.88)', color: '#0f0', fontSize: '11px',
      fontFamily: 'monospace', padding: '8px', borderRadius: '6px',
      zIndex: '99999', maxHeight: '240px', overflowY: 'auto',
      pointerEvents: 'none',
    })
    document.body.appendChild(el)
    setTimeout(() => el?.remove(), 40_000)
  }
  el.innerHTML += `<div>${new Date().toISOString().slice(11, 23)} ${msg}</div>`
  el.scrollTop = el.scrollHeight
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  }).toUpperCase()
}

// ── Service ───────────────────────────────────────────────────────────────────
export class SongRecognitionService {
  private static instance: SongRecognitionService
  private _busy = false

  static getInstance(): SongRecognitionService {
    if (!this.instance) this.instance = new SongRecognitionService()
    return this.instance
  }

  get busy(): boolean { return this._busy }

  async recognize(_streamUrl: string): Promise<RecognitionResult | null> {
    if (this._busy) return null
    this._busy = true
    document.getElementById('rcm-debug-overlay')?.remove()
    try {
      return await this._recognize()
    } catch (e) {
      dbg(`UNCAUGHT: ${String(e)}`)
      return null
    } finally {
      this._busy = false
    }
  }

  private async _recognize(): Promise<RecognitionResult | null> {
    // ── Step 1: Capture PCM from the live audio graph ─────────────────────────
    dbg(`Step 1: capturing ${CAPTURE_SECONDS}s PCM...`)
    const pcm = await this.capturePcm()
    if (!pcm) { dbg('FAIL: no PCM (audio not playing?)'); return null }
    dbg(`OK: ${pcm.samples.length} samples @ ${pcm.sampleRate}Hz x${pcm.channels}ch`)

    // ── Step 2: Generate Shazam signature via WASM ────────────────────────────
    dbg('Step 2: generating Shazam signature (WASM)...')
    const sigResult = await this.generateSignature(pcm.samples, pcm.sampleRate, pcm.channels)
    if (!sigResult) { dbg('FAIL: signature generation failed'); return null }
    dbg(`OK: uri len=${sigResult.uri.length} samplems=${sigResult.samplems}`)

    // ── Step 3: POST to Shazam API ────────────────────────────────────────────
    dbg('Step 3: querying Shazam API...')
    return await this.queryShazam(sigResult.uri, sigResult.samplems)
  }

  // ── PCM capture via ScriptProcessorNode ──────────────────────────────────
  private capturePcm(): Promise<{
    samples: Float32Array
    sampleRate: number
    channels: number
  } | null> {
    return new Promise((resolve) => {
      const visualizer = AudioService.getInstance().getVisualizer()
      const analyser   = visualizer.sharedAnalyser

      if (!analyser) {
        dbg('no analyser node — is audio playing?')
        resolve(null)
        return
      }

      const ctx      = analyser.context as AudioContext
      const sr       = ctx.sampleRate
      const bufSize  = 4096
      const needed   = CAPTURE_SECONDS * sr
      const recorded: Float32Array[] = []
      let collected  = 0
      let done       = false

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const proc = ctx.createScriptProcessor(bufSize, 1, 1) // mono — Shazam needs mono
      let disconnected = false

      const cleanup = () => {
        if (disconnected) return
        disconnected = true
        proc.disconnect()
        try { analyser.disconnect(proc) } catch { /* ok */ }
      }

      const timeout = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        dbg(`timeout: ${collected} samples collected`)
        resolve(collected > sr * 3 ? buildResult() : null)
      }, (CAPTURE_SECONDS + 6) * 1000)

      function buildResult() {
        const total  = recorded.reduce((s, a) => s + a.length, 0)
        const merged = new Float32Array(total)
        let off = 0
        for (const chunk of recorded) { merged.set(chunk, off); off += chunk.length }
        return { samples: merged, sampleRate: sr, channels: 1 }
      }

      proc.onaudioprocess = (e) => {
        if (done) return
        // Use channel 0 (mono mix-down)
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

      analyser.connect(proc)
      proc.connect(ctx.destination)
    })
  }

  // ── Shazam signature via shazamio-core/web ────────────────────────────────
  private async generateSignature(
    samples: Float32Array,
    sampleRate: number,
    _channels: number
  ): Promise<{ uri: string; samplems: number } | null> {
    try {
      // Dynamic import — loads the WASM only when needed
      const mod = await import('shazamio-core/web')
      // mod.default is the init function
      await (mod.default as () => Promise<unknown>)()

      const { DecodedSignature } = mod

      // DecodedSignature.new() takes float32 PCM, sample rate, channel count
      const sig = DecodedSignature.new(samples, sampleRate, 1)
      const uri     = sig.uri
      const samplems = sig.samplems
      sig.free()

      if (!uri) { dbg('empty URI from WASM'); return null }
      return { uri, samplems }
    } catch (e) {
      dbg(`WASM error: ${String(e)}`)
      return null
    }
  }

  // ── Shazam API call ───────────────────────────────────────────────────────
  private async queryShazam(
    signatureUri: string,
    samplems: number
  ): Promise<RecognitionResult | null> {
    const url = `${SHAZAM_HOST}/discovery/v5/en/US/iphone/-/tag/${uuidv4()}/${uuidv4()}?${SHAZAM_PARAMS}`

    const body = JSON.stringify({
      timezone:  'America/New_York',
      signature: { uri: signatureUri, samplems },
      timestamp: Date.now(),
      context:   {},
      geolocation: {},
    })

    const headers: Record<string, string> = {
      'Content-Type':        'application/json',
      'X-Shazam-Platform':   'IPHONE',
      'X-Shazam-AppVersion': '14.1.0',
      'Accept':              '*/*',
      'Accept-Language':     'en-US',
      'User-Agent':          'Shazam/3685 CFNetwork/1485 Darwin/23.1.0',
    }

    let resp: Response
    try {
      resp = await fetch(url, { method: 'POST', headers, body })
    } catch (e) {
      dbg(`Shazam fetch error: ${String(e)}`)
      return null
    }

    if (!resp.ok) {
      dbg(`Shazam HTTP ${resp.status}`)
      return null
    }

    let data: ShazamResponse
    try {
      data = await resp.json() as ShazamResponse
    } catch (e) {
      dbg(`Shazam JSON error: ${String(e)}`)
      return null
    }

    dbg(`Shazam matches=${data.matches?.length ?? 0} track=${data.track?.title ?? 'none'}`)

    if (!data.matches?.length || !data.track) return null

    const track = data.track
    const title  = track.title?.trim()
    const artist = track.subtitle?.trim()
    if (!title || !artist) { dbg('missing title/artist'); return null }

    const songSection = track.sections?.find(s => s.type === 'SONG')
    const album       = songSection?.metadata?.find(m => m.title === 'Album')?.text
    const releaseDate = songSection?.metadata?.find(m => m.title === 'Released')?.text
    const coverArt    = track.images?.coverarthq ?? track.images?.coverart

    dbg(`MATCH: "${title}" — ${artist}`)
    return { title, artist, album, releaseDate, coverArt }
  }
}
