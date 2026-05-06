import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { AudioService } from '../services/AudioService'
import { stationLogoHtml } from '../utils/stationLogo'

export class MiniPlayer extends BaseComponent {
  private eventBus       = EventBus.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge         = BridgeService.getInstance()
  private audioService   = AudioService.getInstance()
  private _renderedStationId: string | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('player:play',    () => this.onStateChange())
    this.eventBus.on('player:pause',   () => this.onStateChange())
    this.eventBus.on('player:stop',    () => this.onStopChange())
    this.eventBus.on('player:loading', ({ loading }) => this.updateLoadingUI(loading))
    this.eventBus.on('favorites:changed', () => this.updateFavBtn())
  }

  render(): string {
    const station   = this.playerStore.currentStation
    const isPlaying = this.playerStore.isPlaying
    const isLoading = this.playerStore.isLoading

    if (!station) {
      return `<div class="mini-player mini-player--empty">
        <div class="mini-player-idle">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
          <span>No station playing</span>
        </div>
      </div>`
    }

    const isFav = this.favoritesStore.isFavorite(station.id)
    return `
      <div class="mini-player">
        <div class="mini-player-logo">
          ${stationLogoHtml(station.favicon, station.name, 'player')}
          ${isPlaying ? `<span class="mini-player-live-dot"></span>` : ''}
        </div>
        <div class="mini-player-info">
          <div class="mini-player-name">${this.esc(station.name)}</div>
          <div class="mini-player-meta">${this.esc(station.country)}${station.bitrate ? ` · ${station.bitrate} kbps` : ''}</div>
        </div>
        <div class="mini-player-controls">
          <button class="mini-player-btn mini-player-fav${isFav ? ' active' : ''}" id="mp-fav" aria-label="Favorite">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
          <button class="mini-player-btn mini-player-play${isPlaying ? ' playing' : ''}" id="mp-play" aria-label="${isPlaying ? 'Pause' : 'Play'}">
            ${isLoading
              ? `<span class="loading-spinner loading-spinner--sm"></span>`
              : isPlaying
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            }
          </button>
          <button class="mini-player-btn mini-player-stop" id="mp-stop" aria-label="Stop">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          </button>
        </div>
      </div>
    `
  }

  protected afterMount(): void {
    this._renderedStationId = this.playerStore.currentStation?.id ?? null
    this.attachListeners()
  }

  private attachListeners(): void {
    const playBtn = this.querySelector('#mp-play')
    const stopBtn = this.querySelector('#mp-stop')
    const favBtn  = this.querySelector('#mp-fav')

    if (playBtn) {
      this.on(playBtn, 'click', () => {
        if (this.playerStore.isPlaying) this.playerStore.pause()
        else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
      })
    }
    if (stopBtn) this.on(stopBtn, 'click', () => this.playerStore.stop())
    if (favBtn) {
      this.on(favBtn, 'click', async () => {
        const station = this.playerStore.currentStation
        if (!station) return
        if (this.favoritesStore.isFavorite(station.id)) {
          await this.bridge.favorites.remove(station.id)
        } else {
          await this.bridge.favorites.add(station)
        }
        const res = await this.bridge.favorites.getAll()
        if (res.success) this.favoritesStore.setFavorites(res.data)
      })
    }
  }

  private onStateChange(): void {
    const station = this.playerStore.currentStation
    if (!station || !this.querySelector('#mp-play') || station.id !== this._renderedStationId) {
      this.fullRender(); return
    }
    const isPlaying = this.playerStore.isPlaying
    const playBtn = this.querySelector<HTMLElement>('#mp-play')
    if (playBtn) {
      playBtn.classList.toggle('playing', isPlaying)
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play')
      playBtn.innerHTML = isPlaying
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
    }
    const dot = this.querySelector('.mini-player-live-dot')
    const logoWrap = this.querySelector('.mini-player-logo')
    if (isPlaying && !dot && logoWrap) {
      logoWrap.insertAdjacentHTML('beforeend', `<span class="mini-player-live-dot"></span>`)
    } else if (!isPlaying && dot) dot.remove()
  }

  private onStopChange(): void {
    this._renderedStationId = null
    this.fullRender()
  }

  private updateLoadingUI(loading: boolean): void {
    const playBtn = this.querySelector<HTMLElement>('#mp-play')
    if (!playBtn) { this.fullRender(); return }
    const isPlaying = this.playerStore.isPlaying
    playBtn.innerHTML = loading
      ? `<span class="loading-spinner loading-spinner--sm"></span>`
      : isPlaying
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
  }

  private updateFavBtn(): void {
    const station = this.playerStore.currentStation
    if (!station) return
    const isFav = this.favoritesStore.isFavorite(station.id)
    const btn = this.querySelector<HTMLElement>('#mp-fav')
    if (!btn) return
    btn.classList.toggle('active', isFav)
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  private fullRender(): void {
    if (this.element?.parentNode) {
      const parent = this.element.parentNode as HTMLElement
      parent.innerHTML = this.render()
      this.element = parent.firstElementChild as HTMLElement
      this._renderedStationId = this.playerStore.currentStation?.id ?? null
      this.afterMount()
    }
  }

  private esc(t: string): string {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
}
