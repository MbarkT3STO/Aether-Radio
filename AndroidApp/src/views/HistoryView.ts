import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'
import type { PlayHistory } from '../domain/entities/PlayHistory'
import { renderStationCard } from '../utils/renderCard'

export class HistoryView extends BaseComponent {
  private bridge      = BridgeService.getInstance()
  private playerStore = PlayerStore.getInstance()
  private eventBus    = EventBus.getInstance()
  private history: PlayHistory[] = []
  private unsubscribers: Array<() => void> = []

  render(): string {
    return `
      <div class="history-view animate-fade-in">
        <div class="view-header view-header--split">
          <div>
            <div class="view-header-row">
              <div class="view-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
                </svg>
              </div>
              <h1>History</h1>
            </div>
            <p class="view-subtitle">Recently played stations</p>
          </div>
          <div id="clear-btn-container"></div>
        </div>
        <div id="history-content">
          <div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Loading history…</div></div>
        </div>
      </div>
    `
  }

  protected async afterMount(): Promise<void> {
    await this.loadHistory()
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

  private async loadHistory(): Promise<void> {
    const result = await this.bridge.history.getAll()
    if (result.success) {
      this.history = result.data
      this.updateContent()
    }
  }

  private updateContent(): void {
    const clearContainer = this.querySelector('#clear-btn-container')
    if (clearContainer) {
      clearContainer.innerHTML = this.history.length > 0 ? `
        <button id="clear-history" class="btn btn-secondary btn-secondary--top">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Clear All
        </button>` : ''

      const clearBtn = this.querySelector('#clear-history')
      if (clearBtn) {
        this.on(clearBtn, 'click', async () => {
          await this.bridge.history.clear()
          await this.loadHistory()
        })
      }
    }

    const content = this.querySelector('#history-content')
    if (!content) return

    if (this.history.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
            </svg>
          </div>
          <div class="empty-state-title">No history yet</div>
          <div class="empty-state-message">Stations you play will appear here</div>
        </div>`
      return
    }

    content.innerHTML = `
      <div class="results-count">${this.history.length.toLocaleString()} station${this.history.length !== 1 ? 's' : ''} played</div>
      <div class="grid grid-cols-auto">
        ${this.history.map(item => renderStationCard({
          station:     item.station,
          isPlaying:   this.playerStore.currentStation?.id === item.station.id && this.playerStore.isPlaying,
          isFavorite:  false,
          metaOverride: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${this.getTimeAgo(new Date(item.playedAt))}</span>`
        })).join('')}
      </div>
    `
    this.attachListeners()
  }

  private attachListeners(): void {
    this.querySelectorAll('.station-card').forEach(card => {
      this.on(card, 'click', () => {
        const id   = card.getAttribute('data-station-id')
        const item = this.history.find(h => h.station.id === id)
        if (item) this.playerStore.play(item.station)
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

  private getTimeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000)
    if (secs < 60)  return 'Just now'
    const mins = Math.floor(secs / 60)
    if (mins < 60)  return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  private esc = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
