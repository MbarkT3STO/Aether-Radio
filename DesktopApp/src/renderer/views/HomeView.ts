import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { Router } from '../router/Router'
import { EventBus } from '../store/EventBus'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import { renderStationCard } from '../utils/renderCard'
import { countryFlagEmoji } from '../../domain/value-objects/Country'

export class HomeView extends BaseComponent {
  private bridge         = BridgeService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private router         = Router.getInstance()
  private eventBus       = EventBus.getInstance()

  private recentHistory: PlayHistory[] = []
  private favoritesCount = 0

  async afterMount(): Promise<void> {
    // Render the page structure immediately — don't wait for data
    this.updateContent()

    // Then load data and refresh
    await this.loadData()

    // Re-render now-playing card when station changes
    this.eventBus.on('player:play',  () => this.updateNowPlaying())
    this.eventBus.on('player:pause', () => this.updateNowPlaying())
    this.eventBus.on('player:stop',  () => this.updateNowPlaying())
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
        <div class="home-greeting-text">
          <h1>${greeting} 👋</h1>
          <p class="view-subtitle">What would you like to listen to today?</p>
        </div>
      </div>

      <!-- ── Now Playing ── -->
      <div id="home-now-playing"></div>

      <!-- ── Quick Stats ── -->
      <div class="home-stats">
        <div class="home-stat-card" data-nav="/favorites">
          <div class="home-stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div class="home-stat-info">
            <div class="home-stat-value">${this.favoritesCount}</div>
            <div class="home-stat-label">Favorites</div>
          </div>
        </div>

        <div class="home-stat-card" data-nav="/history">
          <div class="home-stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
            </svg>
          </div>
          <div class="home-stat-info">
            <div class="home-stat-value">${this.recentHistory.length}</div>
            <div class="home-stat-label">Recently Played</div>
          </div>
        </div>

        <div class="home-stat-card" data-nav="/featured">
          <div class="home-stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="home-stat-info">
            <div class="home-stat-value">Top</div>
            <div class="home-stat-label">Featured</div>
          </div>
        </div>

        <div class="home-stat-card" data-nav="/explore">
          <div class="home-stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <div class="home-stat-info">
            <div class="home-stat-value">Explore</div>
            <div class="home-stat-label">Countries & Genres</div>
          </div>
        </div>
      </div>

      <!-- ── Recently Played ── -->
      ${this.recentHistory.length > 0 ? `
        <section class="section">
          <div class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
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
          <div class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
            </svg>
            Recently Played
          </div>
          <div class="home-empty-section">
            <p>No history yet — start listening to see stations here.</p>
            <button class="btn btn-primary home-cta-btn" data-nav="/featured">Browse Featured Stations</button>
          </div>
        </section>
      `}

      <!-- ── Quick Links ── -->
      <section class="section">
        <div class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Quick Access
        </div>
        <div class="home-quick-links">
          <button class="home-quick-link" data-nav="/featured">
            <span class="home-quick-link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </span>
            <span class="home-quick-link-label">Featured Stations</span>
          </button>
          <button class="home-quick-link" data-nav="/explore">
            <span class="home-quick-link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
            </span>
            <span class="home-quick-link-label">Explore</span>
          </button>
          <button class="home-quick-link" data-nav="/search">
            <span class="home-quick-link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <span class="home-quick-link-label">Search</span>
          </button>
          <button class="home-quick-link" data-nav="/custom">
            <span class="home-quick-link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
                <path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
              </svg>
            </span>
            <span class="home-quick-link-label">My Stations</span>
          </button>
        </div>
      </section>
    `

    this.updateNowPlaying()
    this.attachListeners()
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

    const flag = countryFlagEmoji(station.countryCode)

    container.innerHTML = `
      <div class="home-now-playing">
        <div class="home-now-playing-label">
          <span class="home-now-playing-dot"></span>
          Now Playing
        </div>
        <div class="home-now-playing-card">
          <div class="home-now-playing-logo">
            ${station.favicon
              ? `<img src="${station.favicon.replace(/"/g, '%22')}" alt="${this.esc(station.name)}" data-logo>`
              : `<div class="station-logo-fallback">${this.radioSvg()}</div>`
            }
          </div>
          <div class="home-now-playing-info">
            <div class="home-now-playing-name">${this.esc(station.name)}</div>
            <div class="home-now-playing-meta">
              ${flag} ${this.esc(station.country)}
              ${station.tags.length > 0 ? ` · ${this.esc(station.tags[0] ?? '')}` : ''}
              ${station.bitrate ? ` · ${station.bitrate} kbps` : ''}
            </div>
          </div>
          <div class="home-now-playing-status ${isPlaying ? 'playing' : 'paused'}">
            ${isPlaying
              ? `<span class="home-now-playing-bars">
                  <span></span><span></span><span></span><span></span>
                </span>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
    return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}
