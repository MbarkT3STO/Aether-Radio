import { Router } from './router/Router'
import { EventBus } from './store/EventBus'
import { BridgeService } from './services/BridgeService'
import { AudioService } from './services/AudioService'
import { PlayerStore } from './store/PlayerStore'
import { FavoritesStore } from './store/FavoritesStore'
import './components/Toast'
import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { TopBar } from './components/TopBar'
import { initLogoErrorHandling } from './utils/stationLogo'
import { initRevealOnScroll } from './utils/revealOnScroll'
import { Container } from './infrastructure/di/Container'

// flag-icons is heavy (540KB of CSS + 271 SVGs). Load it async after the
// shell is painted so it doesn't block first paint / layout of the UI.
const loadFlagIcons = (): void => { void import('flag-icons/css/flag-icons.css') }
if ('requestIdleCallback' in window) {
  (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadFlagIcons)
} else {
  setTimeout(loadFlagIcons, 0)
}

// Global image fallback handler (installs once)
initLogoErrorHandling()

// Tag the root element with the current platform so CSS can target it.
if (navigator.userAgent.includes('Macintosh')) {
  document.documentElement.classList.add('platform-darwin')
}
document.documentElement.classList.add('platform-web')

class App {
  private router = Router.getInstance()
  private eventBus = EventBus.getInstance()
  private bridge = BridgeService.getInstance()
  private audioService = AudioService.getInstance()
  private playerStore = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()

  private sidebar = new Sidebar({})
  private playerBar = new PlayerBar({})
  private topBar = new TopBar({})

  private currentView: { unmount: () => void } | null = null

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    await this.loadSettings()
    await this.loadFavorites()

    await this.sidebar.mount('#sidebar')
    await this.topBar.mount('#topbar')
    await this.playerBar.mount('#player-bar')

    this.registerRoutes()
    this.setupPlayerListeners()

    // Reveal-on-scroll: opt-in fade/slide for elements with class `.reveal`.
    // Plays at most once per element.
    initRevealOnScroll()

    // Fire-and-forget: race the API mirrors in the background and switch
    // to the fastest one for all subsequent requests. Users on the same
    // continent as the fastest mirror save 150-300 ms on every API call.
    Container.optimizeMirrors().catch(() => { /* ignore — failover handles it */ })

    // Once the app is idle, drop the will-change hints the perf CSS sets.
    // Keeping will-change on forever costs memory on Safari/iOS — once cards
    // have been composited we no longer need the promotion hint.
    const markReady = (): void => document.documentElement.classList.add('perf-ready')
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(markReady)
    } else {
      setTimeout(markReady, 1500)
    }
  }

  private async loadSettings(): Promise<void> {
    const result = await this.bridge.settings.get()
    if (result.success) {
      const { theme, volume, bufferSize, accentColor } = result.data
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.setAttribute('data-accent', accentColor ?? 'blue')
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
    // Each view is loaded on demand. Vite splits them into separate chunks
    // so the initial bundle only contains Home + Sidebar + PlayerBar.
    this.router.register('/',          () => this.loadRoute(() => import('./views/HomeView').then(m => new m.HomeView({}))))
    this.router.register('/featured',  () => this.loadRoute(() => import('./views/FeaturedView').then(m => new m.FeaturedView({}))))
    this.router.register('/explore',   () => this.loadRoute(() => import('./views/ExploreView').then(m => new m.ExploreView({}))))
    this.router.register('/search',    () => this.loadRoute(() => import('./views/SearchView').then(m => new m.SearchView({}))))
    this.router.register('/favorites', () => this.loadRoute(() => import('./views/FavoritesView').then(m => new m.FavoritesView({}))))
    this.router.register('/history',   () => this.loadRoute(() => import('./views/HistoryView').then(m => new m.HistoryView({}))))
    this.router.register('/custom',    () => this.loadRoute(() => import('./views/CustomStationsView').then(m => new m.CustomStationsView({}))))
    this.router.register('/settings',  () => this.loadRoute(() => import('./views/SettingsView').then(m => new m.SettingsView({}))))

    this.router.start()
  }

  private async loadRoute(loader: () => Promise<{ mount: (c: string) => Promise<void>; unmount: () => void }>): Promise<void> {
    // Unmount the old view immediately so we don't keep its listeners alive
    if (this.currentView) {
      this.currentView.unmount()
      this.currentView = null
    }
    const view = await loader()
    await view.mount('#content')
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

    this.eventBus.on('settings:buffer-changed', ({ bufferSize }) => {
      this.audioService.setBufferSize(bufferSize)
    })

    // Space — tab-scoped play/pause (ignored when a text field has focus)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      e.preventDefault()
      if (this.playerStore.isPlaying) {
        this.playerStore.pause()
      } else if (this.playerStore.currentStation) {
        this.playerStore.play(this.playerStore.currentStation)
      }
    })
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}
