import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { EventBus } from '../store/EventBus'
import type { RadioStation } from '../domain/entities/RadioStation'
import { renderStationCard } from '../utils/renderCard'

export class FeaturedView extends BaseComponent {
  private bridge         = BridgeService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private stations: RadioStation[] = []
  private loading = true
  private unsubscribers: Array<() => void> = []
  private eventBus = EventBus.getInstance()

  async afterMount(): Promise<void> {
    await this.loadStations()
    this.unsubscribers.push(
      this.eventBus.on('player:play',  () => this.syncPlayingState()),
      this.eventBus.on('player:pause', () => this.syncPlayingState()),
      this.eventBus.on('player:stop',  () => this.syncPlayingState())
    )
  }

  protected beforeUnmount(): void {
    this.unsubscribers.forEach(u => u())
    this.unsubscribers = []
  }

  private async loadStations(): Promise<void> {
    const result = await this.bridge.radio.getTop(100)
    if (result.success) {
      this.stations = result.data
      this.loading  = false
      this.updateContent()
    }
  }

  render(): string {
    return `
      <div class="featured-view animate-fade-in">
        <div class="view-header">
          <div class="view-header-row">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h1>Featured Stations</h1>
          </div>
          <p class="view-subtitle">Top voted radio stations from around the world</p>
        </div>
        <div id="featured-grid">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading stations…</div>
          </div>
        </div>
      </div>
    `
  }

  private updateContent(): void {
    const grid = this.querySelector('#featured-grid')
    if (!grid) return

    if (this.stations.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="empty-state-title">No stations found</div>
          <div class="empty-state-message">Try refreshing or check your connection</div>
        </div>`
      return
    }

    grid.innerHTML = `
      <div class="results-count">${this.stations.length.toLocaleString()} station${this.stations.length !== 1 ? 's' : ''}</div>
      <div class="grid grid-cols-auto">
        ${this.stations.map(s => renderStationCard({
          station:    s,
          isPlaying:  this.playerStore.currentStation?.id === s.id && this.playerStore.isPlaying,
          isFavorite: this.favoritesStore.isFavorite(s.id)
        })).join('')}
      </div>
    `
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
    if (result.success) { this.favoritesStore.setFavorites(result.data); this.updateContent() }
  }
}
