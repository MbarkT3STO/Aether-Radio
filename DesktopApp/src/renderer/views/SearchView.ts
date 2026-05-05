import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import type { RadioStation } from '../../domain/entities/RadioStation'
import { renderStationCard } from '../utils/renderCard'

export class SearchView extends BaseComponent {
  private bridge         = BridgeService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private stations: RadioStation[] = []
  private searchTimeout: number | null = null

  render(): string {
    return `
      <div class="search-view animate-fade-in">
        <div class="view-header">
          <div class="view-header-row" style="margin-bottom:var(--space-md);">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <h1 id="search-title">Search</h1>
          </div>
          <div class="search-bar">
            <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" class="search-bar-input" placeholder="Search by name, country, or genre…" id="search-input" autocomplete="off">
            <button class="search-bar-clear" id="search-clear" title="Clear">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="search-results"></div>
      </div>
    `
  }

  protected async afterMount(): Promise<void> {
    const input    = this.querySelector<HTMLInputElement>('#search-input')
    const clearBtn = this.querySelector('#search-clear')

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const country = urlParams.get('country')
    const genre   = urlParams.get('genre')

    if (country) {
      if (input) input.value = country
      await this.loadByCountry(country)
      this.updateTitle(`Stations from ${country}`)
    } else if (genre) {
      if (input) input.value = genre
      await this.loadByGenre(genre)
      this.updateTitle(`${genre} Stations`)
    }

    if (input) {
      this.on(input, 'input', () => {
        if (this.searchTimeout) clearTimeout(this.searchTimeout)
        this.searchTimeout = window.setTimeout(() => this.performSearch(input.value), 320)
        clearBtn?.classList.toggle('visible', input.value.length > 0)
      })
    }

    if (clearBtn) {
      this.on(clearBtn, 'click', () => {
        if (input) {
          input.value = ''
          input.focus()
          clearBtn.classList.remove('visible')
          this.stations = []
          this.updateResults()
          this.updateTitle('Search')
        }
      })
    }
  }

  private updateTitle(title: string): void {
    const el = this.querySelector('#search-title')
    if (el) el.textContent = title
  }

  private showLoading(): void {
    const results = this.querySelector('#search-results')
    if (results) results.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Searching…</div></div>`
  }

  private async loadByCountry(code: string): Promise<void> {
    this.showLoading()
    const result = await this.bridge.radio.getByCountry(code, { limit: 100, offset: 0 })
    if (result.success) { this.stations = result.data; this.updateResults() }
  }

  private async loadByGenre(genre: string): Promise<void> {
    this.showLoading()
    const result = await this.bridge.radio.getByGenre(genre, { limit: 100, offset: 0 })
    if (result.success) { this.stations = result.data; this.updateResults() }
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.stations = []
      this.updateResults()
      this.updateTitle('Search')
      return
    }
    this.showLoading()
    this.updateTitle(`Results for "${query}"`)
    const result = await this.bridge.radio.search({ name: query }, { limit: 50, offset: 0 })
    if (result.success) { this.stations = result.data; this.updateResults() }
  }

  private updateResults(): void {
    const results = this.querySelector('#search-results')
    if (!results) return

    if (this.stations.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <div class="empty-state-title">No results found</div>
          <div class="empty-state-message">Try a different search term or browse by country and genre</div>
        </div>`
      return
    }

    results.innerHTML = `
      <div class="results-count">${this.stations.length} station${this.stations.length !== 1 ? 's' : ''} found</div>
      <div class="grid grid-cols-auto">
        ${this.stations.map(s => renderStationCard({
          station: s,
          isPlaying:  this.playerStore.currentStation?.id === s.id && this.playerStore.isPlaying,
          isFavorite: this.favoritesStore.isFavorite(s.id)
        })).join('')}
      </div>
    `
    this.attachListeners()
  }

  private attachListeners(): void {
    this.querySelectorAll('.station-card').forEach(card => {
      this.on(card, 'click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-action="favorite"]')) {
          e.stopPropagation()
          this.handleFavorite(target.closest('[data-action="favorite"]') as HTMLElement)
          return
        }
        const id = card.getAttribute('data-station-id')
        const station = this.stations.find(s => s.id === id)
        if (station) this.playerStore.play(station)
      })
    })
  }

  private async handleFavorite(btn: HTMLElement): Promise<void> {
    const id = btn.getAttribute('data-station-id')
    const station = this.stations.find(s => s.id === id)
    if (!station) return
    if (this.favoritesStore.isFavorite(station.id)) {
      await this.bridge.favorites.remove(station.id)
    } else {
      await this.bridge.favorites.add(station)
    }
    const result = await this.bridge.favorites.getAll()
    if (result.success) { this.favoritesStore.setFavorites(result.data); this.updateResults() }
  }

  private esc = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
