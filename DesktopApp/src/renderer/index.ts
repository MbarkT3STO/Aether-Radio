import { Router } from './router/Router'
import { EventBus } from './store/EventBus'
import { BridgeService } from './services/BridgeService'
import { AudioService } from './services/AudioService'
import { PlayerStore } from './store/PlayerStore'
import { FavoritesStore } from './store/FavoritesStore'
import 'flag-icons/css/flag-icons.css'
import './components/Toast'
import { HomeView } from './views/HomeView'
import { ExploreView } from './views/ExploreView'
import { SearchView } from './views/SearchView'
import { FavoritesView } from './views/FavoritesView'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { CustomStationsView } from './views/CustomStationsView'
import { FeaturedView } from './views/FeaturedView'
import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { initLogoErrorHandling } from './utils/stationLogo'

// Install global logo error handler before anything renders
initLogoErrorHandling()

// Tag the root element with the current platform so CSS can target it.
// On macOS with titleBarStyle:'hiddenInset' the traffic lights overlap the
// top-left corner, so we need extra top padding in the sidebar header.
if (navigator.userAgent.includes('Macintosh')) {
  document.documentElement.classList.add('platform-darwin')
}

class App {
  private router: Router
  private eventBus: EventBus
  private bridge: BridgeService
  private audioService: AudioService
  private playerStore: PlayerStore
  private favoritesStore: FavoritesStore

  private sidebar: Sidebar
  private playerBar: PlayerBar

  private currentView: { unmount: () => void } | null = null

  constructor() {
    this.router = Router.getInstance()
    this.eventBus = EventBus.getInstance()
    this.bridge = BridgeService.getInstance()
    this.audioService = AudioService.getInstance()
    this.playerStore = PlayerStore.getInstance()
    this.favoritesStore = FavoritesStore.getInstance()

    this.sidebar = new Sidebar({})
    this.playerBar = new PlayerBar({})

    this.init()
  }

  private async init(): Promise<void> {
    // Load settings and apply theme
    await this.loadSettings()

    // Load favorites
    await this.loadFavorites()

    // Mount sidebar and player bar
    await this.sidebar.mount('#sidebar')
    await this.playerBar.mount('#player-bar')

    // Register routes
    this.registerRoutes()

    // Listen to player events
    this.setupPlayerListeners()
  }

  private async loadSettings(): Promise<void> {
    const result = await this.bridge.settings.get()
    if (result.success) {
      const { theme, volume, bufferSize } = result.data
      document.documentElement.setAttribute('data-theme', theme)
      this.playerStore.setVolume(volume)
      this.audioService.setBufferSize(bufferSize)
    }
  }

  private async loadFavorites(): Promise<void> {
    const result = await this.bridge.favorites.getAll()
    if (result.success) {
      this.favoritesStore.setFavorites(result.data)
    }
  }

  private registerRoutes(): void {
    this.router.register('/', async () => { await this.renderView(new HomeView({})) })
    this.router.register('/featured', async () => { await this.renderView(new FeaturedView({})) })
    this.router.register('/explore', async () => { await this.renderView(new ExploreView({})) })
    this.router.register('/search', async () => { await this.renderView(new SearchView({})) })
    this.router.register('/favorites', async () => { await this.renderView(new FavoritesView({})) })
    this.router.register('/history', async () => { await this.renderView(new HistoryView({})) })
    this.router.register('/custom', async () => { await this.renderView(new CustomStationsView({})) })
    this.router.register('/settings', async () => { await this.renderView(new SettingsView({})) })

    // Start routing after all routes are registered
    this.router.start()
  }

  private async renderView(view: { mount: (container: string) => Promise<void>; unmount: () => void }): Promise<void> {
    if (this.currentView) {
      this.currentView.unmount()
    }
    await view.mount('#content')
    this.currentView = view
  }

  private setupPlayerListeners(): void {
    this.eventBus.on('player:play', async ({ station }) => {
      await this.audioService.play(station)
      await this.bridge.history.add(station)
      await this.bridge.radio.reportClick(station.id)
      window.electronAPI.trayUpdate({ name: station.name, playing: true })
      window.electronAPI.playerStateChanged(true)
    })

    this.eventBus.on('player:pause', () => {
      this.audioService.pause()
      // Capture name before any state change
      const name = this.playerStore.currentStation?.name ?? ''
      window.electronAPI.trayUpdate({ name, playing: false })
      window.electronAPI.playerStateChanged(false)
    })

    this.eventBus.on('player:stop', () => {
      // Capture name before stop clears the station
      const name = this.playerStore.currentStation?.name ?? ''
      this.audioService.stop()
      window.electronAPI.trayUpdate({ name: name || 'No station playing', playing: false })
      window.electronAPI.playerStateChanged(false)
    })

    this.eventBus.on('player:volume', ({ volume }) => {
      this.audioService.setVolume(volume)
      this.bridge.settings.update({ volume })
    })

    this.eventBus.on('settings:buffer-changed', ({ bufferSize }) => {
      this.audioService.setBufferSize(bufferSize)
    })

    // Feature 1 — tray controls → player
    window.electronAPI.onTrayToggle(() => {
      if (this.playerStore.isPlaying) {
        this.playerStore.pause()
      } else if (this.playerStore.currentStation) {
        this.playerStore.play(this.playerStore.currentStation)
      }
    })

    window.electronAPI.onTrayStop(() => {
      this.playerStore.stop()
    })

    // Feature 2 — global keyboard shortcuts
    window.electronAPI.onShortcut('toggle-playback', () => {
      if (this.playerStore.isPlaying) {
        this.playerStore.pause()
      } else if (this.playerStore.currentStation) {
        this.playerStore.play(this.playerStore.currentStation)
      }
    })

    window.electronAPI.onShortcut('stop', () => {
      this.playerStore.stop()
    })

    // next-station: no-op for now — can be wired to a playlist in the future
    window.electronAPI.onShortcut('next-station', () => {
      // placeholder for future playlist navigation
    })
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}
