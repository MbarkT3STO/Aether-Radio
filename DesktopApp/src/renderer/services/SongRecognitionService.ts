/**
 * SongRecognitionService — identifies the currently playing song.
 * Delegates all work to the main process via IPC where:
 *  1. Stream bytes are fetched via Node.js http/https
 *  2. Audio fingerprint is generated via shazamio-core WASM (recognizeBytes)
 *  3. Shazam API is queried via Node.js https (not Electron's fetch)
 *
 * The main process handles everything because:
 * - No CORS restrictions in Node.js
 * - Radio streams don't send CORS headers, so the renderer's Web Audio graph
 *   outputs silence when trying to capture PCM from a cross-origin source
 * - Node.js https module is more reliable cross-platform than Electron's fetch
 */

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
      const response = await window.electronAPI.recognizeSong(streamUrl)
      if (!response.success || !response.data) return null
      return response.data
    } catch {
      return null
    } finally {
      this._busy = false
    }
  }
}
