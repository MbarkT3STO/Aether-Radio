import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { VisualizerService } from '../services/VisualizerService'
import { AudioService } from '../services/AudioService'
import { SleepTimer } from './SleepTimer'
import { SongRecognitionService } from '../services/SongRecognitionService'
import { FALLBACK_HTML } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class PlayerBar extends BaseComponent {
  private eventBus       = EventBus.getInstance()
  private playerStore    = PlayerStore.getInstance()
  private favoritesStore = FavoritesStore.getInstance()
  private bridge         = BridgeService.getInstance()
  private visualizer     = new VisualizerService()
  private audioService   = AudioService.getInstance()
  private sleepTimer     = new SleepTimer()
  private recognition    = SongRecognitionService.getInstance()

  // Document-level drag listeners — kept so we can remove them on unmount
  private _onMouseMove: ((e: Event) => void) | null = null
  private _onMouseUp:   (() => void) | null = null

  // Track which station is currently rendered so we can detect station changes
  private _renderedStationId: string | null = null
  // Expanded player state
  private _isExpanded = false
  // Ambient background visualizer (expanded player)
  private _ambientVisualizer  = new VisualizerService()
  // Ambient background visualizer (mini player bar)
  private _barAmbientVisualizer = new VisualizerService()
  // Expanded volume drag listeners
  private _pexOnMouseMove: ((e: Event) => void) | null = null
  private _pexOnMouseUp: (() => void) | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('player:play',       () => this.onPlayStateChange())
    this.eventBus.on('player:pause',      () => this.onPlayStateChange())
    this.eventBus.on('player:stop',       () => this.onStopChange())
    this.eventBus.on('player:volume',     ({ volume }) => this.updateVolumeUI(volume))
    this.eventBus.on('player:loading',    ({ loading }) => this.updateLoadingUI(loading))
    this.eventBus.on('favorites:changed', () => this.updateFavoriteUI())
    this.eventBus.on('route:changed', () => {
      if (this._isExpanded) {
        this.destroyExpandedOverlay()
      }
    })
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
            <div id="player-sleep-timer"></div>
          </div>

        </div>
      `
    }

    // ── Active state ─────────────────────────────────────────
    const isFavorite = this.favoritesStore.isFavorite(station.id)
    const volPct     = Math.round(volume * 100)

    return `
      <div class="player-bar">

        <canvas class="player-bar-ambient" id="player-bar-ambient"></canvas>

        <!-- LEFT: Station info -->
        <div class="player-station-info">
          <div class="player-station-logo-wrap" id="player-logo-wrap" style="cursor:pointer" title="${this._isExpanded ? 'Collapse player' : 'Expand player'}">
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

          <div id="player-sleep-timer"></div>

          <button class="player-btn player-recognize-btn" id="player-recognize-btn"
            title="Identify song" aria-label="Identify song">
            ${this.recognizeIcon()}
          </button>

          <button class="player-btn player-expand-btn ${this._isExpanded ? 'expanded' : ''}"
            id="player-expand-btn"
            title="${this._isExpanded ? 'Collapse player' : 'Expand player'}"
            aria-label="${this._isExpanded ? 'Collapse player' : 'Expand player'}">
            ${this.chevronIcon()}
          </button>

        </div>

      </div>
    `
  }

  protected afterMount(): void {
    this.attachEventListeners()
    this.initializeVisualizer()
    this.audioService.setOnPlayStarted(async (audioEl) => {
      await this.visualizer.initialize(audioEl)
      const barCanvas = this.querySelector<HTMLCanvasElement>('#player-bar-ambient')
      if (barCanvas) {
        this._barAmbientVisualizer.startAmbientVisualization(barCanvas, this.visualizer, true, true)
        requestAnimationFrame(() => barCanvas.classList.add('active'))
      }
    })
    const sleepTimerContainer = this.querySelector<HTMLElement>('#player-sleep-timer')
    if (sleepTimerContainer) {
      void this.sleepTimer.mount(sleepTimerContainer)
    }
    this.attachExpandListener()
  }

  protected beforeUnmount(): void {
    this.visualizer.stopVisualization()
    this._ambientVisualizer.stopVisualization()
    this._barAmbientVisualizer.stopVisualization()
    this.removeDragListeners()
    this.removePexDragListeners()
    this.sleepTimer.unmount()
    this.destroyExpandedOverlay()
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
    this._barAmbientVisualizer.stopVisualization()
    const barCanvas = this.querySelector<HTMLCanvasElement>('#player-bar-ambient')
    if (barCanvas) barCanvas.classList.remove('active')
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
      this._barAmbientVisualizer.stopVisualization()
      this.removeDragListeners()
      this.removePexDragListeners()
      this.sleepTimer.unmount()
      this.destroyExpandedOverlay()
      const parent = this.element.parentNode as HTMLElement
      parent.innerHTML = this.render()
      this.element = parent.firstElementChild as HTMLElement
      this._renderedStationId = this.playerStore.currentStation?.id ?? null
      this.setupImageErrorHandlers()
      this.afterMount()
      this.updateFavoriteUI()
    }
  }

  private syncVisualizer(isPlaying: boolean): void {
    const barCanvas = this.querySelector<HTMLCanvasElement>('#player-bar-ambient')
    if (!isPlaying) {
      this.visualizer.stopVisualization()
      this._barAmbientVisualizer.stopVisualization()
      if (barCanvas) barCanvas.classList.remove('active')
    } else if (barCanvas && !barCanvas.classList.contains('active')) {
      this._barAmbientVisualizer.startAmbientVisualization(barCanvas, this.visualizer, true, true)
      requestAnimationFrame(() => barCanvas.classList.add('active'))
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private attachEventListeners(): void {
    const playBtn      = this.querySelector('[data-action="play"], [data-action="pause"]')
    const stopBtn      = this.querySelector('[data-action="stop"]')
    const muteBtn      = this.querySelector('[data-action="mute"]')
    const favoriteBtn  = this.querySelector('[data-action="favorite"]')
    const volumeSlider = this.querySelector('#player-volume-slider')
    const logoWrap     = this.querySelector<HTMLElement>('#player-logo-wrap')

    if (logoWrap) {
      this.on(logoWrap, 'click', () => {
        const expandBtn = this.querySelector<HTMLElement>('#player-expand-btn')
        if (expandBtn) expandBtn.click()
      })
    }

    const recognizeBtn = this.querySelector<HTMLElement>('#player-recognize-btn')
    if (recognizeBtn) {
      this.on(recognizeBtn, 'click', () => this.handleRecognize())
    }

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

  private removePexDragListeners(): void {
    if (this._pexOnMouseMove) { document.removeEventListener('mousemove', this._pexOnMouseMove); this._pexOnMouseMove = null }
    if (this._pexOnMouseUp)   { document.removeEventListener('mouseup',   this._pexOnMouseUp);   this._pexOnMouseUp   = null }
  }

  // ── Expanded player ───────────────────────────────────────────────────────

  private attachExpandListener(): void {
    const btn = this.querySelector<HTMLElement>('#player-expand-btn')
    if (!btn) return
    this.on(btn, 'click', () => {
      if (this._isExpanded) {
        // Update state and button immediately
        this._isExpanded = false
        btn.classList.remove('expanded')
        btn.title = 'Expand player'
        btn.setAttribute('aria-label', 'Expand player')
        // Animate out, then destroy
        this.animateCollapseAndDestroy()
      } else {
        this._isExpanded = true
        btn.classList.add('expanded')
        btn.title = 'Collapse player'
        btn.setAttribute('aria-label', 'Collapse player')
        this.mountExpandedOverlay()
      }
    })
  }

  private animateCollapseAndDestroy(): void {
    const overlay = document.getElementById('player-expanded-overlay')
    if (!overlay) return
    // Trigger the CSS collapse (height → player-bar-height)
    overlay.classList.remove('is-expanded')
    // Stop ambient immediately so it doesn't keep running during animation
    this._ambientVisualizer.stopVisualization()
    this.removePexDragListeners()
    // Wait for height transition to finish, then remove
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      overlay.remove()
      // Restore the mini player bar
      const appPlayerBar = document.querySelector<HTMLElement>('.app-player-bar')
      if (appPlayerBar) appPlayerBar.style.visibility = ''
    }
    overlay.addEventListener('transitionend', (e: TransitionEvent) => {
      if (e.propertyName === 'height') finish()
    })
    // Fallback in case transitionend doesn't fire
    setTimeout(finish, 500)
  }

  private getAppMain(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.app-main')
  }

  private mountExpandedOverlay(): void {
    const appMain = this.getAppMain()
    if (!appMain) return
    // Remove any stale overlay without touching _isExpanded
    this._ambientVisualizer.stopVisualization()
    this.removePexDragListeners()
    const stale = document.getElementById('player-expanded-overlay')
    if (stale) stale.remove()

    const station    = this.playerStore.currentStation
    const isPlaying  = this.playerStore.isPlaying
    const volume     = this.playerStore.volume
    const volPct     = Math.round(volume * 100)
    const isFavorite = station ? this.favoritesStore.isFavorite(station.id) : false

    const overlay = document.createElement('div')
    overlay.className = 'player-expanded-overlay'
    overlay.id = 'player-expanded-overlay'

    overlay.innerHTML = `
      <canvas class="pex-ambient-canvas" id="pex-ambient-canvas"></canvas>

      <button class="pex-collapse-btn" id="pex-collapse-btn" title="Collapse player" aria-label="Collapse player">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      <div class="player-expanded-body">

        <div class="pex-artwork-col">
          <div class="pex-artwork">
            ${station ? this.logoInnerHtml(station.favicon, station.name) : FALLBACK_HTML}
          </div>
          ${isPlaying ? `<div class="pex-live-badge"><span class="pex-live-dot"></span> Live</div>` : ''}
        </div>

        <div class="pex-info-col">
          <div>
            <div class="pex-station-name">${this.esc(station?.name ?? 'No station')}</div>
            <div class="pex-station-meta">
              ${station ? `
                <span>${countryFlag(station.countryCode)} ${this.esc(station.country)}</span>
                ${station.codec ? `<span class="pex-meta-sep">·</span><span>${this.esc(station.codec)}</span>` : ''}
                ${station.bitrate ? `<span class="pex-meta-sep">·</span><span class="pex-bitrate">${station.bitrate} kbps</span>` : ''}
              ` : ''}
            </div>
            ${station?.tags?.length ? `
              <div class="pex-tags" style="margin-top:10px">
                ${station.tags.slice(0, 6).map(t => `<span class="pex-tag">${this.esc(t)}</span>`).join('')}
              </div>` : ''}
          </div>

          <div class="pex-controls">
            <button class="pex-btn pex-btn-stop" id="pex-stop" title="Stop">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2"/>
              </svg>
            </button>
            <button class="pex-btn pex-btn-play ${isPlaying ? 'playing' : ''}" id="pex-play"
              data-action="${isPlaying ? 'pause' : 'play'}" title="${isPlaying ? 'Pause' : 'Play'}">
              ${isPlaying ? this.pauseIconLg() : this.playIconLg()}
            </button>
            <button class="pex-btn pex-btn-fav ${isFavorite ? 'active' : ''}" id="pex-fav"
              title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="${isFavorite ? 'currentColor' : 'none'}"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
          </div>

          <div class="pex-volume">
            <button class="pex-btn pex-btn-mute" id="pex-mute" title="${volume === 0 ? 'Unmute' : 'Mute'}">
              ${this.volumeIcon(volume)}
            </button>
            <div class="pex-volume-slider" id="pex-volume-slider" title="${volPct}%">
              <div class="pex-volume-fill" id="pex-volume-fill" style="width:${volPct}%">
                <div class="pex-volume-thumb"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `

    appMain.style.position = 'relative'
    appMain.appendChild(overlay)
    // Hide the mini player bar wrapper while expanded
    const appPlayerBar = document.querySelector<HTMLElement>('.app-player-bar')
    if (appPlayerBar) appPlayerBar.style.visibility = 'hidden'
    requestAnimationFrame(() => overlay.classList.add('is-expanded'))

    this.attachPexListeners(overlay)

    if (isPlaying) {
      // Ambient background
      const ambientCanvas = overlay.querySelector<HTMLCanvasElement>('#pex-ambient-canvas')
      if (ambientCanvas) {
        this._ambientVisualizer.startAmbientVisualization(ambientCanvas, this.visualizer)
      }
    }
  }

  private attachPexListeners(overlay: HTMLElement): void {
    const q = <E extends Element>(sel: string) => overlay.querySelector<E>(sel)

    // Collapse button
    q<HTMLElement>('#pex-collapse-btn')?.addEventListener('click', () => {
      this._isExpanded = false
      const expandBtn = this.querySelector<HTMLElement>('#player-expand-btn')
      if (expandBtn) {
        expandBtn.classList.remove('expanded')
        expandBtn.title = 'Expand player'
        expandBtn.setAttribute('aria-label', 'Expand player')
      }
      this.animateCollapseAndDestroy()
    })

    q<HTMLElement>('#pex-play')?.addEventListener('click', () => {
      if (this.playerStore.isPlaying) {
        this.playerStore.pause()
      } else if (this.playerStore.currentStation) {
        this.playerStore.play(this.playerStore.currentStation)
      }
    })

    q<HTMLElement>('#pex-stop')?.addEventListener('click', () => this.playerStore.stop())

    q<HTMLElement>('#pex-fav')?.addEventListener('click', async () => {
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

    q<HTMLElement>('#pex-mute')?.addEventListener('click', () => {
      if (this.playerStore.volume > 0) {
        this.playerStore.setVolume(0)
      } else {
        this.playerStore.setVolume(this.playerStore.volumeBeforeMute || 0.8)
      }
    })

    const volSlider = q<HTMLElement>('#pex-volume-slider')
    if (volSlider) {
      const updateVol = (e: MouseEvent) => {
        const rect = volSlider.getBoundingClientRect()
        this.playerStore.setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
      }
      let dragging = false
      volSlider.addEventListener('mousedown', (e) => {
        dragging = true
        const fill = q<HTMLElement>('#pex-volume-fill')
        if (fill) fill.style.transition = 'none'
        updateVol(e)
      })
      this._pexOnMouseMove = (e: Event) => { if (dragging) updateVol(e as MouseEvent) }
      this._pexOnMouseUp   = () => {
        if (dragging) {
          dragging = false
          const fill = q<HTMLElement>('#pex-volume-fill')
          if (fill) fill.style.transition = ''
        }
      }
      document.addEventListener('mousemove', this._pexOnMouseMove)
      document.addEventListener('mouseup',   this._pexOnMouseUp)
    }

    // Keep expanded UI in sync with EventBus
    this.eventBus.on('player:play',  () => this.syncPexPlayState(overlay))
    this.eventBus.on('player:pause', () => this.syncPexPlayState(overlay))
    this.eventBus.on('player:stop',  () => {
      this._isExpanded = false
      this.destroyExpandedOverlay()
    })
    this.eventBus.on('player:volume',     ({ volume }) => this.syncPexVolumeUI(overlay, volume))
    this.eventBus.on('favorites:changed', () => this.syncPexFavState(overlay))
    this.eventBus.on('player:loading',    ({ loading }) => this.syncPexLoadingUI(overlay, loading))
  }

  private syncPexPlayState(overlay: HTMLElement): void {
    const q = <E extends Element>(sel: string) => overlay.querySelector<E>(sel)
    const isPlaying = this.playerStore.isPlaying
    const isLoading = this.playerStore.isLoading

    const playBtn = q<HTMLElement>('#pex-play')
    if (playBtn) {
      playBtn.classList.toggle('playing', isPlaying)
      playBtn.setAttribute('data-action', isPlaying ? 'pause' : 'play')
      playBtn.title = isPlaying ? 'Pause' : 'Play'
      if (!isLoading) {
        playBtn.innerHTML = isPlaying ? this.pauseIconLg() : this.playIconLg()
      }
    }

    const artworkCol = overlay.querySelector<HTMLElement>('.pex-artwork-col')
    if (artworkCol) {
      const existing = artworkCol.querySelector('.pex-live-badge')
      if (isPlaying && !existing) {
        artworkCol.insertAdjacentHTML('beforeend', `<div class="pex-live-badge"><span class="pex-live-dot"></span> Live</div>`)
      } else if (!isPlaying && existing) {
        existing.remove()
      }
    }

    const vizWrap = overlay.querySelector<HTMLElement>('.pex-visualizer-wrap')
    if (isPlaying) {
      const ambientCanvas = overlay.querySelector<HTMLCanvasElement>('#pex-ambient-canvas')
      if (ambientCanvas) {
        this._ambientVisualizer.stopVisualization()
        this._ambientVisualizer.startAmbientVisualization(ambientCanvas, this.visualizer)
      }
    } else {
      this._ambientVisualizer.stopVisualization()
      if (vizWrap) vizWrap.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">${this.idleBars()}</div>`
    }
  }

  private syncPexLoadingUI(overlay: HTMLElement, loading: boolean): void {
    const playBtn = overlay.querySelector<HTMLElement>('#pex-play')
    if (!playBtn) return
    const isPlaying = this.playerStore.isPlaying
    playBtn.innerHTML = loading
      ? `<span class="loading-spinner loading-spinner--md"></span>`
      : (isPlaying ? this.pauseIconLg() : this.playIconLg())
  }

  private syncPexFavState(overlay: HTMLElement): void {
    const station = this.playerStore.currentStation
    if (!station) return
    const isFav = this.favoritesStore.isFavorite(station.id)
    const btn = overlay.querySelector<HTMLElement>('#pex-fav')
    if (!btn) return
    btn.classList.toggle('active', isFav)
    btn.title = isFav ? 'Remove from favorites' : 'Add to favorites'
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  private syncPexVolumeUI(overlay: HTMLElement, volume: number): void {
    const fill    = overlay.querySelector<HTMLElement>('#pex-volume-fill')
    const slider  = overlay.querySelector<HTMLElement>('#pex-volume-slider')
    const muteBtn = overlay.querySelector<HTMLElement>('#pex-mute')
    const volPct  = Math.round(volume * 100)
    if (fill)    fill.style.width = `${volPct}%`
    if (slider)  slider.title = `${volPct}%`
    if (muteBtn) { muteBtn.title = volume === 0 ? 'Unmute' : 'Mute'; muteBtn.innerHTML = this.volumeIcon(volume) }
  }

  private destroyExpandedOverlay(): void {
    this._isExpanded = false
    this._ambientVisualizer.stopVisualization()
    this.removePexDragListeners()
    const overlay = document.getElementById('player-expanded-overlay')
    if (overlay) overlay.remove()
    // Restore the mini player bar
    const appPlayerBar = document.querySelector<HTMLElement>('.app-player-bar')
    if (appPlayerBar) appPlayerBar.style.visibility = ''
    const btn = this.querySelector<HTMLElement>('#player-expand-btn')
    if (btn) {
      btn.classList.remove('expanded')
      btn.title = 'Expand player'
      btn.setAttribute('aria-label', 'Expand player')
    }
  }

  private async initializeVisualizer(): Promise<void> {
    if (this.playerStore.isPlaying) {
      await this.visualizer.initialize(this.audioService.getAudioElement())
      const barCanvas = this.querySelector<HTMLCanvasElement>('#player-bar-ambient')
      if (barCanvas) {
        this._barAmbientVisualizer.startAmbientVisualization(barCanvas, this.visualizer, true, true)
        requestAnimationFrame(() => barCanvas.classList.add('active'))
      }
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

  private playIconLg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
      viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3"/>
    </svg>`
  }

  private pauseIconLg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
      viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1.5"/>
      <rect x="14" y="4" width="4" height="16" rx="1.5"/>
    </svg>`
  }

  private chevronIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"/>
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

  // ── Song Recognition ─────────────────────────────────────────────────────

  private async handleRecognize(): Promise<void> {
    const station = this.playerStore.currentStation
    if (!station || !this.playerStore.isPlaying) return

    const btn = this.querySelector<HTMLElement>('#player-recognize-btn')
    if (!btn || this.recognition.busy) return

    // Open modal in listening state immediately
    this.openRecognitionModal()

    const streamUrl = station.urlResolved || station.url
    const result = await this.recognition.recognize(streamUrl)

    // Transition modal to result
    this.resolveRecognitionModal(result)
  }

  private openRecognitionModal(): void {
    document.getElementById('recognition-modal')?.remove()

    const modal = document.createElement('div')
    modal.id = 'recognition-modal'
    modal.className = 'rcm-overlay'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-label', 'Song recognition')

    modal.innerHTML = `
      <div class="rcm-backdrop"></div>
      <div class="rcm-dialog" id="rcm-dialog">

        <button class="rcm-close" id="rcm-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Listening state -->
        <div class="rcm-listening" id="rcm-listening">
          <div class="rcm-viz-wrap">
            <!-- 3D Fluid Wave Mesh -->
            <div class="rcm-wave-mesh">
              <!-- Multiple wave layers for depth -->
              <div class="rcm-wave-layer rcm-wave-layer-1">
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
              </div>
              <div class="rcm-wave-layer rcm-wave-layer-2">
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
              </div>
              <div class="rcm-wave-layer rcm-wave-layer-3">
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
                <div class="rcm-wave-line"></div>
              </div>
              <!-- Particle grid overlay -->
              <div class="rcm-particle-grid"></div>
              <!-- Glow highlights -->
              <div class="rcm-wave-glow rcm-wave-glow-1"></div>
              <div class="rcm-wave-glow rcm-wave-glow-2"></div>
            </div>
            <!-- Music note icon -->
            <div class="rcm-music-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.75"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          </div>
          <div class="rcm-listening-label">Identifying song…</div>
          <div class="rcm-listening-sub">Capturing audio fingerprint</div>
        </div>

        <!-- Result state (hidden initially) -->
        <div class="rcm-result" id="rcm-result" style="display:none"></div>

      </div>
    `

    document.body.appendChild(modal)

    // Close only via the X button — no backdrop click
    modal.querySelector('#rcm-close')?.addEventListener('click', () => this.closeRecognitionModal())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); this.closeRecognitionModal() }
    }
    document.addEventListener('keydown', onKey)
  }

  private resolveRecognitionModal(result: import('../services/SongRecognitionService').RecognitionResult | null): void {
    const listening = document.getElementById('rcm-listening')
    const resultEl  = document.getElementById('rcm-result')
    if (!listening || !resultEl) return

    listening.classList.add('rcm-fade-out')

    setTimeout(() => {
      listening.style.display = 'none'
      resultEl.style.display  = 'flex'

      if (!result) {
        resultEl.innerHTML = `
          <div class="rcm-miss-wrap">
            <div class="rcm-miss-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="rcm-miss-title">Song not recognized</div>
            <div class="rcm-miss-sub">The stream may be playing speech or a less common track.<br>Try again in a few seconds.</div>
            <div class="rcm-miss-actions">
              <button class="rcm-retry-btn" id="rcm-retry">Try again</button>
            </div>
          </div>
        `
        resultEl.querySelector('#rcm-retry')?.addEventListener('click', () => {
          this.closeRecognitionModal()
          setTimeout(() => this.handleRecognize(), 150)
        })

      } else {
        // Build result HTML with hero section
        const coverHtml = result.coverArt
          ? `<div class="rcm-cover-hero">
              <div class="rcm-cover-blur-bg" style="background-image: url('${result.coverArt.replace(/"/g, '%22')}')"></div>
              <div class="rcm-cover-wrap">
                <img class="rcm-cover" src="${result.coverArt.replace(/"/g, '%22')}" alt="${this.esc(result.title)}">
              </div>
            </div>`
          : `<div class="rcm-found-icon-hero">
              <div class="rcm-found-icon-orb">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.75"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
            </div>`

        resultEl.innerHTML = `
          ${coverHtml}
          <div class="rcm-found-info">
            <div class="rcm-found-label">
              <span class="rcm-found-label-dot"></span>
              Now Playing
            </div>
            <div class="rcm-found-title">${this.esc(result.title)}</div>
            <div class="rcm-found-artist">${this.esc(result.artist)}</div>
            ${result.album ? `<div class="rcm-found-album">${this.esc(result.album)}${result.releaseDate ? ` · ${result.releaseDate.slice(0, 4)}` : ''}</div>` : ''}
          </div>
          ${(result.spotifyUrl || result.appleMusicUrl) ? `
            <div class="rcm-result-divider"></div>
            <div class="rcm-found-links">
              ${result.spotifyUrl ? `<button class="rcm-platform-btn rcm-spotify" id="rcm-spotify">
                ${this.spotifyIcon()} Spotify
              </button>` : ''}
              ${result.appleMusicUrl ? `<button class="rcm-platform-btn rcm-apple" id="rcm-apple">
                ${this.appleMusicIcon()} Apple Music
              </button>` : ''}
            </div>
          ` : ''}
        `

        if (result.spotifyUrl) {
          resultEl.querySelector('#rcm-spotify')?.addEventListener('click', () => {
            window.electronAPI.openExternal(result.spotifyUrl!)
          })
        }
        if (result.appleMusicUrl) {
          resultEl.querySelector('#rcm-apple')?.addEventListener('click', () => {
            window.electronAPI.openExternal(result.appleMusicUrl!)
          })
        }
      }

      resultEl.classList.add('rcm-result-in')
    }, 350)
  }

  private closeRecognitionModal(): void {
    const modal = document.getElementById('recognition-modal')
    if (!modal) return
    modal.classList.add('rcm-fade-out-modal')
    setTimeout(() => modal.remove(), 320)
  }

  // ── Icon helpers (recognition) ────────────────────────────────────────────

  private recognizeIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`
  }

  private spotifyIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>`
  }

  private appleMusicIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.494 5.494 0 0 0-.39 1.548c-.06.34-.087.686-.09 1.03-.002.05-.007.1-.01.15v12.128c.01.15.017.302.027.453.063.97.24 1.914.724 2.782.35.627.8 1.162 1.38 1.583.98.706 2.1 1.02 3.28 1.077.45.02.9.03 1.35.03h11.28c.45 0 .9-.01 1.35-.03 1.18-.057 2.3-.37 3.28-1.077.58-.42 1.03-.956 1.38-1.583.484-.868.66-1.812.724-2.782.01-.15.017-.302.027-.453V6.124zm-6.985 1.23v7.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V9.854l-4.5 1.5v5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-7.5c0-.69.47-1.29 1.14-1.45l6-2c.47-.12.96-.01 1.32.3.36.31.54.76.54 1.15z"/>
    </svg>`
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
