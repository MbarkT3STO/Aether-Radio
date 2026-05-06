/**
 * SongRecognitionService — identifies the currently playing song.
 *
 * Strategy: tap into the EXISTING AudioContext + AnalyserNode that the
 * VisualizerService already has connected to the playing HTMLAudioElement.
 * We insert a ScriptProcessorNode into that graph to capture raw PCM samples
 * directly from the live audio — no fetch, no CORS, works on every station.
 *
 * Pipeline:
 *  1. Record ~20 s of PCM float32 samples from the playing audio via
 *     ScriptProcessorNode tapped off the existing AnalyserNode
 *  2. Encode the samples as a WAV ArrayBuffer
 *  3. Feed the WAV to @unimusic/chromaprint (WASM) → fingerprint string
 *  4. POST fingerprint + duration to AcoustID lookup API
 *  5. Return title / artist / album
 */

import { AudioService } from './AudioService'

const ACOUSTID_CLIENT_KEY = 'hTUfbqGtFY'
const ACOUSTID_API        = 'https://api.acoustid.org/v2/lookup'

// How many seconds of audio to capture before fingerprinting
const CAPTURE_SECONDS = 20

export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  coverArt?: string
}

interface AcoustIdRecording {
  title?: string
  artists?: { name: string }[]
  releasegroups?: { title?: string; releases?: { date?: string }[] }[]
}

interface AcoustIdResult {
  score: number
  recordings?: AcoustIdRecording[]
}

interface AcoustIdResponse {
  status: string
  error?: { message: string }
  results?: AcoustIdResult[]
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
    dbg('Step 1: capturing PCM from audio graph...')
    const pcmResult = await this.capturePcm()
    if (!pcmResult) { dbg('FAIL: PCM capture failed'); return null }

    const { samples, sampleRate, channels } = pcmResult
    dbg(`OK: captured ${samples[0]!.length} samples @ ${sampleRate}Hz x${channels}ch`)

    // ── Step 2: Encode as WAV ─────────────────────────────────────────────────
    dbg('Step 2: encoding WAV...')
    const wavBuffer = this.pcmToWav(samples, sampleRate, channels)
    dbg(`OK: WAV ${wavBuffer.byteLength} bytes`)

    // ── Step 3: Chromaprint fingerprint ───────────────────────────────────────
    dbg('Step 3: generating fingerprint (WASM)...')
    let fingerprint: string | null = null
    try {
      const { processAudioFile } = await import('@unimusic/chromaprint')
      for await (const fp of processAudioFile(wavBuffer, {
        maxDuration: 120, chunkDuration: 0,
        algorithm: 1, rawOutput: false, overlap: false,
      })) {
        fingerprint = fp
        break
      }
    } catch (e) {
      dbg(`FAIL WASM: ${String(e)}`)
      return null
    }

    if (!fingerprint) { dbg('FAIL: empty fingerprint'); return null }
    const duration = Math.round(samples[0]!.length / sampleRate)
    dbg(`OK: fp len=${fingerprint.length} duration=${duration}s`)

    // ── Step 4: AcoustID lookup ───────────────────────────────────────────────
    dbg('Step 4: querying AcoustID...')
    return await this.queryAcoustId(fingerprint, duration)
  }

  // ── PCM capture via ScriptProcessorNode ──────────────────────────────────
  private capturePcm(): Promise<{
    samples: Float32Array[]
    sampleRate: number
    channels: number
  } | null> {
    return new Promise((resolve) => {
      const audioService = AudioService.getInstance()
      const visualizer   = audioService.getVisualizer()
      const analyser     = visualizer.sharedAnalyser

      if (!analyser) {
        dbg('FAIL: no analyser (audio not playing?)')
        resolve(null)
        return
      }

      const ctx      = analyser.context as AudioContext
      const sr       = ctx.sampleRate
      const numCh    = 2
      const bufSize  = 4096
      const needed   = CAPTURE_SECONDS * sr
      const recorded: Float32Array[][] = [[], []]

      dbg(`capturing ${CAPTURE_SECONDS}s @ ${sr}Hz...`)

      // ScriptProcessorNode taps the audio stream without interrupting playback
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const proc = ctx.createScriptProcessor(bufSize, numCh, numCh)
      let collected = 0
      let done = false

      // Safety timeout — if we never get enough samples, resolve with what we have
      const timeout = setTimeout(() => {
        if (!done) {
          done = true
          proc.disconnect()
          analyser.disconnect(proc)
          dbg(`timeout: collected ${collected} samples`)
          resolve(collected > sr * 5 ? buildResult() : null)
        }
      }, (CAPTURE_SECONDS + 5) * 1000)

      function buildResult() {
        const out: Float32Array[] = []
        for (let c = 0; c < numCh; c++) {
          const total = recorded[c]!.reduce((s, a) => s + a.length, 0)
          const merged = new Float32Array(total)
          let off = 0
          for (const chunk of recorded[c]!) {
            merged.set(chunk, off)
            off += chunk.length
          }
          out.push(merged)
        }
        return { samples: out, sampleRate: sr, channels: numCh }
      }

      proc.onaudioprocess = (e) => {
        if (done) return
        for (let c = 0; c < numCh; c++) {
          const data = e.inputBuffer.getChannelData(c)
          recorded[c]!.push(new Float32Array(data))
        }
        collected += bufSize
        if (collected >= needed) {
          done = true
          clearTimeout(timeout)
          proc.disconnect()
          try { analyser.disconnect(proc) } catch { /* already disconnected */ }
          resolve(buildResult())
        }
      }

      // Connect: analyser → scriptProcessor → (no output needed)
      analyser.connect(proc)
      proc.connect(ctx.destination) // must connect to destination or it won't fire
    })
  }

  // ── WAV encoder ──────────────────────────────────────────────────────────
  private pcmToWav(samples: Float32Array[], sampleRate: number, channels: number): ArrayBuffer {
    const len  = samples[0]!.length
    const data = 44 + len * channels * 2
    const wav  = new ArrayBuffer(data)
    const v    = new DataView(wav)
    const ws   = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }

    ws(0, 'RIFF'); v.setUint32(4, 36 + len * channels * 2, true); ws(8, 'WAVE')
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
    v.setUint16(22, channels, true); v.setUint32(24, sampleRate, true)
    v.setUint32(28, sampleRate * channels * 2, true)
    v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true)
    ws(36, 'data'); v.setUint32(40, len * channels * 2, true)

    let off = 44
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < channels; c++) {
        const s = samples[c]![i] ?? 0
        v.setInt16(off, Math.max(-1, Math.min(1, s)) * 32767, true)
        off += 2
      }
    }
    return wav
  }

  // ── AcoustID ──────────────────────────────────────────────────────────────
  private async queryAcoustId(fingerprint: string, duration: number): Promise<RecognitionResult | null> {
    const body = [
      `client=${encodeURIComponent(ACOUSTID_CLIENT_KEY)}`,
      `fingerprint=${encodeURIComponent(fingerprint)}`,
      `duration=${duration}`,
      `meta=recordings+releasegroups+compress`,
      `format=json`,
    ].join('&')

    let resp: Response
    try {
      resp = await fetch(ACOUSTID_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
    } catch (e) {
      dbg(`AcoustID fetch error: ${String(e)}`)
      return null
    }

    if (!resp.ok) { dbg(`AcoustID HTTP ${resp.status}`); return null }

    let data: AcoustIdResponse
    try { data = await resp.json() as AcoustIdResponse }
    catch (e) { dbg(`AcoustID JSON error: ${String(e)}`); return null }

    dbg(`AcoustID status=${data.status} results=${data.results?.length ?? 0}`)
    if (data.error) dbg(`AcoustID error: ${data.error.message}`)
    if (data.status !== 'ok' || !data.results?.length) return null

    data.results.slice(0, 3).forEach((r, i) =>
      dbg(`  [${i}] score=${r.score.toFixed(3)} recs=${r.recordings?.length ?? 0}`)
    )

    const best = data.results
      .filter(r => r.score >= 0.3 && r.recordings?.length)
      .sort((a, b) => b.score - a.score)[0]

    if (!best?.recordings?.length) {
      dbg(`no match >= 0.3 (top=${data.results[0]?.score.toFixed(3)})`)
      return null
    }

    const rec   = best.recordings.find(r => r.title && r.artists?.length) ?? best.recordings[0]!
    const title  = rec.title?.trim()
    const artist = rec.artists?.[0]?.name?.trim()
    if (!title || !artist) { dbg('rec missing title/artist'); return null }

    const rg          = rec.releasegroups?.[0]
    const album       = rg?.title?.trim()
    const releaseDate = rg?.releases?.[0]?.date?.slice(0, 4)

    dbg(`MATCH: "${title}" — ${artist}`)
    return { title, artist, album, releaseDate }
  }
}
