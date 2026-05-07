import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { VisualizerService } from './VisualizerService'
import type { RadioStation } from '../domain/entities/RadioStation'
import { Network } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export class AudioService {
  private static instance: AudioService
  private audio: HTMLAudioElement
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private retryCount = 0
  private currentStationId: string | null = null
  private _visualizer = new VisualizerService()
  private _onPlayStarted: ((audio: HTMLAudioElement) => Promise<void>) | null = null

  private constructor() {
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.setupEventListeners()
    if (Capacitor.isNativePlatform()) {
      Network.addListener('networkStatusChange', async (status) => {
        if (status.connected && this.currentStationId) {
          const station = this.playerStore.currentStation
          if (station && !this.playerStore.isPlaying) {
            // Network came back — wait for it to stabilise then reconnect
            await new Promise(r => setTimeout(r, 1500))
            await this.play(station)
          }
        }
      })
    }
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) AudioService.instance = new AudioService()
    return AudioService.instance
  }

  getAudioElement(): HTMLAudioElement { return this.audio }
  getVisualizer(): VisualizerService  { return this._visualizer }

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
      // Initialize visualizer on first play
      await this._visualizer.initialize(this.audio)
      if (this._onPlayStarted) await this._onPlayStarted(this.audio)
      this.playerStore.setLoading(false)
    } catch (error) {
      console.error('Playback error:', error)
      await this.handlePlaybackError(station)
    }
  }

  pause(): void { this.audio.pause() }

  stop(): void {
    this.audio.pause()
    this.audio.src = ''
    this.currentStationId = null
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  setBufferSize(size: 'low' | 'balanced' | 'high'): void {
    this.audio.preload = size === 'low' ? 'none' : size === 'balanced' ? 'metadata' : 'auto'
  }

  private setupEventListeners(): void {
    this.audio.addEventListener('error', () => {
      const station = this.playerStore.currentStation
      if (station && this.currentStationId === station.id) {
        void this.handlePlaybackError(station)
      }
    })
    this.audio.addEventListener('playing', () => {
      this.playerStore.setLoading(false)
      this.retryCount = 0
    })
    this.audio.addEventListener('waiting', () => this.playerStore.setLoading(true))
    this.audio.addEventListener('canplay', () => this.playerStore.setLoading(false))
  }

  private async handlePlaybackError(station: RadioStation): Promise<void> {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      if (this.currentStationId === station.id) await this.play(station)
    } else {
      this.playerStore.error('Failed to play station after multiple attempts')
      this.playerStore.setLoading(false)
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Unable to play this station. Please try another.', type: 'error' }
      }))
    }
  }
}
