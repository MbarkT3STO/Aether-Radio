/**
 * MediaNotificationService
 *
 * Manages the Android media notification (lock screen + notification shade)
 * using capacitor-music-controls-plugin-v3.
 *
 * Shows: station name, country, app name, station artwork, play/pause, stop.
 * Keeps audio playing in the background via the plugin's foreground service.
 *
 * NOTE: On Android 13+ the plugin fires events via document.addEventListener
 * (not plugin.addListener) due to a Capacitor bug with notifyListeners.
 */
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import type { RadioStation } from '../domain/entities/RadioStation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any

let _plugin: AnyPlugin | null = null
let _pluginLoaded = false

async function getPlugin(): Promise<AnyPlugin | null> {
  if (_pluginLoaded) return _plugin
  _pluginLoaded = true
  try {
    const mod = await import('capacitor-music-controls-plugin-v3')
    _plugin = mod.CapacitorMusicControls ?? mod.default ?? null
  } catch {
    _plugin = null
  }
  return _plugin
}

export class MediaNotificationService {
  private static instance: MediaNotificationService
  private eventBus     = EventBus.getInstance()
  private playerStore  = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge       = BridgeService.getInstance()
  private _active      = false
  private _listening   = false

  private constructor() {
    this.eventBus.on('player:play',  () => void this.onPlay())
    this.eventBus.on('player:pause', () => void this.onPause())
    this.eventBus.on('player:stop',  () => void this.onStop())
    // Register document-level event listener for Android 13+ immediately
    this.registerDocumentListener()
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
    // Always recreate to update station info
    await this.create(station, true)
  }

  private async onPause(): Promise<void> {
    const plugin = await getPlugin()
    if (!plugin || !this._active) return
    try {
      await plugin.updateIsPlaying({ isPlaying: false })
    } catch (e) {
      console.warn('[MediaNotification] updateIsPlaying failed:', e)
    }
  }

  private async onStop(): Promise<void> {
    this._active = false
    const plugin = await getPlugin()
    if (!plugin) return
    try { await plugin.destroy() } catch { /* ignore */ }
  }

  // ── Create notification ───────────────────────────────────────────────────

  private async create(station: RadioStation, isPlaying: boolean): Promise<void> {
    const plugin = await getPlugin()
    if (!plugin) return

    // Use station favicon if it's a valid https URL, otherwise fall back to app logo.
    // The plugin's getBitmapFromLocal() falls back to assets.open("public/" + path),
    // so a bare relative path like "assets/logo.png" resolves to public/assets/logo.png.
    const cover = station.favicon?.startsWith('https://')
      ? station.favicon
      : 'assets/logo.png'

    try {
      await plugin.create({
        track:       station.name,
        artist:      station.country || 'Live Radio',
        album:       'Aether Radio',
        cover:       cover,
        isPlaying:   isPlaying,
        dismissable: false,   // keep notification alive while playing
        hasPrev:     false,
        hasNext:     false,
        hasClose:    true,    // shows a stop/close button
        ticker:      `Now playing: ${station.name}`,
        // Use built-in Android media icons (no custom drawable needed)
        playIcon:    'media_play',
        pauseIcon:   'media_pause',
        closeIcon:   'media_close',
        notificationIcon: 'notification',
      })
      this._active = true
    } catch (e) {
      console.warn('[MediaNotification] create failed:', e)
    }
  }

  // ── Listen for notification button events ─────────────────────────────────

  private registerDocumentListener(): void {
    if (this._listening) return
    this._listening = true

    // Android 13+: plugin fires via triggerJSEvent → document event
    document.addEventListener('controlsNotification', (event: Event) => {
      const message = (event as CustomEvent).detail?.message
        ?? (event as CustomEvent & { message?: string }).message
        ?? ''
      void this.handleMessage(message)
    })

    // Also try the plugin's addListener for older Android / iOS
    getPlugin().then(plugin => {
      if (!plugin) return
      try {
        plugin.addListener('controlsNotification', (info: { message: string }) => {
          void this.handleMessage(info.message)
        })
      } catch { /* plugin may not support addListener */ }
    })
  }

  private async handleMessage(message: string): Promise<void> {
    switch (message) {
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

      case 'music-controls-media-button':
        // Physical media button — toggle play/pause
        if (this.playerStore.isPlaying) this.playerStore.pause()
        else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
        break

      case 'music-controls-headset-unplugged':
        // Auto-pause on headset unplug (good UX)
        if (this.playerStore.isPlaying) this.playerStore.pause()
        break
    }
  }
}
