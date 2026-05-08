import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import type { RadioStation } from '../domain/entities/RadioStation'
import { directStreamUrl, needsProxy, proxiedStreamUrl } from '../utils/streamProxy'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

/**
 * AudioService — manages the single <audio> element used for playback.
 *
 * Playback strategy on the web:
 *  1. First attempt: load the station's upstream URL directly. Most
 *     stations that work in browsers already serve proper CORS headers,
 *     and hitting the origin CDN is far faster than proxying every byte
 *     through our Netlify Edge Function.
 *  2. If the <audio> element errors on load (CORS, connection, mixed
 *     content), retry once via `/api/stream` so the edge function can
 *     relay with permissive headers.
 *  3. After that, do the original exponential-backoff retry dance.
 *
 * For the visualizer/recognition to tap the audio graph, the element must
 * be `crossOrigin='anonymous'` AND the response must have CORS headers.
 * Direct streams usually satisfy both; the proxy always does.
 */
export class AudioService {
  private static instance: AudioService
  private audio: HTMLAudioElement
  // Kept for future use; currently no inbound events on this service.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private retryCount = 0
  private currentStationId: string | null = null
  private _onPlayStarted: ((audio: HTMLAudioElement) => Promise<void>) | null = null

  /** True when the current <audio> src is the /api/stream proxy URL. */
  private usingProxy = false

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
    this.usingProxy = false
    this.playerStore.setLoading(true)

    const upstream = station.urlResolved || station.url
    // Always proxy HTTP streams when running on HTTPS (mixed content).
    const startUrl = needsProxy(upstream) ? proxiedStreamUrl(upstream) : directStreamUrl(upstream)
    this.usingProxy = needsProxy(upstream)

    try {
      this.audio.src = startUrl
      this.audio.volume = this.playerStore.volume
      await this.audio.play()
      if (this._onPlayStarted) {
        await this._onPlayStarted(this.audio)
      }
      this.playerStore.setLoading(false)
      this.updateMediaSession(station)
      this.requestWakeLock()
    } catch (error) {
      console.warn('Playback error (first attempt):', error)
      await this.handlePlaybackError(station, upstream)
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
    this.usingProxy = false
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
        const upstream = station.urlResolved || station.url
        this.handlePlaybackError(station, upstream)
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
   * Reacquire wake lock when the tab becomes visible again — the OS
   * releases it automatically on visibility change.
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

  /**
   * Retry strategy:
   *  • If we tried direct and failed → switch to proxy (CORS fix).
   *  • If we tried proxy and failed → exponential backoff up to MAX_RETRIES.
   */
  private async handlePlaybackError(station: RadioStation, upstream: string): Promise<void> {
    // First-time failover: direct → proxy
    if (!this.usingProxy && this.retryCount === 0) {
      this.usingProxy = true
      try {
        this.audio.src = proxiedStreamUrl(upstream)
        await this.audio.play()
        this.playerStore.setLoading(false)
        this.updateMediaSession(station)
        this.requestWakeLock()
        return
      } catch (err) {
        console.warn('Playback error (proxy fallback):', err)
        // fall through to backoff retry
      }
    }

    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++
      const delay = RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
      if (this.currentStationId === station.id) {
        // Retries always use the proxy since direct has already failed
        try {
          this.audio.src = proxiedStreamUrl(upstream)
          await this.audio.play()
          this.playerStore.setLoading(false)
        } catch {
          await this.handlePlaybackError(station, upstream)
        }
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
