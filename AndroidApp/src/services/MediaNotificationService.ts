/**
 * MediaNotificationService
 *
 * Manages the Android media notification (lock screen + notification shade)
 * using capacitor-music-controls-plugin-v3.
 *
 * Shows: app icon, station name, play/pause, stop, favorite buttons.
 * Keeps audio playing in the background via the plugin's foreground service.
 */
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import type { RadioStation } from '../domain/entities/RadioStation'

// The plugin is loaded dynamically to avoid breaking web/dev builds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MusicControlsPlugin = any

let MusicControls: MusicControlsPlugin | null = null

async function getPlugin(): Promise<MusicControlsPlugin | null> {
  if (MusicControls) return MusicControls
  try {
    // Only available on native Android
    const mod = await import('capacitor-music-controls-plugin-v3')
    MusicControls = mod.CapacitorMusicControls ?? mod.default ?? null
    return MusicControls
  } catch {
    return null
  }
}

export class MediaNotificationService {
  private static instance: MediaNotificationService
  private eventBus       = EventBus.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge         = BridgeService.getInstance()
  private _active        = false

  private constructor() {
    this.eventBus.on('player:play',  () => void this.onPlay())
    this.eventBus.on('player:pause', () => void this.onPause())
    this.eventBus.on('player:stop',  () => void this.destroy())
    this.eventBus.on('favorites:changed', () => void this.refresh())
  }

  static getInstance(): MediaNotificationService {
    if (!MediaNotificationService.instance) {
      MediaNotificationService.instance = new MediaNotificationService()
    }
    return MediaNotificationService.instance
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private async onPlay(): Promise<void> {
    const station = this.playerStore.currentStation
    if (!station) return
    if (!this._active) {
      await this.create(station)
    } else {
      await this.updatePlayState(true)
    }
  }

  private async onPause(): Promise<void> {
    await this.updatePlayState(false)
  }

  private async refresh(): Promise<void> {
    if (!this._active) return
    const station = this.playerStore.currentStation
    if (station) await this.create(station)
  }

  // ── Plugin calls ──────────────────────────────────────────────────────────

  private async create(station: RadioStation): Promise<void> {
    const plugin = await getPlugin()
    if (!plugin) return

    const isFav = this.favoritesStore.isFavorite(station.id)
    const isPlaying = this.playerStore.isPlaying

    try {
      await plugin.create({
        track:        station.name,
        artist:       station.country || 'Live Radio',
        album:        'Aether Radio',
        cover:        station.favicon || 'public/assets/logo.png',
        isPlaying:    isPlaying,
        dismissable:  false,          // keep alive while playing
        hasPrev:      false,
        hasNext:      false,
        hasClose:     true,           // stop button
        hasSkipForward:  false,
        hasSkipBackward: false,
        // Custom action for favorite toggle
        hasFavorite:  true,
        isFavorite:   isFav,
        // Ticker text shown in notification
        ticker:       `Now playing: ${station.name}`,
        // App name shown in notification header
        notificationIcon: 'ic_launcher',
      })

      this._active = true
      this.listenToControls()
    } catch (e) {
      console.warn('MediaNotification create failed:', e)
    }
  }

  private async updatePlayState(playing: boolean): Promise<void> {
    const plugin = await getPlugin()
    if (!plugin || !this._active) return
    try {
      await plugin.updateIsPlaying({ isPlaying: playing })
    } catch { /* ignore */ }
  }

  async destroy(): Promise<void> {
    const plugin = await getPlugin()
    this._active = false
    if (!plugin) return
    try { await plugin.destroy() } catch { /* ignore */ }
  }

  // ── Control events from notification ─────────────────────────────────────

  private _controlsListening = false

  private listenToControls(): void {
    if (this._controlsListening) return
    this._controlsListening = true

    getPlugin().then(plugin => {
      if (!plugin) return

      plugin.addListener('controlsNotification', async (info: { message: string }) => {
        switch (info.message) {
          case 'music-controls-play':
            if (this.playerStore.currentStation) {
              this.playerStore.play(this.playerStore.currentStation)
            }
            break
          case 'music-controls-pause':
            this.playerStore.pause()
            break
          case 'music-controls-stop':
          case 'music-controls-destroy':
            this.playerStore.stop()
            break
          case 'music-controls-toggle-play-pause':
            if (this.playerStore.isPlaying) this.playerStore.pause()
            else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
            break
          case 'music-controls-favorite': {
            const station = this.playerStore.currentStation
            if (!station) break
            if (this.favoritesStore.isFavorite(station.id)) {
              await this.bridge.favorites.remove(station.id)
            } else {
              await this.bridge.favorites.add(station)
            }
            const res = await this.bridge.favorites.getAll()
            if (res.success) this.favoritesStore.setFavorites(res.data)
            break
          }
        }
      })
    })
  }
}
