import { Router } from './router/Router'
import { EventBus } from './store/EventBus'
import { BridgeService } from './services/BridgeService'
import { AudioService } from './services/AudioService'
import { MediaSessionService } from './services/MediaSessionService'
import { BackgroundPlaybackService } from './services/BackgroundPlaybackService'
import { PlayerStore } from './store/PlayerStore'
import { FavoritesStore } from './store/FavoritesStore'
import 'flag-icons/css/flag-icons.css'
import './components/Toast'
import { BottomNav } from './components/BottomNav'
import { MiniPlayer } from './components/MiniPlayer'
import { HomeView } from './views/HomeView'
import { ExploreView } from './views/ExploreView'
import { SearchView } from './views/SearchView'
import { FavoritesView } from './views/FavoritesView'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { CustomStationsView } from './views/CustomStationsView'
import { FeaturedView } from './views/FeaturedView'
import { initLogoErrorHandling } from './utils/stationLogo'

initLogoErrorHandling()

class App {
  private router = Router.getInstance()
  private eventBus = EventBus.getInstance()
  private bridge = BridgeService.getInstance()
  private audioService = AudioService.getInstance()
  private mediaSession = MediaSessionService.getInstance()
  private backgroundPlayback = BackgroundPlaybackService.getInstance()
  private playerStore = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()

  private bottomNav = new BottomNav({})
  private miniPlayer = new MiniPlayer({})
  private currentView: { unmount: () => void } | null = null

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    await this.loadSettings()
    await this.loadFavorites()

    await this.bottomNav.mount('#bottom-nav')
    await this.miniPlayer.mount('#mini-player')

    this.registerRoutes()
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
    if (result.success) this.favoritesStore.setFavorites(result.data)
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
    this.router.start()
  }

  private async renderView(view: { mount: (c: string) => Promise<void>; unmount: () => void }): Promise<void> {
    if (this.currentView) this.currentView.unmount()
    await view.mount('#content')
    this.currentView = view
    // Scroll content back to top on route change
    const content = document.getElementById('content')
    if (content) content.scrollTop = 0
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

    this.eventBus.on('settings:buffer-changed', ({ bufferSize }) => {
      this.audioService.setBufferSize(bufferSize)
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}
