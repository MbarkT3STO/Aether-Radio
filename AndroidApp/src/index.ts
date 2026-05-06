import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Router } from './router/Router'
import { EventBus } from './store/EventBus'
import { BridgeService } from './services/BridgeService'
import { AudioService } from './services/AudioService'
import { PlayerStore } from './store/PlayerStore'
import { FavoritesStore } from './store/FavoritesStore'
import { MediaNotificationService } from './services/MediaNotificationService'
import { BottomNav } from './components/BottomNav'
import { MiniPlayer } from './components/MiniPlayer'
import { initToast } from './components/Toast'
import { initLogoErrorHandling } from './utils/stationLogo'
import { HomeView } from './views/HomeView'
import { SearchView } from './views/SearchView'
import { ExploreView } from './views/ExploreView'
import { FavoritesView } from './views/FavoritesView'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { CustomStationsView } from './views/CustomStationsView'
import { FeaturedView } from './views/FeaturedView'
import 'flag-icons/css/flag-icons.css'

initLogoErrorHandling()

class App {
  private router         = Router.getInstance()
  private eventBus       = EventBus.getInstance()
  private bridge         = BridgeService.getInstance()
  private audioService   = AudioService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bottomNav      = new BottomNav({})
  private miniPlayer     = new MiniPlayer({})
  private currentView: { unmount: () => void } | null = null

  constructor() { void this.init() }

  private async init(): Promise<void> {
    initToast()
    await this.loadSettings()
    await this.loadFavorites()
    await this.bottomNav.mount('#bottom-nav')
    await this.miniPlayer.mount('#mini-player')
    this.registerRoutes()
    this.setupPlayerListeners()
    this.setupCapacitor()
    // Boot media notification service (no-op on web)
    MediaNotificationService.getInstance()
  }

  private async loadSettings(): Promise<void> {
    const result = await this.bridge.settings.get()
    if (result.success) {
      const { theme, volume, bufferSize } = result.data
      document.documentElement.setAttribute('data-theme', theme)
      this.playerStore.setVolume(volume)
      this.audioService.setBufferSize(bufferSize)
      // Apply dark status bar for dark theme
      try {
        await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
        await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#121214' : '#e0e5ec' })
      } catch { /* not on native */ }
    }
  }

  private async loadFavorites(): Promise<void> {
    const result = await this.bridge.favorites.getAll()
    if (result.success) this.favoritesStore.setFavorites(result.data)
  }

  private registerRoutes(): void {
    this.router.register('/', async () => this.renderView(new HomeView({})))
    this.router.register('/featured', async () => this.renderView(new FeaturedView({})))
    this.router.register('/explore', async () => this.renderView(new ExploreView({})))
    this.router.register('/search', async () => this.renderView(new SearchView({})))
    this.router.register('/favorites', async () => this.renderView(new FavoritesView({})))
    this.router.register('/history', async () => this.renderView(new HistoryView({})))
    this.router.register('/custom', async () => this.renderView(new CustomStationsView({})))
    this.router.register('/settings', async () => this.renderView(new SettingsView({})))
    this.router.start()
  }

  private async renderView(view: { mount: (c: string) => Promise<void>; unmount: () => void }): Promise<void> {
    this.currentView?.unmount()
    await view.mount('#content')
    this.currentView = view
  }

  private setupPlayerListeners(): void {
    this.eventBus.on('player:play', async ({ station }) => {
      await this.audioService.play(station)
      await this.bridge.history.add(station)
    })
    this.eventBus.on('player:pause', () => this.audioService.pause())
    this.eventBus.on('player:stop',  () => this.audioService.stop())
    this.eventBus.on('player:volume', ({ volume }) => {
      this.audioService.setVolume(volume)
      void this.bridge.settings.update({ volume })
    })
    this.eventBus.on('settings:buffer-changed', ({ bufferSize }) => {
      this.audioService.setBufferSize(bufferSize)
    })
    this.eventBus.on('theme:changed', async ({ theme }) => {
      try {
        await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
        await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#121214' : '#e0e5ec' })
      } catch { /* not on native */ }
    })
  }

  private setupCapacitor(): void {
    // Handle Android back button — navigate back or minimize app
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const hash = window.location.hash
      if (hash && hash !== '#/' && hash !== '#') {
        this.router.navigate('/')
      } else if (!canGoBack) {
        void CapApp.minimizeApp()
      }
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}
