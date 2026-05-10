import { EventBus } from '../store/EventBus'

/**
 * CrossfadeService — smooth volume transitions when switching stations.
 * Uses Web Audio GainNode to fade out the current stream and fade in the new one.
 * Duration is configurable (0 = instant switch, no crossfade).
 */
export class CrossfadeService {
  private static instance: CrossfadeService
  private eventBus = EventBus.getInstance()

  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private _duration = 0 // seconds
  private fadeOutTimer: ReturnType<typeof setTimeout> | null = null

  private constructor() {}

  static getInstance(): CrossfadeService {
    if (!CrossfadeService.instance) {
      CrossfadeService.instance = new CrossfadeService()
    }
    return CrossfadeService.instance
  }

  get duration(): number { return this._duration }

  /**
   * Initialize with the AudioContext. Creates a GainNode that sits
   * at the end of the audio chain (after EQ, before destination).
   */
  initialize(audioContext: AudioContext): GainNode {
    this.audioContext = audioContext
    this.gainNode = audioContext.createGain()
    this.gainNode.gain.value = 1.0
    return this.gainNode
  }

  getGainNode(): GainNode | null {
    return this.gainNode
  }

  setDuration(seconds: number): void {
    this._duration = Math.max(0, Math.min(10, seconds))
    this.eventBus.emit('player:crossfade-changed', { duration: this._duration })
  }

  /**
   * Fade out the current audio. Returns a promise that resolves
   * when the fade is complete (or immediately if duration is 0).
   */
  async fadeOut(): Promise<void> {
    if (!this.gainNode || !this.audioContext || this._duration === 0) {
      return
    }

    const now = this.audioContext.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
    this.gainNode.gain.linearRampToValueAtTime(0, now + this._duration)

    return new Promise(resolve => {
      this.fadeOutTimer = setTimeout(resolve, this._duration * 1000)
    })
  }

  /**
   * Fade in the new audio. Call after setting the new source.
   */
  fadeIn(): void {
    if (!this.gainNode || !this.audioContext || this._duration === 0) {
      // Ensure gain is at 1 for instant switch
      if (this.gainNode) this.gainNode.gain.value = 1.0
      return
    }

    const now = this.audioContext.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(0, now)
    this.gainNode.gain.linearRampToValueAtTime(1.0, now + this._duration)
  }

  /**
   * Reset gain to 1 immediately (e.g., on stop).
   */
  reset(): void {
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer)
      this.fadeOutTimer = null
    }
    if (this.gainNode) {
      if (this.audioContext) {
        const now = this.audioContext.currentTime
        this.gainNode.gain.cancelScheduledValues(now)
        this.gainNode.gain.setValueAtTime(1.0, now)
      } else {
        this.gainNode.gain.value = 1.0
      }
    }
  }
}
