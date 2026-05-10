/**
 * StreamProbeService — validates that a stream URL is alive before committing
 * to full playback. Only rejects streams that produce a definitive error
 * (network failure, 404, unsupported format). Slow streams are allowed through
 * since many radio stations legitimately take 4-8 seconds to respond.
 */
export class StreamProbeService {
  private static instance: StreamProbeService

  private constructor() {}

  static getInstance(): StreamProbeService {
    if (!StreamProbeService.instance) {
      StreamProbeService.instance = new StreamProbeService()
    }
    return StreamProbeService.instance
  }

  /**
   * Probe a stream URL. Only returns alive:false if the stream produces
   * a definitive error within the timeout window. If the timeout expires
   * without an error, we assume the stream is slow but alive and let
   * the real player handle it.
   */
  async probe(url: string, timeoutMs = 6000): Promise<{ alive: boolean; error?: string }> {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.preload = 'metadata'
      let settled = false

      const cleanup = (): void => {
        audio.removeEventListener('canplay', onSuccess)
        audio.removeEventListener('loadedmetadata', onSuccess)
        audio.removeEventListener('loadeddata', onSuccess)
        audio.removeEventListener('progress', onProgress)
        audio.removeEventListener('error', onError)
        audio.src = ''
        audio.load()
      }

      const settle = (result: { alive: boolean; error?: string }): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      const onSuccess = (): void => {
        settle({ alive: true })
      }

      // Any data arriving means the stream is alive
      const onProgress = (): void => {
        if (audio.buffered.length > 0) {
          settle({ alive: true })
        }
      }

      const onError = (): void => {
        const code = audio.error?.code
        let error = 'Stream unavailable'
        if (code === MediaError.MEDIA_ERR_NETWORK) {
          error = 'Network error — station may be offline'
        } else if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          error = 'Stream format not supported'
        } else if (code === MediaError.MEDIA_ERR_DECODE) {
          error = 'Audio decode error'
        }
        settle({ alive: false, error })
      }

      audio.addEventListener('canplay', onSuccess)
      audio.addEventListener('loadedmetadata', onSuccess)
      audio.addEventListener('loadeddata', onSuccess)
      audio.addEventListener('progress', onProgress)
      audio.addEventListener('error', onError)

      // Timeout — if no ERROR has occurred by now, assume the stream is
      // alive but slow. Let the real player handle the connection.
      setTimeout(() => {
        settle({ alive: true })
      }, timeoutMs)

      audio.src = url
      audio.load()
    })
  }
}
