/**
 * MediaNotificationService
 *
 * Manages background audio and the Android media notification using two layers:
 *
 * Layer 1 — AudioPlayerPlugin (our own native plugin):
 *   Starts/stops a proper START_STICKY foreground service that keeps the process
 *   alive when the app is backgrounded or the screen is locked.
 *   Also posts the media notification to the notification shade.
 *
 * Layer 2 — capacitor-music-controls-plugin-v3 (optional, best-effort):
 *   Provides richer MediaSession integration (lock screen controls, Bluetooth
 *   headset buttons). Used in addition to Layer 1, not instead of it.
 *
 * This two-layer approach ensures background audio works even if the music
 * controls plugin fails to initialise.
 */
import { registerPlugin, Capacitor } from '@capacitor/core'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import type { RadioStation } from '../domain/entities/RadioStation'

// ── AudioPlayerPlugin bridge ───────────────────────────────────────────────

interface AudioPlayerPlugin {
  startForeground(options: { track: string; artist: string; cover: string }): Promise<void>
  pauseForeground(): Promise<void>
  stopForeground(): Promise<void>
  addListener(
    event: 'notificationAction',
    handler: (data: { action: 'play' | 'pause' | 'stop' }) => void
  ): Promise<{ remove: () => void }>
}

const AudioPlayer = registerPlugin<AudioPlayerPlugin>('AudioPlayer')

// ── Music controls plugin (optional) ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any

let _mcPlugin: AnyPlugin | null = null
let _mcLoaded = false

async function getMusicControlsPlugin(): Promise<AnyPlugin | null> {
  if (_mcLoaded) return _mcPlugin
  _mcLoaded = true
  try {
    const mod = await import('capacitor-music-controls-plugin-v3')
    _mcPlugin = mod.CapacitorMusicControls ?? mod.default ?? null
  } catch {
    _mcPlugin = null
  }
  return _mcPlugin
}

// ── Service ────────────────────────────────────────────────────────────────

export class MediaNotificationService {
  private static instance: MediaNotificationService
  private eventBus    = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private _active     = false
  private _listenerRegistered = false

  private constructor() {
    this.eventBus.on('player:play',  () => void this.onPlay())
    this.eventBus.on('player:pause', () => void this.onPause())
    this.eventBus.on('player:stop',  () => void this.onStop())

    if (Capacitor.isNativePlatform()) {
      this.registerNotificationListener()
    }
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
    await this.startForeground(station)
  }

  private async onPause(): Promise<void> {
    if (!this._active) return
    // Keep foreground service alive (so audio doesn't stop) but update notification
    try {
      await AudioPlayer.pauseForeground()
    } catch (e) {
      console.warn('[MediaNotification] pauseForeground failed:', e)
    }
    // Also update music controls plugin if available
    const mc = await getMusicControlsPlugin()
    if (mc) {
      try { await mc.updateIsPlaying({ isPlaying: false }) } catch { /* ignore */ }
    }
  }

  private async onStop(): Promise<void> {
    this._active = false
    try {
      await AudioPlayer.stopForeground()
    } catch (e) {
      console.warn('[MediaNotification] stopForeground failed:', e)
    }
    // Also destroy music controls plugin notification
    const mc = await getMusicControlsPlugin()
    if (mc) {
      try { await mc.destroy() } catch { /* ignore */ }
    }
  }

  // ── Start foreground service + notification ────────────────────────────

  private async startForeground(station: RadioStation): Promise<void> {
    const cover = station.favicon?.startsWith('https://') ? station.favicon : ''

    // Layer 1: start our own foreground service — this is what keeps audio alive
    try {
      await AudioPlayer.startForeground({
        track:  station.name,
        artist: station.country || 'Live Radio',
        cover,
      })
      this._active = true
    } catch (e) {
      console.warn('[MediaNotification] startForeground failed:', e)
    }

    // Layer 2: also start music controls plugin for richer MediaSession (best-effort)
    const mc = await getMusicControlsPlugin()
    if (mc) {
      try {
        await mc.create({
          track:            station.name,
          artist:           station.country || 'Live Radio',
          album:            'Aether Radio',
          cover:            cover || 'assets/logo.png',
          isPlaying:        true,
          dismissable:      false,
          hasPrev:          false,
          hasNext:          false,
          hasClose:         true,
          ticker:           `Now playing: ${station.name}`,
          playIcon:         'media_play',
          pauseIcon:        'media_pause',
          closeIcon:        'media_close',
          notificationIcon: 'notification',
        })
      } catch (e) {
        console.warn('[MediaNotification] music controls create failed:', e)
      }
    }
  }

  // ── Notification button listener ──────────────────────────────────────

  private registerNotificationListener(): void {
    if (this._listenerRegistered) return
    this._listenerRegistered = true

    // Listen to our own AudioPlayerPlugin notification buttons
    AudioPlayer.addListener('notificationAction', ({ action }) => {
      void this.handleAction(action)
    }).catch(() => { /* plugin not available on web */ })

    // Also listen to music controls plugin events (Android 13+ uses document event)
    document.addEventListener('controlsNotification', (event: Event) => {
      const message = (event as CustomEvent).detail?.message
        ?? (event as CustomEvent & { message?: string }).message
        ?? ''
      void this.handleMusicControlsMessage(message)
    })

    getMusicControlsPlugin().then(mc => {
      if (!mc) return
      try {
        mc.addListener('controlsNotification', (info: { message: string }) => {
          void this.handleMusicControlsMessage(info.message)
        })
      } catch { /* ignore */ }
    })
  }

  private async handleAction(action: 'play' | 'pause' | 'stop'): Promise<void> {
    switch (action) {
      case 'play':
        if (this.playerStore.currentStation) {
          this.playerStore.play(this.playerStore.currentStation)
        }
        break
      case 'pause':
        this.playerStore.pause()
        break
      case 'stop':
        this.playerStore.stop()
        break
    }
  }

  private async handleMusicControlsMessage(message: string): Promise<void> {
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
        if (this.playerStore.isPlaying) this.playerStore.pause()
        else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
        break
      case 'music-controls-headset-unplugged':
        if (this.playerStore.isPlaying) this.playerStore.pause()
        break
    }
  }
}
