/**
 * SongRecognitionService — identifies the currently playing song via ICY stream metadata.
 *
 * Fetches a raw byte chunk from the live stream, parses the Shoutcast/Icecast
 * ICY metadata block (StreamTitle field), and returns the track info.
 *
 * No API key, no rate limit, no external service — 100% free and unlimited.
 */

export interface RecognitionResult {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  coverArt?: string
}

const FETCH_TIMEOUT_MS = 12_000
// How many bytes to read before giving up looking for the metadata block
const MAX_READ_BYTES = 256 * 1024 // 256 KB

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
      return await this.fetchIcyMetadata(streamUrl)
    } catch {
      return null
    } finally {
      this._busy = false
    }
  }

  private async fetchIcyMetadata(streamUrl: string): Promise<RecognitionResult | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(streamUrl, {
        headers: {
          'Icy-MetaData': '1',
          // Prevent caching so we always get a fresh stream connection
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok || !response.body) return null

      // Try to get the ICY metadata interval from response headers
      const icyMetaIntHeader = response.headers.get('icy-metaint')
      const icyMetaInt = icyMetaIntHeader ? parseInt(icyMetaIntHeader, 10) : 0

      // If no icy-metaint, try to get station name from icy-name header as fallback
      if (!icyMetaInt || isNaN(icyMetaInt) || icyMetaInt <= 0) {
        const icyName = response.headers.get('icy-name')
        response.body.cancel().catch(() => {})
        if (icyName) {
          return this.parseStreamTitle(icyName)
        }
        return null
      }

      // Read enough bytes to reach the first metadata block
      // Layout: [icyMetaInt audio bytes][1 byte length][length*16 metadata bytes]
      const needed = icyMetaInt + 1 + 255 * 16 // worst case metadata size
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let totalBytes = 0

      try {
        while (totalBytes < Math.min(needed, MAX_READ_BYTES)) {
          const { done, value } = await reader.read()
          if (done || !value) break
          chunks.push(value)
          totalBytes += value.length
        }
      } finally {
        reader.cancel().catch(() => {})
      }

      if (totalBytes < icyMetaInt + 1) return null

      // Concatenate all chunks into one buffer
      const buffer = new Uint8Array(totalBytes)
      let offset = 0
      for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.length
      }

      // The byte at position icyMetaInt is the metadata length indicator
      // Actual metadata length = this byte * 16
      const metaLengthByte = buffer[icyMetaInt]
      if (metaLengthByte === undefined || metaLengthByte === 0) return null

      const metaLength = metaLengthByte * 16
      const metaStart = icyMetaInt + 1
      const metaEnd = metaStart + metaLength

      if (metaEnd > totalBytes) return null

      const metaBytes = buffer.slice(metaStart, metaEnd)
      const metaString = new TextDecoder('utf-8', { fatal: false }).decode(metaBytes)

      // Parse StreamTitle='Artist - Song Title';
      const match = metaString.match(/StreamTitle='([^']*)'/i)
      const streamTitle = match?.[1]?.trim()

      if (!streamTitle) return null
      return this.parseStreamTitle(streamTitle)

    } catch (err) {
      clearTimeout(timer)
      // AbortError = timeout, just return null
      return null
    }
  }

  /**
   * Parses a StreamTitle string into a RecognitionResult.
   * Most stations use "Artist - Title" format, some use "Title - Artist" or just "Title".
   */
  private parseStreamTitle(raw: string): RecognitionResult | null {
    // Remove null bytes and trim
    const cleaned = raw.replace(/\0/g, '').trim()
    if (!cleaned) return null

    // Common separator patterns: " - ", " – ", " | "
    const separators = [' - ', ' – ', ' | ', ' / ']
    for (const sep of separators) {
      const idx = cleaned.indexOf(sep)
      if (idx > 0 && idx < cleaned.length - sep.length) {
        const left  = cleaned.slice(0, idx).trim()
        const right = cleaned.slice(idx + sep.length).trim()
        if (left && right) {
          return { artist: left, title: right }
        }
      }
    }

    // No separator found — treat the whole string as the title
    return { artist: '', title: cleaned }
  }
}
