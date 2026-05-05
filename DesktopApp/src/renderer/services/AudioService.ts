import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import type { RadioStation } from '../../domain/entities/RadioStation'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export class AudioService {
  private static instance: AudioService
  private audio: HTMLAudioElement
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private retryCount = 0
  private currentStationId: string | null = null
  private _onPlayStarted: ((audio: HTMLAudioElement) => Promise<void>) | null = null

  private constructor() {
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.setupEventListeners()
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
      this.audio.src = station.urlResolved || station.url
      this.audio.volume = this.playerStore.volume
      await this.audio.play()
      if (this._onPlayStarted) {
        await this._onPlayStarted(this.audio)
      }
      this.playerStore.setLoading(false)
    } catch (error) {
      console.error('Playback error:', error)
      await this.handlePlaybackError(station)
    }
  }

  pause(): void {
    this.audio.pause()
  }

  stop(): void {
    this.audio.pause()
    this.audio.src = ''
    this.currentStationId = null
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
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      
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
    // This will be implemented by Toast component
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
