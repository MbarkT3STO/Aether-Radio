import { Router } from './router/Router'
import { EventBus } from './store/EventBus'
import { BridgeService } from './services/BridgeService'
import { AudioService } from './services/AudioService'
import { PlayerStore } from './store/PlayerStore'
import { FavoritesStore } from './store/FavoritesStore'
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
    this.sidebar.mount('#sidebar')
    this.playerBar.mount('#player-bar')

    // Register routes
    this.registerRoutes()

    // Listen to player events
    this.setupPlayerListeners()
  }

  private async loadSettings(): Promise<void> {
    const result = await this.bridge.settings.get()
    if (result.success) {
      const { theme, volume } = result.data
      document.documentElement.setAttribute('data-theme', theme)
      this.playerStore.setVolume(volume)
    }
  }

  private async loadFavorites(): Promise<void> {
    const result = await this.bridge.favorites.getAll()
    if (result.success) {
      this.favoritesStore.setFavorites(result.data)
    }
  }

  private registerRoutes(): void {
    this.router.register('/', () => this.renderView(new HomeView({})))
    this.router.register('/featured', () => this.renderView(new FeaturedView({})))
    this.router.register('/explore', () => this.renderView(new ExploreView({})))
    this.router.register('/search', () => this.renderView(new SearchView({})))
    this.router.register('/favorites', () => this.renderView(new FavoritesView({})))
    this.router.register('/history', () => this.renderView(new HistoryView({})))
    this.router.register('/custom', () => this.renderView(new CustomStationsView({})))
    this.router.register('/settings', () => this.renderView(new SettingsView({})))

    // Start routing after all routes are registered
    this.router.start()
  }

  private renderView(view: { mount: (container: string) => void; unmount: () => void }): void {
    if (this.currentView) {
      this.currentView.unmount()
    }
    view.mount('#content')
    this.currentView = view
  }

  private setupPlayerListeners(): void {
    this.eventBus.on('player:play', async ({ station }) => {
      await this.audioService.play(station)
      await this.bridge.history.add(station)
      await this.bridge.radio.reportClick(station.id)
    })

    this.eventBus.on('player:pause', () => {
      this.audioService.pause()
    })

    this.eventBus.on('player:stop', () => {
      this.audioService.stop()
    })

    this.eventBus.on('player:volume', ({ volume }) => {
      this.audioService.setVolume(volume)
      this.bridge.settings.update({ volume })
    })
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}
