import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { stationLogoHtml } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class ExpandedPlayer extends BaseComponent {
  private eventBus = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge = BridgeService.getInstance()
  private onClose: () => void
  // Store unsubscribers so EventBus handlers are cleaned up when the player closes
  private unsubscribers: Array<() => void> = []

  constructor(onClose: () => void) {
    super({})
    this.onClose = onClose
    // Register handlers and store unsubscribers — prevents accumulation on reopen
    this.unsubscribers.push(
      this.eventBus.on('player:play',       () => this.onStationChange()),
      this.eventBus.on('player:pause',      () => this.updateControls()),
      this.eventBus.on('player:stop',       () => this.close()),
      this.eventBus.on('player:loading',    ({ loading }) => this.updateLoadingUI(loading)),
      this.eventBus.on('favorites:changed', () => this.updateFavBtn())
    )
  }

  render(): string {
    const station = this.playerStore.currentStation
    const isPlaying = this.playerStore.isPlaying
    const isLoading = this.playerStore.isLoading

    if (!station) return '<div class="expanded-player"></div>'

    const isFav = this.favoritesStore.isFavorite(station.id)
    const bitrate = station.bitrate ? `${station.bitrate} kbps` : ''
    const codec = station.codec || ''
    const votes = station.votes ? `${station.votes.toLocaleString()} votes` : ''
    const meta = [bitrate, codec, votes].filter(Boolean).join(' · ')

    return `
      <div class="expanded-player" id="expanded-player-root">
        <!-- Backdrop -->
        <div class="expanded-player-backdrop" id="ep-backdrop"></div>

        <!-- Sheet -->
        <div class="expanded-player-sheet" id="ep-sheet">
          <!-- Drag handle -->
          <div class="expanded-player-handle"></div>

          <!-- Close button -->
          <button class="expanded-player-close" id="ep-close" aria-label="Close player">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          <!-- Artwork -->
          <div class="expanded-player-artwork" id="ep-artwork">
            ${stationLogoHtml(station.favicon, station.name, 'player')}
            ${isPlaying ? `<div class="expanded-player-artwork-glow"></div>` : ''}
          </div>

          <!-- Station info -->
          <div class="expanded-player-info">
            <div class="expanded-player-name">${this.esc(station.name)}</div>
            <div class="expanded-player-meta">
              ${countryFlag(station.countryCode)} ${this.esc(station.country)}
              ${station.tags[0] ? ` · ${this.esc(station.tags[0])}` : ''}
            </div>
            ${meta ? `<div class="expanded-player-stats">${this.esc(meta)}</div>` : ''}
          </div>

          <!-- Controls -->
          <div class="expanded-player-controls">
            <!-- Favorite -->
            <button class="ep-btn ep-btn--icon" id="ep-fav-btn"
              title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                style="color:${isFav ? 'var(--accent-secondary)' : 'var(--text-secondary)'}">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>

            <!-- Play/Pause -->
            <button class="ep-btn ep-btn--play ${isPlaying ? 'playing' : ''}"
              id="ep-play-btn" data-action="${isPlaying ? 'pause' : 'play'}">
              ${isLoading
                ? `<span class="loading-spinner loading-spinner--lg"></span>`
                : (isPlaying ? this.pauseIcon() : this.playIcon())
              }
            </button>

            <!-- Stop -->
            <button class="ep-btn ep-btn--icon" id="ep-stop-btn" title="Stop">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
          </div>

          <!-- Live indicator -->
          ${isPlaying ? `
            <div class="expanded-player-live">
              <span class="expanded-player-live-dot"></span>
              <span>LIVE</span>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  protected afterMount(): void {
    this.attachListeners()
    // Animate in
    requestAnimationFrame(() => {
      const sheet = this.querySelector<HTMLElement>('#ep-sheet')
      const backdrop = this.querySelector<HTMLElement>('#ep-backdrop')
      if (sheet) sheet.classList.add('open')
      if (backdrop) backdrop.classList.add('open')
    })
  }

  protected beforeUnmount(): void {
    // Clean up all EventBus subscriptions — prevents handler accumulation
    this.unsubscribers.forEach(u => u())
    this.unsubscribers = []
  }

  private attachListeners(): void {
    const closeBtn = this.querySelector('#ep-close')
    if (closeBtn) this.on(closeBtn, 'click', () => this.close())

    const backdrop = this.querySelector('#ep-backdrop')
    if (backdrop) this.on(backdrop, 'click', () => this.close())

    const playBtn = this.querySelector('#ep-play-btn')
    if (playBtn) {
      this.on(playBtn, 'click', (e) => {
        e.stopPropagation()
        if (this.playerStore.isPlaying) {
          this.playerStore.pause()
        } else if (this.playerStore.currentStation) {
          this.playerStore.play(this.playerStore.currentStation)
        }
      })
    }

    const stopBtn = this.querySelector('#ep-stop-btn')
    if (stopBtn) {
      this.on(stopBtn, 'click', (e) => {
        e.stopPropagation()
        this.playerStore.stop()
      })
    }

    const favBtn = this.querySelector('#ep-fav-btn')
    if (favBtn) {
      this.on(favBtn, 'click', async (e) => {
        e.stopPropagation()
        const station = this.playerStore.currentStation
        if (!station) return
        if (this.favoritesStore.isFavorite(station.id)) {
          await this.bridge.favorites.remove(station.id)
        } else {
          await this.bridge.favorites.add(station)
        }
        const result = await this.bridge.favorites.getAll()
        if (result.success) this.favoritesStore.setFavorites(result.data)
      })
    }

    // Swipe down to close
    this.setupSwipeToClose()
  }

  private setupSwipeToClose(): void {
    const sheet = this.querySelector<HTMLElement>('#ep-sheet')
    if (!sheet) return

    let startY = 0
    let currentY = 0
    let isDragging = false

    const onTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches[0]
      startY = touch.clientY
      currentY = touch.clientY
      isDragging = true
      sheet.style.transition = 'none'
    }

    const onTouchMove = (e: Event) => {
      if (!isDragging) return
      const touch = (e as TouchEvent).touches[0]
      currentY = touch.clientY
      const delta = Math.max(0, currentY - startY)
      sheet.style.transform = `translateY(${delta}px)`
    }

    const onTouchEnd = () => {
      if (!isDragging) return
      isDragging = false
      sheet.style.transition = ''
      const delta = currentY - startY
      if (delta > 120) {
        this.close()
      } else {
        sheet.style.transform = ''
      }
    }

    // Use this.on() so BaseComponent tracks and cleans up these listeners
    this.on(sheet, 'touchstart', onTouchStart)
    this.on(sheet, 'touchmove', onTouchMove)
    this.on(sheet, 'touchend', onTouchEnd)
  }

  close(): void {
    const sheet = this.querySelector<HTMLElement>('#ep-sheet')
    const backdrop = this.querySelector<HTMLElement>('#ep-backdrop')
    if (sheet) sheet.classList.remove('open')
    if (backdrop) backdrop.classList.remove('open')
    setTimeout(() => this.onClose(), 300)
  }

  // Called on player:play — station may have changed, so re-render artwork + info
  private onStationChange(): void {
    const station = this.playerStore.currentStation
    if (!station) return

    // Update artwork
    const artwork = this.querySelector<HTMLElement>('#ep-artwork')
    if (artwork) {
      artwork.innerHTML = `
        ${stationLogoHtml(station.favicon, station.name, 'player')}
        <div class="expanded-player-artwork-glow"></div>
      `
    }

    // Update station info
    const nameEl = this.querySelector<HTMLElement>('.expanded-player-name')
    if (nameEl) nameEl.textContent = station.name

    const metaEl = this.querySelector<HTMLElement>('.expanded-player-meta')
    if (metaEl) metaEl.innerHTML = `
      ${countryFlag(station.countryCode)} ${this.esc(station.country)}
      ${station.tags[0] ? ` · ${this.esc(station.tags[0])}` : ''}
    `

    const statsEl = this.querySelector<HTMLElement>('.expanded-player-stats')
    const bitrate = station.bitrate ? `${station.bitrate} kbps` : ''
    const codec = station.codec || ''
    const votes = station.votes ? `${station.votes.toLocaleString()} votes` : ''
    const meta = [bitrate, codec, votes].filter(Boolean).join(' · ')
    if (statsEl) statsEl.textContent = meta

    // Also update controls (play state, fav button)
    this.updateControls()
    this.updateFavBtn()
  }

  private updateControls(): void {
    const isPlaying = this.playerStore.isPlaying
    const playBtn = this.querySelector<HTMLElement>('#ep-play-btn')
    if (!playBtn) return
    playBtn.classList.toggle('playing', isPlaying)
    playBtn.setAttribute('data-action', isPlaying ? 'pause' : 'play')
    if (!this.playerStore.isLoading) {
      playBtn.innerHTML = isPlaying ? this.pauseIcon() : this.playIcon()
    }

    // Update live indicator
    const liveEl = this.querySelector<HTMLElement>('.expanded-player-live')
    const sheet = this.querySelector<HTMLElement>('.expanded-player-sheet')
    if (isPlaying && !liveEl && sheet) {
      sheet.insertAdjacentHTML('beforeend', `
        <div class="expanded-player-live">
          <span class="expanded-player-live-dot"></span>
          <span>LIVE</span>
        </div>
      `)
    } else if (!isPlaying && liveEl) {
      liveEl.remove()
    }

    // Update artwork glow
    const glow = this.querySelector<HTMLElement>('.expanded-player-artwork-glow')
    const artwork = this.querySelector<HTMLElement>('#ep-artwork')
    if (isPlaying && !glow && artwork) {
      artwork.insertAdjacentHTML('beforeend', `<div class="expanded-player-artwork-glow"></div>`)
    } else if (!isPlaying && glow) {
      glow.remove()
    }
  }

  private updateLoadingUI(loading: boolean): void {
    const playBtn = this.querySelector<HTMLElement>('#ep-play-btn')
    if (!playBtn) return
    const isPlaying = this.playerStore.isPlaying
    playBtn.innerHTML = loading
      ? `<span class="loading-spinner loading-spinner--lg"></span>`
      : (isPlaying ? this.pauseIcon() : this.playIcon())
  }

  private updateFavBtn(): void {
    const station = this.playerStore.currentStation
    if (!station) return
    const isFav = this.favoritesStore.isFavorite(station.id)
    const btn = this.querySelector<HTMLElement>('#ep-fav-btn')
    if (!btn) return
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="color:${isFav ? 'var(--accent-secondary)' : 'var(--text-secondary)'}">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  private playIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
  }

  private pauseIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}
