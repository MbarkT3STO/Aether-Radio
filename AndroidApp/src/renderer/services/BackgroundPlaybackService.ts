/**
 * BackgroundPlaybackService
 *
 * Bridges the web player to the native Android foreground service
 * (RadioPlaybackService) via the MediaControl Capacitor plugin.
 *
 * This keeps the app alive and shows a media notification when audio
 * is playing, even when the user switches to another app.
 */
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'
import type { RadioStation } from '../../domain/entities/RadioStation'

// Capacitor plugin interface — loaded dynamically to avoid errors on web
interface MediaControlPlugin {
  startPlayback(options: { name: string; country: string; tags: string }): Promise<void>
  updatePlayback(options: { name: string; country: string; tags: string; isPlaying: boolean }): Promise<void>
  stopPlayback(): Promise<void>
  addListener(event: string, handler: (data: { action: string }) => void): Promise<{ remove: () => void }>
}

export class BackgroundPlaybackService {
  private static instance: BackgroundPlaybackService
  private playerStore = PlayerStore.getInstance()
  private eventBus = EventBus.getInstance()
  private plugin: MediaControlPlugin | null = null
  private listenerHandle: { remove: () => void } | null = null

  private constructor() {
    // Subscribe to player events immediately — before the async plugin load —
    // so we never miss a play event that fires before the import resolves.
    this.subscribeToPlayerEvents()
    void this.init()
  }

  static getInstance(): BackgroundPlaybackService {
    if (!BackgroundPlaybackService.instance) {
      BackgroundPlaybackService.instance = new BackgroundPlaybackService()
    }
    return BackgroundPlaybackService.instance
  }

  private async init(): Promise<void> {
    // Load the Capacitor plugin — only available on Android
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const MediaControl = registerPlugin<MediaControlPlugin>('MediaControl')
      this.plugin = MediaControl

      // Listen for control actions from the notification (play/pause/stop buttons)
      this.listenerHandle = await MediaControl.addListener('playerControl', (data) => {
        this.handleNativeControl(data.action)
      })

      // If a station is already playing when the plugin finishes loading
      // (e.g. user tapped play before the import resolved), start the service now.
      const station = this.playerStore.currentStation
      if (station && this.playerStore.isPlaying) {
        await this.onPlay(station)
      }
    } catch {
      // Plugin not available — graceful degradation
    }
  }

  private subscribeToPlayerEvents(): void {
    this.eventBus.on('player:play', ({ station }) => {
      void this.onPlay(station)
    })

    this.eventBus.on('player:pause', () => {
      void this.onPause()
    })

    this.eventBus.on('player:stop', () => {
      void this.onStop()
    })
  }

  private async onPlay(station: RadioStation): Promise<void> {
    if (!this.plugin) return
    try {
      const tags = station.tags?.slice(0, 2).join(', ') || ''
      await this.plugin.startPlayback({
        name: station.name,
        country: station.country || '',
        tags,
      })
    } catch (e) {
      console.warn('BackgroundPlaybackService: startPlayback failed', e)
    }
  }

  private async onPause(): Promise<void> {
    if (!this.plugin) return
    const station = this.playerStore.currentStation
    if (!station) return
    try {
      const tags = station.tags?.slice(0, 2).join(', ') || ''
      await this.plugin.updatePlayback({
        name: station.name,
        country: station.country || '',
        tags,
        isPlaying: false,
      })
    } catch (e) {
      console.warn('BackgroundPlaybackService: updatePlayback failed', e)
    }
  }

  private async onStop(): Promise<void> {
    if (!this.plugin) return
    try {
      await this.plugin.stopPlayback()
    } catch (e) {
      console.warn('BackgroundPlaybackService: stopPlayback failed', e)
    }
  }

  private handleNativeControl(action: string): void {
    switch (action) {
      case 'play': {
        const station = this.playerStore.currentStation
        if (station) this.playerStore.play(station)
        break
      }
      case 'pause':
        this.playerStore.pause()
        break
      case 'stop':
        this.playerStore.stop()
        break
    }
  }

  destroy(): void {
    this.listenerHandle?.remove()
    this.listenerHandle = null
  }
}
