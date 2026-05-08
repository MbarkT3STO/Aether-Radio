import type { RadioStation } from '../domain/entities/RadioStation'
import { EventBus } from './EventBus'

interface SleepTimer {
  endsAt: number
  timeoutId: ReturnType<typeof setTimeout>
}

export class PlayerStore {
  private static instance: PlayerStore
  private eventBus = EventBus.getInstance()

  private _currentStation: RadioStation | null = null
  private _isPlaying = false
  private _volume = 0.8
  private _volumeBeforeMute = 0.8
  private _isLoading = false
  private _sleepTimer: SleepTimer | null = null

  private constructor() {}

  static getInstance(): PlayerStore {
    if (!PlayerStore.instance) {
      PlayerStore.instance = new PlayerStore()
    }
    return PlayerStore.instance
  }

  get currentStation(): RadioStation | null {
    return this._currentStation
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  get volume(): number {
    return this._volume
  }

  get volumeBeforeMute(): number {
    return this._volumeBeforeMute
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  get sleepTimerMinutesLeft(): number | null {
    if (!this._sleepTimer) return null
    const msLeft = this._sleepTimer.endsAt - Date.now()
    if (msLeft <= 0) return null
    return Math.ceil(msLeft / 60_000)
  }

  get hasSleepTimer(): boolean {
    return this._sleepTimer !== null
  }

  play(station: RadioStation): void {
    this._currentStation = station
    this._isPlaying = true
    this.eventBus.emit('player:play', { station })
  }

  pause(): void {
    this._isPlaying = false
    this.eventBus.emit('player:pause', {})
  }

  stop(): void {
    this._isPlaying = false
    this._currentStation = null
    this.clearSleepTimer()
    this.eventBus.emit('player:stop', {})
  }

  setVolume(volume: number): void {
    const newVolume = Math.max(0, Math.min(1, volume))
    if (this._volume > 0 && newVolume === 0) {
      this._volumeBeforeMute = this._volume
    }
    this._volume = newVolume
    this.eventBus.emit('player:volume', { volume: this._volume })
  }

  setLoading(loading: boolean): void {
    this._isLoading = loading
    this.eventBus.emit('player:loading', { loading })
  }

  error(message: string): void {
    this._isPlaying = false
    this._isLoading = false
    this.eventBus.emit('player:error', { message })
  }

  // ── Sleep Timer (Feature 5) ───────────────────────────────────────────────

  setSleepTimer(minutes: number): void {
    this.clearSleepTimer()
    const endsAt = Date.now() + minutes * 60_000
    const timeoutId = setTimeout(() => {
      this.stop()
    }, minutes * 60_000)
    this._sleepTimer = { endsAt, timeoutId }
    this.eventBus.emit('player:sleep-timer', { minutesLeft: minutes, active: true })
  }

  clearSleepTimer(): void {
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer.timeoutId)
      this._sleepTimer = null
      this.eventBus.emit('player:sleep-timer', { minutesLeft: null, active: false })
    }
  }
}
