/**
 * MediaSessionService
 *
 * Integrates with the browser's Media Session API so Android shows a
 * rich media notification with artwork, station name, and playback controls.
 *
 * The Media Session API is supported in Android WebView (Chromium) and
 * allows the OS to display a notification with play/pause/stop controls
 * that keep working when the app is in the background.
 */
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'
import type { RadioStation } from '../../domain/entities/RadioStation'

export class MediaSessionService {
  private static instance: MediaSessionService
  private playerStore = PlayerStore.getInstance()
  private eventBus = EventBus.getInstance()

  private constructor() {
    if (!('mediaSession' in navigator)) return
    this.setupActionHandlers()
    this.subscribeToEvents()
  }

  static getInstance(): MediaSessionService {
    if (!MediaSessionService.instance) {
      MediaSessionService.instance = new MediaSessionService()
    }
    return MediaSessionService.instance
  }

  private setupActionHandlers(): void {
    const ms = navigator.mediaSession

    ms.setActionHandler('play', () => {
      const station = this.playerStore.currentStation
      if (station) this.playerStore.play(station)
    })

    ms.setActionHandler('pause', () => {
      this.playerStore.pause()
    })

    ms.setActionHandler('stop', () => {
      this.playerStore.stop()
    })

    // Some Android versions show next/previous — map them to stop for radio
    try {
      ms.setActionHandler('previoustrack', null)
      ms.setActionHandler('nexttrack', null)
    } catch {
      // Not all browsers support these
    }
  }

  private subscribeToEvents(): void {
    this.eventBus.on('player:play', ({ station }) => {
      this.updateSession(station, true)
    })

    this.eventBus.on('player:pause', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    })

    this.eventBus.on('player:stop', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none'
        navigator.mediaSession.metadata = null
      }
    })
  }

  private updateSession(station: RadioStation, playing: boolean): void {
    if (!('mediaSession' in navigator)) return

    const ms = navigator.mediaSession
    ms.playbackState = playing ? 'playing' : 'paused'

    // Build artwork array — use station favicon if it's a safe URL, else app logo only
    const artwork: MediaImage[] = []

    if (station.favicon && station.favicon.trim() !== '') {
      const favicon = station.favicon.trim()
      // Only allow http/https URLs — same policy as stationLogo.ts
      if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
        artwork.push({ src: favicon, sizes: '512x512', type: 'image/png' })
        artwork.push({ src: favicon, sizes: '256x256', type: 'image/png' })
      }
    }

    // Always include our app logo as a fallback artwork
    artwork.push({ src: '/assets/logo.png', sizes: '512x512', type: 'image/png' })

    const tags = station.tags?.slice(0, 2).join(', ') || 'Radio'
    const country = station.country || ''

    ms.metadata = new MediaMetadata({
      title: station.name,
      artist: [country, tags].filter(Boolean).join(' · '),
      album: 'Aether Radio',
      artwork,
    })
  }
}
