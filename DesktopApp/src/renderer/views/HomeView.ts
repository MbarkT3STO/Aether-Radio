import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { Router } from '../router/Router'
import { EventBus } from '../store/EventBus'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import { renderStationCard } from '../utils/renderCard'
import { countryFlag } from '../utils/countryFlag'

export class HomeView extends BaseComponent {
  private bridge         = BridgeService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private router         = Router.getInstance()
  private eventBus       = EventBus.getInstance()

  private recentHistory: PlayHistory[] = []
  private favoritesCount = 0
  private unsubscribers: Array<() => void> = []

  async afterMount(): Promise<void> {
    // Render the page structure immediately — don't wait for data
    this.updateContent()

    // Then load data and refresh
    await this.loadData()

    // Re-render now-playing card when station changes — store unsubscribers
    this.unsubscribers.push(
      this.eventBus.on('player:play',  () => { this.updateNowPlaying(); this.syncPlayingState() }),
      this.eventBus.on('player:pause', () => { this.updateNowPlaying(); this.syncPlayingState() }),
      this.eventBus.on('player:stop',  () => { this.updateNowPlaying(); this.syncPlayingState() })
    )
  }

  protected beforeUnmount(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }

  private async loadData(): Promise<void> {
    try {
      const [historyResult, favResult] = await Promise.all([
        this.bridge.history.getAll(),
        this.bridge.favorites.getAll()
      ])

      if (historyResult.success) this.recentHistory = historyResult.data.slice(0, 6)
      if (favResult.success)     this.favoritesCount = favResult.data.length
    } catch (_) {
      // Data unavailable — render with defaults (empty history, 0 favorites)
    }

    this.updateContent()
  }

  render(): string {
    return `<div class="home-view animate-fade-in"><div id="home-content"></div></div>`
  }

  private updateContent(): void {
    const content = this.querySelector('#home-content')
    if (!content) return

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

    content.innerHTML = `

      <!-- ── Greeting ── -->
      <div class="home-greeting">
        <h1>${greeting}</h1>
        <p class="home-greeting-sub">What would you like to listen to today?</p>
      </div>

      <!-- ── Now Playing ── -->
      <div id="home-now-playing"></div>

      <!-- ── Quick Stats (inline pills) ── -->
      <div class="home-stats-row">
        <button class="home-stat-pill" data-nav="/favorites">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
          <span class="home-stat-pill-value">${this.favoritesCount}</span>
          <span class="home-stat-pill-label">Favorites</span>
        </button>
        <button class="home-stat-pill" data-nav="/history">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>
          </svg>
          <span class="home-stat-pill-value">${this.recentHistory.length}</span>
          <span class="home-stat-pill-label">History</span>
        </button>
        <button class="home-stat-pill" data-nav="/featured">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
          </svg>
          <span class="home-stat-pill-label">Featured</span>
        </button>
        <button class="home-stat-pill" data-nav="/explore">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>
          </svg>
          <span class="home-stat-pill-label">Explore</span>
        </button>
      </div>

      <!-- ── Recently Played ── -->
      ${this.recentHistory.length > 0 ? `
        <section class="section">
          <div class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>
            </svg>
            Recently Played
          </div>
          <div class="grid grid-cols-auto">
            ${this.recentHistory.map(item => renderStationCard({
              station:    item.station,
              isPlaying:  this.playerStore.currentStation?.id === item.station.id && this.playerStore.isPlaying,
              isFavorite: this.favoritesStore.isFavorite(item.station.id)
            })).join('')}
          </div>
        </section>
      ` : `
        <section class="section">
          <div class="home-empty-section">
            <div class="home-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
              </svg>
            </div>
            <p class="home-empty-title">Start listening</p>
            <p class="home-empty-sub">Browse stations and your history will appear here</p>
            <button class="btn btn-primary home-cta-btn" data-nav="/featured">Browse Featured</button>
          </div>
        </section>
      `}
    `

    this.updateNowPlaying()
    this.attachListeners()
  }

  private syncPlayingState(): void {
    const currentId = this.playerStore.currentStation?.id ?? null
    const isPlaying = this.playerStore.isPlaying
    this.querySelectorAll<HTMLElement>('.station-card').forEach(card => {
      const active = isPlaying && card.getAttribute('data-station-id') === currentId
      card.classList.toggle('playing', active)
    })
  }

  private updateNowPlaying(): void {
    const container = this.querySelector('#home-now-playing')
    if (!container) return

    const station   = this.playerStore.currentStation
    const isPlaying = this.playerStore.isPlaying

    if (!station) {
      container.innerHTML = ''
      return
    }

    const flag = countryFlag(station.countryCode)

    container.innerHTML = `
      <div class="home-now-playing">
        <div class="home-now-playing-card">
          <div class="home-np-artwork">
            ${station.favicon
              ? `<img src="${station.favicon.replace(/"/g, '%22')}" alt="${this.esc(station.name)}" data-logo>`
              : `<div class="station-logo-fallback">${this.radioSvg()}</div>`
            }
          </div>
          <div class="home-np-info">
            <div class="home-np-status">
              ${isPlaying
                ? `<span class="home-np-live-dot"></span><span>Now Playing</span>`
                : `<span>Paused</span>`
              }
            </div>
            <div class="home-np-name">${this.esc(station.name)}</div>
            <div class="home-np-meta">
              ${flag} ${this.esc(station.country)}
              ${station.tags.length > 0 ? ` · ${this.esc(station.tags[0] ?? '')}` : ''}
              ${station.bitrate ? ` · ${station.bitrate} kbps` : ''}
            </div>
          </div>
          <div class="home-np-visualizer">
            ${isPlaying
              ? `<span class="home-np-bars">
                  <span></span><span></span><span></span><span></span>
                </span>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:var(--text-muted)">
                  <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                  <rect x="14" y="4" width="4" height="16" rx="1.5"/>
                </svg>`
            }
          </div>
        </div>
      </div>
    `
  }

  private attachListeners(): void {
    // Stat cards and quick links — navigate on click
    this.querySelectorAll('[data-nav]').forEach(el => {
      this.on(el, 'click', () => {
        const route = el.getAttribute('data-nav')
        if (route) this.router.navigate(route)
      })
    })

    // Station cards in recently played
    this.querySelectorAll('.station-card').forEach(card => {
      this.on(card, 'click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-action="favorite"]')) {
          e.stopPropagation()
          this.handleFavorite(target.closest('[data-action="favorite"]') as HTMLElement)
          return
        }
        const id = card.getAttribute('data-station-id')
        const item = this.recentHistory.find(h => h.station.id === id)
        if (item) this.playerStore.play(item.station)
      })
    })
  }

  private async handleFavorite(btn: HTMLElement): Promise<void> {
    const id = btn.getAttribute('data-station-id')
    const item = this.recentHistory.find(h => h.station.id === id)
    if (!item) return
    if (this.favoritesStore.isFavorite(item.station.id)) {
      await this.bridge.favorites.remove(item.station.id)
    } else {
      await this.bridge.favorites.add(item.station)
    }
    const result = await this.bridge.favorites.getAll()
    if (result.success) this.favoritesStore.setFavorites(result.data)
  }

  private radioSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}
