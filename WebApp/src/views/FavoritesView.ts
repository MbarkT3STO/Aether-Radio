import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { EventBus } from '../store/EventBus'
import type { Favorite } from '../domain/entities/Favorite'
import { renderStationCard } from '../utils/renderCard'
import { removeCardWithFade } from '../utils/cardDom'

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
    this.unsubscribers.push(
      this.eventBus.on('favorites:changed', ({ favorites }) => {
        this.diffUpdate(favorites)
      }),
      this.eventBus.on('player:play',  () => this.syncPlayingState()),
      this.eventBus.on('player:pause', () => this.syncPlayingState()),
      this.eventBus.on('player:stop',  () => this.syncPlayingState())
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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h1>Favorites</h1>
          </div>
          <p class="view-subtitle" id="fav-count"></p>
        </div>
        <div id="favorites-content"></div>
      </div>
    `
  }

  private updateContent(): void {
    const countEl = this.querySelector('#fav-count')
    if (countEl) {
      const n = this.favorites.length
      countEl.innerHTML = n > 0
        ? `<span class="fav-count-badge">${n}</span> saved station${n !== 1 ? 's' : ''}`
        : 'No favorites yet'
    }

    const content = this.querySelector('#favorites-content')
    if (!content) return

    if (this.favorites.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
      const handleActivate = (e: Event) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-action="remove"]')) {
          e.stopPropagation()
          this.handleRemove(target.closest('[data-action="remove"]') as HTMLElement)
          return
        }
        const id  = card.getAttribute('data-station-id')
        const fav = this.favorites.find(f => f.station.id === id)
        if (fav) this.playerStore.play(fav.station)
      }
      this.on(card, 'click', handleActivate)
      this.on(card, 'keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault()
          handleActivate(e)
        }
      })
    })
  }

  private syncPlayingState(): void {
    const currentId = this.playerStore.currentStation?.id ?? null
    const isPlaying = this.playerStore.isPlaying
    this.querySelectorAll<HTMLElement>('.station-card').forEach(card => {
      const active = isPlaying && card.getAttribute('data-station-id') === currentId
      card.classList.toggle('playing', active)
    })
  }

  private async handleRemove(btn: HTMLElement): Promise<void> {
    const id = btn.getAttribute('data-station-id')
    if (!id) return

    // Optimistically fade the card out while the persistence call runs
    const grid = this.querySelector('#favorites-content')
    if (grid) removeCardWithFade(grid, id)

    await this.bridge.favorites.remove(id)

    // Refresh the shared store — diffUpdate will reconcile the DOM
    const result = await this.bridge.favorites.getAll()
    if (result.success) this.favoritesStore.setFavorites(result.data)
  }

  /**
   * Incrementally reconcile the rendered favorites with the new list.
   * Only removes cards that no longer exist and prepends new ones —
   * no full grid rebuild, so scroll position and focus are preserved.
   */
  private diffUpdate(next: Favorite[]): void {
    const prev = this.favorites
    this.favorites = next

    // If we were empty or became empty, fall back to a full render
    if (prev.length === 0 || next.length === 0) {
      this.updateContent()
      return
    }

    const root = this.querySelector('#favorites-content')
    const grid = root?.querySelector<HTMLElement>('.grid')
    if (!grid) { this.updateContent(); return }

    const nextIds = new Set(next.map(f => f.station.id))
    const prevIds = new Set(prev.map(f => f.station.id))

    // Remove cards no longer in favorites
    prev.forEach(f => {
      if (!nextIds.has(f.station.id)) {
        const card = grid.querySelector<HTMLElement>(`.station-card[data-station-id="${CSS.escape(f.station.id)}"]`)
        card?.remove()
      }
    })

    // Prepend newly added favorites (in reverse so first-added stays on top)
    const added = next.filter(f => !prevIds.has(f.station.id))
    if (added.length) {
      const isPlaying = this.playerStore.isPlaying
      const currentId = this.playerStore.currentStation?.id ?? null
      const html = added.map(fav => renderStationCard({
        station:      fav.station,
        isPlaying:    currentId === fav.station.id && isPlaying,
        isFavorite:   true,
        alwaysActive: true,
      })).join('')
      grid.insertAdjacentHTML('afterbegin', html)
      this.attachListeners()
    }

    // Update the count pill
    const countEl = this.querySelector('#fav-count')
    if (countEl) {
      const n = this.favorites.length
      countEl.innerHTML = n > 0
        ? `<span class="fav-count-badge">${n}</span> saved station${n !== 1 ? 's' : ''}`
        : 'No favorites yet'
    }
  }

  private esc = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
