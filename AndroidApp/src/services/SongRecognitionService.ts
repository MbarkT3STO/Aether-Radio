/**
 * SongRecognitionService — identifies the currently playing song.
 *
 * Pipeline:
 *  1. Fetch ~20 s of raw audio bytes from the live stream
 *  2. Feed the ArrayBuffer to @unimusic/chromaprint (Chromaprint compiled to WASM)
 *     which decodes the audio via Web Audio API and generates an AcoustID fingerprint
 *  3. POST the fingerprint + duration to the AcoustID lookup API
 *  4. Return the best-scoring recording's title / artist / album
 *
 * Completely free, no rate-limit for reasonable usage, no API key cost.
 * You must register a free application at https://acoustid.org/new-application
 * to get your own client key (replace ACOUSTID_CLIENT_KEY below).
 */

import { processAudioFile } from '@unimusic/chromaprint'

// ── Configuration ─────────────────────────────────────────────────────────────
// Register your free app at https://acoustid.org/new-application
const ACOUSTID_CLIENT_KEY = 'hTUfbqGtFY'
const ACOUSTID_API        = 'https://api.acoustid.org/v2/lookup'

// How many bytes to fetch from the stream (~20 s at 128 kbps = ~320 KB)
const FETCH_BYTES      = 320 * 1024
const FETCH_TIMEOUT_MS = 25_000

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
    // 1. Fetch a chunk of the live stream
    const audioBuffer = await this.fetchStreamChunk(streamUrl)
    if (!audioBuffer || audioBuffer.byteLength < 8192) return null

    // 2. Generate Chromaprint fingerprint via WASM
    //    processAudioFile decodes the audio internally using Web Audio API
    let fingerprint: string | null = null
    let duration = 0

    try {
      for await (const fp of processAudioFile(audioBuffer, {
        maxDuration:  120,
        chunkDuration: 0,
        algorithm:    1, // ChromaprintAlgorithm.Default = Test2 = 1
        rawOutput:    false,
        overlap:      false,
      })) {
        fingerprint = fp
        break // we only need the first (and only) fingerprint
      }
    } catch (e) {
      console.warn('[Recognition] Chromaprint error:', e)
      return null
    }

    if (!fingerprint) return null

    // Estimate duration from bytes fetched (assume 128 kbps = 16 KB/s)
    duration = Math.round(audioBuffer.byteLength / (128 * 1024 / 8))
    duration = Math.max(10, Math.min(120, duration))

    // 3. Query AcoustID
    return await this.queryAcoustId(fingerprint, duration)
  }

  private async fetchStreamChunk(streamUrl: string): Promise<ArrayBuffer | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(streamUrl, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        signal: controller.signal,
      })

      clearTimeout(timer)
      if (!response.ok || !response.body) return null

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

      // Merge into a single ArrayBuffer
      const merged = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      return merged.buffer

    } catch {
      clearTimeout(timer)
      return null
    }
  }

  private async queryAcoustId(fingerprint: string, duration: number): Promise<RecognitionResult | null> {
    const body = new URLSearchParams({
      client:      ACOUSTID_CLIENT_KEY,
      fingerprint,
      duration:    String(duration),
      meta:        'recordings+releasegroups+compress',
      format:      'json',
    })

    let response: Response
    try {
      response = await fetch(ACOUSTID_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
      })
    } catch {
      return null
    }

    if (!response.ok) return null

    let data: AcoustIdResponse
    try {
      data = await response.json() as AcoustIdResponse
    } catch {
      return null
    }

    if (data.status !== 'ok' || !data.results?.length) return null

    // Pick the result with the highest score
    const best = data.results
      .filter(r => r.score > 0.5 && r.recordings?.length)
      .sort((a, b) => b.score - a.score)[0]

    if (!best?.recordings?.length) return null

    const rec = best.recordings[0]!
    const title  = rec.title?.trim()
    const artist = rec.artists?.[0]?.name?.trim()

    if (!title || !artist) return null

    // Album + release year from the first release group
    const rg    = rec.releasegroups?.[0]
    const album = rg?.title?.trim()
    const releaseDate = rg?.releases?.[0]?.date?.slice(0, 4)

    return { title, artist, album, releaseDate }
  }
}
