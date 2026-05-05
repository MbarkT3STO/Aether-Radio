import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { EventBus } from '../store/EventBus'
import type { Favorite } from '../../domain/entities/Favorite'
import { renderStationCard } from '../utils/renderCard'

export class FavoritesView extends BaseComponent {
  private bridge         = BridgeService.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private eventBus       = EventBus.getInstance()
  private favorites: Favorite[] = []
  private unsubscribers: Array<() => void> = []

  constructor(props: Record<string, never>) {
    super(props)
  }

  async afterMount(): Promise<void> {
    // Subscribe and store unsubscriber
    this.unsubscribers.push(
      this.eventBus.on('favorites:changed', ({ favorites }) => {
        this.favorites = favorites
        this.updateContent()
      })
    )
    await this.loadFavorites()
  }

  protected beforeUnmount(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }

  private async loadFavorites(): Promise<void> {
    const result = await this.bridge.favorites.getAll()
    if (result.success) {
      this.favorites = result.data
      this.favoritesStore.setFavorites(result.data)
      this.updateContent()
    }
  }

  render(): string {
    return `
      <div class="favorites-view animate-fade-in">
        <div class="view-header">
          <div class="view-header-row">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h1>Favorites</h1>
          </div>
          <p class="view-subtitle" id="fav-count">Loading…</p>
        </div>
        <div id="favorites-content"></div>
      </div>
    `
  }

  private updateContent(): void {
    const countEl = this.querySelector('#fav-count')
    if (countEl) {
      const n = this.favorites.length
      countEl.textContent = `${n} saved station${n !== 1 ? 's' : ''}`
    }

    const content = this.querySelector('#favorites-content')
    if (!content) return

    if (this.favorites.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div class="empty-state-title">No favorites yet</div>
          <div class="empty-state-message">Tap the heart icon on any station to save it here</div>
        </div>`
      return
    }

    content.innerHTML = `
      <div class="grid grid-cols-auto">
        ${this.favorites.map(fav => renderStationCard({
          station:     fav.station,
          isPlaying:   this.playerStore.currentStation?.id === fav.station.id && this.playerStore.isPlaying,
          isFavorite:  true,
          alwaysActive: true
        })).join('')}
      </div>
    `
    this.attachListeners()
  }

  private attachListeners(): void {
    this.querySelectorAll('.station-card').forEach(card => {
      this.on(card, 'click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-action="remove"]')) {
          e.stopPropagation()
          this.handleRemove(target.closest('[data-action="remove"]') as HTMLElement)
          return
        }
        const id  = card.getAttribute('data-station-id')
        const fav = this.favorites.find(f => f.station.id === id)
        if (fav) this.playerStore.play(fav.station)
      })
    })
  }

  private async handleRemove(btn: HTMLElement): Promise<void> {
    const id = btn.getAttribute('data-station-id')
    if (!id) return
    await this.bridge.favorites.remove(id)
    await this.loadFavorites()
  }

  private esc = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
