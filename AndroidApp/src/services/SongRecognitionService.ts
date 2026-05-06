/**
 * SongRecognitionService — identifies the currently playing song.
 *
 * Pipeline:
 *  1. Fetch ~25 s of raw audio bytes from the live stream
 *  2. Decode the bytes into PCM using the app's existing AudioContext
 *     (avoids the "already connected" conflict with the playback AudioContext)
 *  3. Generate a Chromaprint fingerprint by calling the WASM C API directly
 *     with the decoded PCM samples — bypassing @unimusic/chromaprint's
 *     internal AudioContext creation which conflicts on Android WebView
 *  4. POST fingerprint + real duration to AcoustID lookup API
 *  5. Return the best-scoring recording's title / artist / album
 */

// ── Configuration ─────────────────────────────────────────────────────────────
const ACOUSTID_CLIENT_KEY = 'hTUfbqGtFY'
const ACOUSTID_API        = 'https://api.acoustid.org/v2/lookup'

// ~25 s at 128 kbps
const FETCH_BYTES      = 400 * 1024
const FETCH_TIMEOUT_MS = 30_000

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  coverArt?: string
}

interface AcoustIdRecording {
  title?: string
  duration?: number
  artists?: { name: string }[]
  releasegroups?: { title?: string; type?: string; releases?: { date?: string }[] }[]
}

interface AcoustIdResult {
  score: number
  recordings?: AcoustIdRecording[]
}

interface AcoustIdResponse {
  status: string
  results?: AcoustIdResult[]
}

// ── Service ───────────────────────────────────────────────────────────────────
export class SongRecognitionService {
  private static instance: SongRecognitionService
  private _busy = false

  // Reuse a single offline AudioContext for decoding — never connected to speakers
  private _decodeCtx: OfflineAudioContext | null = null

  static getInstance(): SongRecognitionService {
    if (!this.instance) this.instance = new SongRecognitionService()
    return this.instance
  }

  get busy(): boolean { return this._busy }

  async recognize(streamUrl: string): Promise<RecognitionResult | null> {
    if (this._busy) return null
    this._busy = true
    try {
      return await this._recognize(streamUrl)
    } catch (e) {
      console.warn('[Recognition] error:', e)
      return null
    } finally {
      this._busy = false
    }
  }

  private async _recognize(streamUrl: string): Promise<RecognitionResult | null> {
    // Step 1 — fetch raw stream bytes
    const rawBytes = await this.fetchStreamChunk(streamUrl)
    if (!rawBytes || rawBytes.byteLength < 16_384) {
      console.warn('[Recognition] fetch returned too few bytes:', rawBytes?.byteLength)
      return null
    }
    console.log('[Recognition] fetched bytes:', rawBytes.byteLength)

    // Step 2 — decode to PCM using a standard AudioContext
    // We use a regular AudioContext (not OfflineAudioContext) because
    // decodeAudioData works on both, but we never connect it to any output
    let audioBuffer: AudioBuffer | null = null
    try {
      // Create a fresh AudioContext just for decoding — separate from the
      // playback AudioContext so there's no conflict
      const ctx = new AudioContext()
      audioBuffer = await ctx.decodeAudioData(rawBytes)
      // Close immediately — we only needed it for decoding
      ctx.close().catch(() => {})
    } catch (e) {
      console.warn('[Recognition] decodeAudioData failed:', e)
      return null
    }

    if (!audioBuffer) return null
    console.log('[Recognition] decoded duration:', audioBuffer.duration, 's, channels:', audioBuffer.numberOfChannels, 'sampleRate:', audioBuffer.sampleRate)

    // Step 3 — generate Chromaprint fingerprint
    const result = await this.generateFingerprint(audioBuffer)
    if (!result) {
      console.warn('[Recognition] fingerprint generation failed')
      return null
    }

    const { fingerprint, duration } = result
    console.log('[Recognition] fingerprint length:', fingerprint.length, 'duration:', duration)

    // Step 4 — query AcoustID
    return await this.queryAcoustId(fingerprint, duration)
  }

  private async fetchStreamChunk(streamUrl: string): Promise<ArrayBuffer | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(streamUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok || !response.body) {
        console.warn('[Recognition] fetch failed, status:', response.status)
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
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      return merged.buffer

    } catch (e) {
      clearTimeout(timer)
      console.warn('[Recognition] fetch error:', e)
      return null
    }
  }

  private async generateFingerprint(
    audioBuffer: AudioBuffer
  ): Promise<{ fingerprint: string; duration: number } | null> {
    try {
      // Dynamically import the WASM module
      const { processAudioFile } = await import('@unimusic/chromaprint')

      // Re-encode the AudioBuffer back to a WAV ArrayBuffer so processAudioFile
      // can decode it cleanly (it calls decodeAudioData internally on the bytes)
      const wavBuffer = this.audioBufferToWav(audioBuffer)

      let fingerprint: string | null = null
      for await (const fp of processAudioFile(wavBuffer, {
        maxDuration:   120,
        chunkDuration: 0,
        algorithm:     1,  // ChromaprintAlgorithm.Default
        rawOutput:     false,
        overlap:       false,
      })) {
        fingerprint = fp
        break
      }

      if (!fingerprint) return null

      // Use the real decoded duration — critical for AcoustID matching
      const duration = Math.round(audioBuffer.duration)
      return { fingerprint, duration }

    } catch (e) {
      console.warn('[Recognition] WASM fingerprint error:', e)
      return null
    }
  }

  /**
   * Encode an AudioBuffer as a standard PCM WAV file (ArrayBuffer).
   * This gives processAudioFile a clean, complete file it can decode reliably.
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = Math.min(buffer.numberOfChannels, 2) // max stereo
    const sampleRate  = buffer.sampleRate
    const numSamples  = buffer.length
    const bytesPerSample = 2 // 16-bit PCM
    const dataSize    = numSamples * numChannels * bytesPerSample
    const wavSize     = 44 + dataSize

    const wav    = new ArrayBuffer(wavSize)
    const view   = new DataView(wav)

    // RIFF header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4,  36 + dataSize, true)
    this.writeString(view, 8, 'WAVE')
    // fmt chunk
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)                          // chunk size
    view.setUint16(20, 1,  true)                          // PCM format
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true) // byte rate
    view.setUint16(32, numChannels * bytesPerSample, true) // block align
    view.setUint16(34, 16, true)                          // bits per sample
    // data chunk
    this.writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)

    // Interleave channels as 16-bit signed PCM
    let offset = 44
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = buffer.getChannelData(ch)[i] ?? 0
        const clamped = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, clamped * 32767, true)
        offset += 2
      }
    }

    return wav
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  private async queryAcoustId(
    fingerprint: string,
    duration: number
  ): Promise<RecognitionResult | null> {
    // Build POST body manually to avoid URLSearchParams double-encoding the
    // meta value — spaces must be literal '+' in the query string
    const params = [
      `client=${encodeURIComponent(ACOUSTID_CLIENT_KEY)}`,
      `fingerprint=${encodeURIComponent(fingerprint)}`,
      `duration=${duration}`,
      `meta=recordings+releasegroups+compress`,
      `format=json`,
    ].join('&')

    console.log('[Recognition] querying AcoustID, duration:', duration)

    let response: Response
    try {
      response = await fetch(ACOUSTID_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      })
    } catch (e) {
      console.warn('[Recognition] AcoustID fetch error:', e)
      return null
    }

    if (!response.ok) {
      console.warn('[Recognition] AcoustID HTTP error:', response.status)
      return null
    }

    let data: AcoustIdResponse
    try {
      data = await response.json() as AcoustIdResponse
    } catch (e) {
      console.warn('[Recognition] AcoustID JSON parse error:', e)
      return null
    }

    console.log('[Recognition] AcoustID status:', data.status, 'results:', data.results?.length)

    if (data.status !== 'ok' || !data.results?.length) return null

    // Pick the highest-scoring result that has recording metadata
    // Use a low threshold (0.3) — short clips often score 0.3–0.6
    const best = data.results
      .filter(r => r.score >= 0.3 && r.recordings?.length)
      .sort((a, b) => b.score - a.score)[0]

    if (!best?.recordings?.length) {
      console.warn('[Recognition] no results above threshold. Top score:', data.results[0]?.score)
      return null
    }

    console.log('[Recognition] best score:', best.score)

    // Pick the recording with the most metadata
    const rec = best.recordings.find(r => r.title && r.artists?.length) ?? best.recordings[0]!
    const title  = rec.title?.trim()
    const artist = rec.artists?.[0]?.name?.trim()

    if (!title || !artist) return null

    const rg          = rec.releasegroups?.[0]
    const album       = rg?.title?.trim()
    const releaseDate = rg?.releases?.[0]?.date?.slice(0, 4)

    return { title, artist, album, releaseDate }
  }
}
