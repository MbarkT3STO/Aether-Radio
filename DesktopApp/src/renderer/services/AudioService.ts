import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { CrossfadeService } from './CrossfadeService'
import { BufferHealthService } from './BufferHealthService'
import { RecordingService } from './RecordingService'
import type { RadioStation } from '../../domain/entities/RadioStation'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export class AudioService {
  private static instance: AudioService
  private audio: HTMLAudioElement
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private crossfadeService = CrossfadeService.getInstance()
  private bufferHealthService = BufferHealthService.getInstance()
  private recordingService = RecordingService.getInstance()
  private retryCount = 0
  private currentStationId: string | null = null
  private _onPlayStarted: ((audio: HTMLAudioElement) => Promise<void>) | null = null

  private constructor() {
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.setupEventListeners()
    this.bufferHealthService.attach(this.audio)
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
    const previousStationId = this.currentStationId
    this.currentStationId = station.id
    this.retryCount = 0
    this.playerStore.setLoading(true)

    try {
      // Crossfade: fade out if switching stations (not first play)
      if (previousStationId && previousStationId !== station.id) {
        await this.crossfadeService.fadeOut()
      }

      this.audio.src = station.urlResolved || station.url
      this.audio.volume = this.playerStore.volume
      await this.audio.play()

      // Crossfade: fade in the new station
      this.crossfadeService.fadeIn()

      if (this._onPlayStarted) {
        await this._onPlayStarted(this.audio)
      }
      this.playerStore.setLoading(false)

      // Update OS Now Playing widget (macOS menu bar, Linux MPRIS)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.country || 'Live Radio',
          album: 'Aether Radio',
          artwork: station.favicon
            ? [{ src: station.favicon, sizes: '512x512', type: 'image/png' }]
            : [],
        })
        navigator.mediaSession.playbackState = 'playing'

        navigator.mediaSession.setActionHandler('play', () => {
          this.playerStore.play(this.playerStore.currentStation!)
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          this.playerStore.pause()
        })
        navigator.mediaSession.setActionHandler('stop', () => {
          this.playerStore.stop()
        })
      }
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
  }

  stop(): void {
    // Stop recording if active
    if (this.recordingService.isRecording) {
      this.recordingService.stop()
    }
    this.crossfadeService.reset()
    this.audio.pause()
    this.audio.src = ''
    this.currentStationId = null
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

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

  private async handlePlaybackError(station: RadioStation): Promise<void> {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++
      // Exponential backoff: 2s, 4s, 8s
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
}
