import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { VisualizerService } from '../services/VisualizerService'
import { AudioService } from '../services/AudioService'
import { FALLBACK_HTML } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class PlayerBar extends BaseComponent {
  private eventBus       = EventBus.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge         = BridgeService.getInstance()
  private visualizer     = new VisualizerService()
  private audioService   = AudioService.getInstance()

  // Document-level drag listeners — kept so we can remove them on unmount
  private _onMouseMove: ((e: Event) => void) | null = null
  private _onMouseUp:   (() => void) | null = null

  // Track which station is currently rendered so we can detect station changes
  private _renderedStationId: string | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('player:play',       () => this.onPlayStateChange())
    this.eventBus.on('player:pause',      () => this.onPlayStateChange())
    this.eventBus.on('player:stop',       () => this.onStopChange())
    this.eventBus.on('player:volume',     ({ volume }) => this.updateVolumeUI(volume))
    this.eventBus.on('player:loading',    ({ loading }) => this.updateLoadingUI(loading))
    this.eventBus.on('favorites:changed', () => this.updateFavoriteUI())
  }

  render(): string {
    const station   = this.playerStore.currentStation
    const isPlaying = this.playerStore.isPlaying
    const isLoading = this.playerStore.isLoading
    const volume    = this.playerStore.volume

    // ── Empty state ──────────────────────────────────────────
    if (!station) {
      return `
        <div class="player-bar">

          <div class="player-station-info">
            <div class="player-empty-icon">${this.radioIcon()}</div>
            <div class="player-station-details">
              <div class="player-empty-name">No station playing</div>
              <div class="player-empty-hint">Select a station to start listening</div>
            </div>
          </div>

          <div class="player-controls">
            <button class="player-btn player-btn-play player-btn-disabled" disabled>
              ${this.playIcon()}
            </button>
          </div>

          <div class="player-extras">
            <div class="player-volume">
              <button class="player-btn player-btn-mute" disabled>
                ${this.volumeIcon(this.playerStore.volume)}
              </button>
              <div class="volume-slider">
                <div class="volume-slider-fill" style="width:${Math.round(this.playerStore.volume * 100)}%">
                  <div class="volume-slider-thumb"></div>
                </div>
              </div>
            </div>
            <div class="player-visualizer-container">${this.idleBars()}</div>
          </div>

        </div>
      `
    }

    // ── Active state ─────────────────────────────────────────
    const isFavorite = this.favoritesStore.isFavorite(station.id)
    const volPct     = Math.round(volume * 100)

    return `
      <div class="player-bar">

        <!-- LEFT: Station info -->
        <div class="player-station-info">
          <div class="player-station-logo-wrap">
            ${this.logoInnerHtml(station.favicon, station.name)}
            ${isPlaying ? `<span class="player-live-dot" id="player-live-dot"></span>` : ''}
          </div>
          <div class="player-station-details">
            <div class="player-station-name">${this.esc(station.name)}</div>
            <div class="player-station-meta" id="player-station-meta">
              ${this.buildMetaHtml(station.countryCode, station.country, station.tags, station.bitrate, isLoading)}
            </div>
          </div>
        </div>

        <!-- CENTER: Controls -->
        <div class="player-controls">

          <button class="player-btn player-btn-stop" data-action="stop" title="Stop">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2"/>
            </svg>
          </button>

          <button class="player-btn player-btn-play ${isPlaying ? 'playing' : ''}"
            id="player-play-btn"
            data-action="${isPlaying ? 'pause' : 'play'}"
            title="${isPlaying ? 'Pause' : 'Play'}">
            ${isLoading
              ? `<span class="loading-spinner loading-spinner--md"></span>`
              : (isPlaying ? this.pauseIcon() : this.playIcon())
            }
          </button>

          <button class="player-btn player-card-favorite ${isFavorite ? 'active' : ''}"
            id="player-favorite-btn"
            data-action="favorite"
            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="${isFavorite ? 'currentColor' : 'none'}"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>

        </div>

        <!-- RIGHT: Volume + Visualizer -->
        <div class="player-extras">

          <div class="player-volume">
            <button class="player-btn player-btn-mute" id="player-mute-btn" data-action="mute"
              title="${volume === 0 ? 'Unmute' : 'Mute'}">
              ${this.volumeIcon(volume)}
            </button>
            <div class="volume-slider" id="player-volume-slider" title="${volPct}%">
              <div class="volume-slider-fill" id="player-volume-fill" style="width:${volPct}%">
                <div class="volume-slider-thumb"></div>
              </div>
            </div>
          </div>

          <div class="player-visualizer-container" id="player-visualizer-container">
            ${isPlaying
              ? `<canvas id="visualizer-canvas" width="68" height="28"></canvas>`
              : this.idleBars()
            }
          </div>

        </div>

      </div>
    `
  }

  protected afterMount(): void {
    this.attachEventListeners()
    this.initializeVisualizer()
  }

  protected beforeUnmount(): void {
    this.visualizer.stopVisualization()
    this.removeDragListeners()
  }

  // ── Surgical DOM update methods ───────────────────────────────────────────

  /**
   * Called on player:play and player:pause.
   * - Empty→active transition: full render (no #player-play-btn yet)
   * - Station changed: full render to update name, logo, meta
   * - Same station play/pause: surgical update only
   */
  private onPlayStateChange(): void {
    const station = this.playerStore.currentStation

    // No station, active DOM not rendered yet, or station changed → full render
    if (
      !station ||
      !this.element ||
      !this.querySelector('#player-play-btn') ||
      station.id !== this._renderedStationId
    ) {
      this.fullRender()
      return
    }

    const isPlaying = this.playerStore.isPlaying
    const isLoading = this.playerStore.isLoading

    // Play button
    const playBtn = this.querySelector<HTMLElement>('#player-play-btn')
    if (playBtn) {
      playBtn.classList.toggle('playing', isPlaying)
      playBtn.setAttribute('data-action', isPlaying ? 'pause' : 'play')
      playBtn.title = isPlaying ? 'Pause' : 'Play'
      if (!isLoading) {
        playBtn.innerHTML = isPlaying ? this.pauseIcon() : this.playIcon()
      }
    }

    // Live dot
    const logoWrap = this.querySelector<HTMLElement>('.player-station-logo-wrap')
    if (logoWrap) {
      const existingDot = logoWrap.querySelector('#player-live-dot')
      if (isPlaying && !existingDot) {
        logoWrap.insertAdjacentHTML('beforeend', `<span class="player-live-dot" id="player-live-dot"></span>`)
      } else if (!isPlaying && existingDot) {
        existingDot.remove()
      }
    }

    // Sync favorite button in case it changed while paused
    this.updateFavoriteUI()

    // Visualizer
    this.syncVisualizer(isPlaying)
  }

  /**
   * Called on player:stop — station becomes null, need full re-render to
   * switch to the empty state template.
   */
  private onStopChange(): void {
    this._renderedStationId = null
    this.fullRender()
  }

  /**
   * Updates only the loading spinner inside the play button and the
   * "Connecting…" text in the meta line.
   */
  private updateLoadingUI(loading: boolean): void {
    // If the active-state DOM isn't rendered yet, do a full render instead
    if (!this.querySelector('#player-play-btn')) {
      this.fullRender()
      return
    }

    const isPlaying = this.playerStore.isPlaying
    const station   = this.playerStore.currentStation

    const playBtn = this.querySelector<HTMLElement>('#player-play-btn')
    if (playBtn) {
      playBtn.innerHTML = loading
        ? `<span class="loading-spinner loading-spinner--md"></span>`
        : (isPlaying ? this.pauseIcon() : this.playIcon())
    }

    if (station) {
      const meta = this.querySelector<HTMLElement>('#player-station-meta')
      if (meta) {
        meta.innerHTML = this.buildMetaHtml(
          station.countryCode, station.country, station.tags, station.bitrate, loading
        )
      }
    }
  }

  /**
   * Updates only the favorite button icon/state.
   */
  private updateFavoriteUI(): void {
    const station = this.playerStore.currentStation
    if (!station) return
    const isFavorite = this.favoritesStore.isFavorite(station.id)
    const btn = this.querySelector<HTMLElement>('#player-favorite-btn')
    if (!btn) return
    btn.classList.toggle('active', isFavorite)
    btn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites'
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="${isFavorite ? 'currentColor' : 'none'}"
      stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  /**
   * Full re-render — used when the station changes or on empty→active transition.
   * Records the rendered station ID so subsequent play/pause events can take
   * the fast surgical path.
   */
  private fullRender(): void {
    if (this.element && this.element.parentNode) {
      this.visualizer.stopVisualization()
      this.removeDragListeners()
      const parent = this.element.parentNode as HTMLElement
      parent.innerHTML = this.render()
      this.element = parent.firstElementChild as HTMLElement
      // Record which station is now rendered
      this._renderedStationId = this.playerStore.currentStation?.id ?? null
      this.setupImageErrorHandlers()
      this.afterMount()
      // Sync favorite state for the newly rendered station
      this.updateFavoriteUI()
    }
  }

  private syncVisualizer(isPlaying: boolean): void {
    const container = this.querySelector<HTMLElement>('#player-visualizer-container')
    if (!container) return

    if (isPlaying) {
      const existingCanvas = container.querySelector('#visualizer-canvas')
      if (!existingCanvas) {
        this.visualizer.stopVisualization()
        container.innerHTML = `<canvas id="visualizer-canvas" width="68" height="28"></canvas>`
        this.initializeVisualizer()
      }
    } else {
      this.visualizer.stopVisualization()
      container.innerHTML = this.idleBars()
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private attachEventListeners(): void {
    const playBtn      = this.querySelector('[data-action="play"], [data-action="pause"]')
    const stopBtn      = this.querySelector('[data-action="stop"]')
    const muteBtn      = this.querySelector('[data-action="mute"]')
    const favoriteBtn  = this.querySelector('[data-action="favorite"]')
    const volumeSlider = this.querySelector('#player-volume-slider')

    if (playBtn) {
      this.on(playBtn, 'click', () => {
        if (this.playerStore.isPlaying) {
          this.playerStore.pause()
        } else if (this.playerStore.currentStation) {
          this.playerStore.play(this.playerStore.currentStation)
        }
      })
    }

    if (stopBtn) {
      this.on(stopBtn, 'click', () => this.playerStore.stop())
    }

    if (muteBtn) {
      this.on(muteBtn, 'click', () => {
        if (this.playerStore.volume > 0) {
          this.playerStore.setVolume(0)
        } else {
          const restore = this.playerStore.volumeBeforeMute || 0.8
          this.playerStore.setVolume(restore)
        }
      })
    }

    if (favoriteBtn) {
      this.on(favoriteBtn, 'click', async () => {
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

    if (volumeSlider) {
      const updateVolume = (e: MouseEvent) => {
        const rect = (volumeSlider as HTMLElement).getBoundingClientRect()
        const vol  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        this.playerStore.setVolume(vol)
      }
      let dragging = false

      this.on(volumeSlider, 'mousedown', (e) => {
        dragging = true
        const fill = this.querySelector<HTMLElement>('#player-volume-fill')
        if (fill) fill.style.transition = 'none'
        updateVolume(e as MouseEvent)
      })

      // Store document listeners so we can remove them on unmount
      this._onMouseMove = (e: Event) => { if (dragging) updateVolume(e as MouseEvent) }
      this._onMouseUp   = () => {
        if (dragging) {
          dragging = false
          const fill = this.querySelector<HTMLElement>('#player-volume-fill')
          if (fill) fill.style.transition = ''
        }
      }
      document.addEventListener('mousemove', this._onMouseMove)
      document.addEventListener('mouseup',   this._onMouseUp)
    }
  }

  private removeDragListeners(): void {
    if (this._onMouseMove) { document.removeEventListener('mousemove', this._onMouseMove); this._onMouseMove = null }
    if (this._onMouseUp)   { document.removeEventListener('mouseup',   this._onMouseUp);   this._onMouseUp   = null }
  }

  private async initializeVisualizer(): Promise<void> {
    const canvas = this.querySelector<HTMLCanvasElement>('#visualizer-canvas')
    if (canvas && this.playerStore.isPlaying) {
      await this.visualizer.initialize(this.audioService.getAudioElement())
      this.visualizer.startVisualization(canvas)
    }
  }

  // ── Volume UI (called from EventBus, no re-render) ────────────────────────

  private updateVolumeUI(volume: number): void {
    const fill    = this.querySelector<HTMLElement>('#player-volume-fill')
    const slider  = this.querySelector<HTMLElement>('#player-volume-slider')
    const muteBtn = this.querySelector<HTMLElement>('#player-mute-btn')
    const volPct  = Math.round(volume * 100)

    if (fill)    fill.style.width = `${volPct}%`
    if (slider)  slider.title = `${volPct}%`
    if (muteBtn) {
      muteBtn.title     = volume === 0 ? 'Unmute' : 'Mute'
      muteBtn.innerHTML = this.volumeIcon(volume)
    }
  }

  // ── HTML helpers ──────────────────────────────────────────────────────────

  private buildMetaHtml(
    countryCode: string,
    country: string,
    tags: string[],
    bitrate: number,
    isLoading: boolean
  ): string {
    return `
      <span>${countryFlag(countryCode)} ${this.esc(country)}</span>
      ${tags.length > 0
        ? `<span class="meta-sep">·</span><span>${this.esc(tags[0] ?? '')}</span>`
        : ''
      }
      ${bitrate
        ? `<span class="meta-sep">·</span><span class="player-bitrate-badge">${bitrate} kbps</span>`
        : ''
      }
      ${isLoading
        ? `<span class="meta-sep">·</span>
           <span class="player-connecting">
             <span class="loading-spinner loading-spinner--sm"></span>
             Connecting…
           </span>`
        : ''
      }
    `
  }

  // ── Icon helpers ──────────────────────────────────────────────────────────

  private radioIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="1.75"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
    </svg>`
  }

  private playIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
      viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3"/>
    </svg>`
  }

  private pauseIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
      viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1.5"/>
      <rect x="14" y="4" width="4" height="16" rx="1.5"/>
    </svg>`
  }

  private volumeIcon(volume: number): string {
    if (volume === 0) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`
    }
    if (volume < 0.5) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`
  }

  private logoInnerHtml(favicon: string | undefined | null, name: string): string {
    if (!favicon || favicon.trim() === '') return FALLBACK_HTML
    const trimmed = favicon.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      return FALLBACK_HTML
    }
    const encodedSrc = trimmed.replace(/"/g, '%22')
    const encodedAlt = name.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<img src="${encodedSrc}" alt="${encodedAlt}" data-logo>`
  }

  private idleBars(): string {
    return `<div class="visualizer-idle">
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
      <div class="visualizer-idle-bar"></div>
    </div>`
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
