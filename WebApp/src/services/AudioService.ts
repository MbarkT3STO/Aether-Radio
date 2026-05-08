import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import type { RadioStation } from '../domain/entities/RadioStation'
import { proxiedStreamUrl } from '../utils/streamProxy'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

/**
 * AudioService — manages the single <audio> element used for playback.
 *
 * Web notes (differs from Electron):
 *  • Streams are routed through /api/stream so the audio element can set
 *    crossOrigin='anonymous' without tripping CORS on upstream Icecast
 *    servers. This is required for the visualizer and recognition to tap
 *    PCM from the AudioContext.
 *  • MediaSession is the only OS-level "now playing" hook available in the
 *    browser. It surfaces controls on mobile lockscreens and macOS Now
 *    Playing widgets.
 *  • A Wake Lock is acquired when the tab is visible + playing so the OS
 *    does not throttle audio when the screen dims on mobile devices.
 */
export class AudioService {
  private static instance: AudioService
  private audio: HTMLAudioElement
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private retryCount = 0
  private currentStationId: string | null = null
  private _onPlayStarted: ((audio: HTMLAudioElement) => Promise<void>) | null = null

  // Screen Wake Lock — best effort; not all browsers support it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wakeLock: any = null

  private constructor() {
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.audio.preload = 'metadata'
    this.setupEventListeners()
    this.setupVisibilityHandler()
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }

  getAudioElement(): HTMLAudioElement {
    return this.audio
  }

  setOnPlayStarted(cb: (audio: HTMLAudioElement) => Promise<void>): void {
    this._onPlayStarted = cb
  }

  async play(station: RadioStation): Promise<void> {
    this.currentStationId = station.id
    this.retryCount = 0
    this.playerStore.setLoading(true)

    try {
      const upstream = station.urlResolved || station.url
      this.audio.src = proxiedStreamUrl(upstream)
      this.audio.volume = this.playerStore.volume
      await this.audio.play()
      if (this._onPlayStarted) {
        await this._onPlayStarted(this.audio)
      }
      this.playerStore.setLoading(false)
      this.updateMediaSession(station)
      this.requestWakeLock()
    } catch (error) {
      console.error('Playback error:', error)
      await this.handlePlaybackError(station)
    }
  }

  pause(): void {
    this.audio.pause()
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
    this.releaseWakeLock()
  }

  stop(): void {
    this.audio.pause()
    this.audio.src = ''
    this.currentStationId = null
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
    this.releaseWakeLock()
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  setBufferSize(size: 'low' | 'balanced' | 'high'): void {
    switch (size) {
      case 'low':
        this.audio.preload = 'none'
        break
      case 'balanced':
        this.audio.preload = 'metadata'
        break
      case 'high':
        this.audio.preload = 'auto'
        break
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.audio.addEventListener('error', () => {
      const station = this.playerStore.currentStation
      if (station && this.currentStationId === station.id) {
        this.handlePlaybackError(station)
      }
    })

    this.audio.addEventListener('playing', () => {
      this.playerStore.setLoading(false)
      this.retryCount = 0
    })

    this.audio.addEventListener('waiting', () => {
      this.playerStore.setLoading(true)
    })

    this.audio.addEventListener('canplay', () => {
      this.playerStore.setLoading(false)
    })
  }

  /**
   * Reacquire wake lock when the tab becomes visible again — the OS releases
   * it automatically on visibility change.
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.playerStore.isPlaying) {
        this.requestWakeLock()
      }
    })
  }

  private updateMediaSession(station: RadioStation): void {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: station.country || 'Live Radio',
      album: 'Aether Radio',
      artwork: station.favicon
        ? [
            { src: station.favicon, sizes: '96x96',  type: 'image/png' },
            { src: station.favicon, sizes: '256x256', type: 'image/png' },
            { src: station.favicon, sizes: '512x512', type: 'image/png' },
          ]
        : [],
    })
    navigator.mediaSession.playbackState = 'playing'

    navigator.mediaSession.setActionHandler('play', () => {
      if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
    })
    navigator.mediaSession.setActionHandler('pause', () => this.playerStore.pause())
    navigator.mediaSession.setActionHandler('stop', () => this.playerStore.stop())
  }

  private async requestWakeLock(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any
      if (nav.wakeLock && !this.wakeLock) {
        this.wakeLock = await nav.wakeLock.request('screen')
        this.wakeLock.addEventListener('release', () => { this.wakeLock = null })
      }
    } catch {
      // Silently ignore — wake lock is optional
    }
  }

  private releaseWakeLock(): void {
    try {
      this.wakeLock?.release?.()
    } catch {
      // ignore
    }
    this.wakeLock = null
  }

  private async handlePlaybackError(station: RadioStation): Promise<void> {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++
      const delay = RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
      if (this.currentStationId === station.id) {
        await this.play(station)
      }
    } else {
      this.playerStore.error('Failed to play station after multiple attempts')
      this.playerStore.setLoading(false)
      this.showToast('Unable to play this station. Please try another one.', 'error')
    }
  }

  private showToast(message: string, type: 'error' | 'success' | 'info'): void {
    const event = new CustomEvent('show-toast', { detail: { message, type } })
    window.dispatchEvent(event)
  }
}
