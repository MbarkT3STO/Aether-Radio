/**
 * SongRecognitionService — identifies the currently playing song.
 * Delegates all network work to the main process via IPC so there
 * are no CORS restrictions.
 */

export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  spotifyUrl?: string
  appleMusicUrl?: string
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
