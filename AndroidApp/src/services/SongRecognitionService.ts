/**
 * SongRecognitionService — identifies the currently playing song via
 * Chromaprint (WASM) + AcoustID lookup API.
 *
 * Debug overlay is shown on-device so you can see exactly which step fails
 * without needing a USB-connected computer.
 */

const ACOUSTID_CLIENT_KEY = 'hTUfbqGtFY'
const ACOUSTID_API        = 'https://api.acoustid.org/v2/lookup'

// ~25 s at 128 kbps = 400 KB
const FETCH_BYTES      = 400 * 1024
const FETCH_TIMEOUT_MS = 30_000

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

  // Show on-screen so we can see it on the device without USB debugging
  let el = document.getElementById('rcm-debug-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'rcm-debug-overlay'
    Object.assign(el.style, {
      position:   'fixed',
      bottom:     '80px',
      left:       '10px',
      right:      '10px',
      background: 'rgba(0,0,0,0.85)',
      color:      '#0f0',
      fontSize:   '11px',
      fontFamily: 'monospace',
      padding:    '8px',
      borderRadius: '6px',
      zIndex:     '99999',
      maxHeight:  '220px',
      overflowY:  'auto',
      pointerEvents: 'none',
    })
    document.body.appendChild(el)
    // Auto-remove after 30 s
    setTimeout(() => el?.remove(), 30_000)
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

  async recognize(streamUrl: string): Promise<RecognitionResult | null> {
    if (this._busy) return null
    this._busy = true
    // Clear old overlay
    document.getElementById('rcm-debug-overlay')?.remove()
    try {
      return await this._recognize(streamUrl)
    } catch (e) {
      dbg(`UNCAUGHT: ${String(e)}`)
      return null
    } finally {
      this._busy = false
    }
  }

  private async _recognize(streamUrl: string): Promise<RecognitionResult | null> {
    dbg(`URL: ${streamUrl.slice(0, 60)}`)

    // ── Step 1: Fetch stream bytes ────────────────────────────────────────────
    dbg('Step 1: fetching stream...')
    const rawBytes = await this.fetchStreamChunk(streamUrl)
    if (!rawBytes) { dbg('FAIL: fetch returned null'); return null }
    if (rawBytes.byteLength < 16_384) {
      dbg(`FAIL: too few bytes: ${rawBytes.byteLength}`)
      return null
    }
    dbg(`OK: fetched ${rawBytes.byteLength} bytes`)

    // ── Step 2: Decode audio ──────────────────────────────────────────────────
    dbg('Step 2: decoding audio...')
    let audioBuffer: AudioBuffer | null = null
    try {
      const ctx = new AudioContext()
      audioBuffer = await ctx.decodeAudioData(rawBytes.slice(0)) // slice = copy
      ctx.close().catch(() => {})
    } catch (e) {
      dbg(`FAIL decode: ${String(e)}`)
      return null
    }
    dbg(`OK: ${audioBuffer.duration.toFixed(1)}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`)

    // ── Step 3: Build WAV + fingerprint ───────────────────────────────────────
    dbg('Step 3: building WAV...')
    const wavBuffer = this.audioBufferToWav(audioBuffer)
    dbg(`OK: WAV ${wavBuffer.byteLength} bytes`)

    dbg('Step 3b: generating fingerprint (WASM)...')
    let fingerprint: string | null = null
    try {
      const { processAudioFile } = await import('@unimusic/chromaprint')
      for await (const fp of processAudioFile(wavBuffer, {
        maxDuration:   120,
        chunkDuration: 0,
        algorithm:     1,
        rawOutput:     false,
        overlap:       false,
      })) {
        fingerprint = fp
        break
      }
    } catch (e) {
      dbg(`FAIL WASM: ${String(e)}`)
      return null
    }

    if (!fingerprint) { dbg('FAIL: empty fingerprint'); return null }
    dbg(`OK: fp len=${fingerprint.length}`)

    const duration = Math.max(10, Math.round(audioBuffer.duration))
    dbg(`duration=${duration}s`)

    // ── Step 4: AcoustID lookup ───────────────────────────────────────────────
    dbg('Step 4: querying AcoustID...')
    const result = await this.queryAcoustId(fingerprint, duration)
    if (!result) { dbg('FAIL: no match from AcoustID'); return null }
    dbg(`MATCH: "${result.title}" — ${result.artist}`)
    return result
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  private async fetchStreamChunk(streamUrl: string): Promise<ArrayBuffer | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(streamUrl, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!response.ok || !response.body) {
        dbg(`fetch HTTP ${response.status}`)
        return null
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      try {
        while (total < FETCH_BYTES) {
          const { done, value } = await reader.read()
          if (done || !value) break
          chunks.push(value)
          total += value.length
        }
      } finally {
        reader.cancel().catch(() => {})
      }

      if (total === 0) return null
      const merged = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { merged.set(c, off); off += c.length }
      return merged.buffer
    } catch (e) {
      clearTimeout(timer)
      dbg(`fetch error: ${String(e)}`)
      return null
    }
  }

  // ── WAV encoder ──────────────────────────────────────────────────────────
  private audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
    const ch   = Math.min(buf.numberOfChannels, 2)
    const sr   = buf.sampleRate
    const len  = buf.length
    const data = 44 + len * ch * 2
    const wav  = new ArrayBuffer(data)
    const v    = new DataView(wav)
    const ws   = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    ws(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE')
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
    v.setUint16(22, ch, true); v.setUint32(24, sr, true)
    v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true)
    ws(36, 'data'); v.setUint32(40, len * ch * 2, true)
    let off = 44
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < ch; c++) {
        const s = buf.getChannelData(c)[i] ?? 0
        v.setInt16(off, Math.max(-1, Math.min(1, s)) * 32767, true)
        off += 2
      }
    }
    return wav
  }

  // ── AcoustID ──────────────────────────────────────────────────────────────
  private async queryAcoustId(
    fingerprint: string,
    duration: number
  ): Promise<RecognitionResult | null> {
    // Build body manually — URLSearchParams would percent-encode the '+' in meta
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
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
    } catch (e) {
      dbg(`AcoustID fetch error: ${String(e)}`)
      return null
    }

    if (!resp.ok) {
      dbg(`AcoustID HTTP ${resp.status}`)
      return null
    }

    let data: AcoustIdResponse
    try {
      data = await resp.json() as AcoustIdResponse
    } catch (e) {
      dbg(`AcoustID JSON error: ${String(e)}`)
      return null
    }

    dbg(`AcoustID status=${data.status} results=${data.results?.length ?? 0}`)
    if (data.error) dbg(`AcoustID error msg: ${data.error.message}`)

    if (data.status !== 'ok' || !data.results?.length) return null

    // Log all scores so we can tune the threshold
    data.results.slice(0, 3).forEach((r, i) => {
      dbg(`  result[${i}] score=${r.score.toFixed(3)} recs=${r.recordings?.length ?? 0}`)
    })

    const best = data.results
      .filter(r => r.score >= 0.3 && r.recordings?.length)
      .sort((a, b) => b.score - a.score)[0]

    if (!best?.recordings?.length) {
      dbg(`no result >= 0.3 (top=${data.results[0]?.score.toFixed(3)})`)
      return null
    }

    const rec     = best.recordings.find(r => r.title && r.artists?.length) ?? best.recordings[0]!
    const title   = rec.title?.trim()
    const artist  = rec.artists?.[0]?.name?.trim()
    if (!title || !artist) { dbg('rec missing title/artist'); return null }

    const rg          = rec.releasegroups?.[0]
    const album       = rg?.title?.trim()
    const releaseDate = rg?.releases?.[0]?.date?.slice(0, 4)

    return { title, artist, album, releaseDate }
  }
}
