import { EventBus } from '../store/EventBus'

/**
 * BufferHealthService — monitors the HTMLAudioElement's buffer state
 * and emits periodic health updates so the UI can show a buffer indicator.
 *
 * Buffer health is expressed as a percentage (0–100):
 *   100 = healthy (buffered well ahead of playback)
 *   0   = empty (stalling imminent)
 */
export class BufferHealthService {
  private static instance: BufferHealthService
  private eventBus = EventBus.getInstance()

  private audio: HTMLAudioElement | null = null
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private _percent = 0
  private _isStalling = false

  private constructor() {}

  static getInstance(): BufferHealthService {
    if (!BufferHealthService.instance) {
      BufferHealthService.instance = new BufferHealthService()
    }
    return BufferHealthService.instance
  }

  get percent(): number { return this._percent }
  get isStalling(): boolean { return this._isStalling }

  /**
   * Start monitoring the given audio element.
   */
  attach(audio: HTMLAudioElement): void {
    this.audio = audio
    this.startPolling()

    audio.addEventListener('waiting', this.onWaiting)
    audio.addEventListener('playing', this.onPlaying)
    audio.addEventListener('canplay', this.onPlaying)
  }

  /**
   * Stop monitoring.
   */
  detach(): void {
    this.stopPolling()
    if (this.audio) {
      this.audio.removeEventListener('waiting', this.onWaiting)
      this.audio.removeEventListener('playing', this.onPlaying)
      this.audio.removeEventListener('canplay', this.onPlaying)
    }
    this.audio = null
    this._percent = 0
    this._isStalling = false
  }

  private onWaiting = (): void => {
    this._isStalling = true
    this._percent = 0
    this.eventBus.emit('player:buffer-health', { percent: 0 })
  }

  private onPlaying = (): void => {
    this._isStalling = false
  }

  private startPolling(): void {
    this.stopPolling()
    // Poll every 2000ms for buffer state — sufficient for UI indicator updates.
    // Stalling is detected instantly via the 'waiting' event listener, so
    // aggressive polling is unnecessary and wastes CPU cycles.
    this.pollInterval = setInterval(() => this.checkBuffer(), 2000)
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private checkBuffer(): void {
    if (!this.audio || this.audio.paused) return

    const buffered = this.audio.buffered
    const currentTime = this.audio.currentTime

    if (buffered.length === 0) {
      this._percent = 0
      this.eventBus.emit('player:buffer-health', { percent: 0 })
      return
    }

    // Find the buffer range that contains the current playback position
    let bufferedAhead = 0
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
        bufferedAhead = buffered.end(i) - currentTime
        break
      }
    }

    // Map buffered seconds to a percentage (5+ seconds = 100%)
    const maxBufferSeconds = 5
    const percent = Math.min(100, Math.round((bufferedAhead / maxBufferSeconds) * 100))

    if (percent !== this._percent) {
      this._percent = percent
      this._isStalling = percent === 0 && !this.audio.paused
      this.eventBus.emit('player:buffer-health', { percent })
    }
  }
}
