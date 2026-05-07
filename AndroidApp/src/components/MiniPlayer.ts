import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { AudioService } from '../services/AudioService'
import { VisualizerService } from '../services/VisualizerService'
import { SleepTimer } from './SleepTimer'
import { SongRecognitionService } from '../services/SongRecognitionService'
import type { RecognitionResult, StreamingLink } from '../services/SongRecognitionService'
import { stationLogoHtml } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class MiniPlayer extends BaseComponent {
  private eventBus         = EventBus.getInstance()
  private playerStore      = PlayerStore.getInstance()
  private favoritesStore   = FavoritesStore.getInstance()
  private bridge           = BridgeService.getInstance()
  private audioService     = AudioService.getInstance()
  private _barVisualizer   = new VisualizerService()
  private _sheetVisualizer = new VisualizerService()
  private _sleepTimer      = new SleepTimer()
  private _recognition     = SongRecognitionService.getInstance()
  private _renderedStationId: string | null = null
  private _expanded = false
  private _sheetCleanup: (() => void) | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('player:play',       () => this.onStateChange())
    this.eventBus.on('player:pause',      () => this.onStateChange())
    this.eventBus.on('player:stop',       () => this.onStopChange())
    this.eventBus.on('player:loading',    ({ loading }) => this.updateLoadingUI(loading))
    this.eventBus.on('favorites:changed', () => this.updateFavBtn())
    // Close expanded player on route change
    this.eventBus.on('route:changed', () => { if (this._expanded) this.closeExpanded() })
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
      <div class="mini-player" id="mini-player-bar">
        <canvas class="mini-player-ambient" id="mp-ambient-canvas"></canvas>
        <button class="mini-player-expand-area" id="mp-expand-area" aria-label="Expand player">
          <div class="mini-player-logo">
            ${stationLogoHtml(station.favicon, station.name, 'player')}
            ${isPlaying ? `<span class="mini-player-live-dot"></span>` : ''}
          </div>
          <div class="mini-player-info">
            <div class="mini-player-name">${this.esc(station.name)}</div>
            <div class="mini-player-meta">${this.esc(station.country)}${station.bitrate ? ` · ${station.bitrate} kbps` : ''}</div>
          </div>
        </button>
        <div class="mini-player-controls">
          <button class="mp-recognize-btn${isPlaying ? '' : ' disabled'}" id="mp-recognize-btn"
            aria-label="Identify song" title="Identify song"
            ${isPlaying ? '' : 'disabled'}>
            ${this.recognizeIcon()}
          </button>
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
    this.startBarAmbient()
  }

  private startBarAmbient(): void {
    const canvas = this.querySelector<HTMLCanvasElement>('#mp-ambient-canvas')
    if (!canvas || !this.playerStore.isPlaying) return
    this._barVisualizer.startAmbientVisualization(
      canvas, this.audioService.getVisualizer(), 0.9, true
    )
    requestAnimationFrame(() => canvas.classList.add('active'))
  }

  private stopBarAmbient(): void {
    this._barVisualizer.stopVisualization()
    const canvas = this.querySelector<HTMLCanvasElement>('#mp-ambient-canvas')
    if (canvas) canvas.classList.remove('active')
  }

  private attachListeners(): void {
    const expandArea  = this.querySelector('#mp-expand-area')
    const playBtn     = this.querySelector('#mp-play')
    const stopBtn     = this.querySelector('#mp-stop')
    const favBtn      = this.querySelector('#mp-fav')
    const recognizeBtn = this.querySelector('#mp-recognize-btn')

    if (expandArea) this.on(expandArea, 'click', () => this.openExpanded())
    if (recognizeBtn) this.on(recognizeBtn, 'click', () => void this.handleRecognize())
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
        if (this.favoritesStore.isFavorite(station.id)) await this.bridge.favorites.remove(station.id)
        else await this.bridge.favorites.add(station)
        const res = await this.bridge.favorites.getAll()
        if (res.success) this.favoritesStore.setFavorites(res.data)
      })
    }
  }

  // ── Expanded full-screen player ───────────────────────────────────────────

  private openExpanded(): void {
    if (this._expanded) return
    this._expanded = true
    this.mountExpandedSheet()
  }

  private closeExpanded(): void {
    this._expanded = false
    this._sheetVisualizer.stopVisualization()
    this._sleepTimer.unmount()
    // Clean up all sheet event subscriptions to prevent memory leaks
    if (this._sheetCleanup) { this._sheetCleanup(); this._sheetCleanup = null }
    const sheet = document.getElementById('mp-expanded-sheet')
    if (!sheet) return
    sheet.classList.remove('mp-sheet--open')
    sheet.addEventListener('transitionend', () => sheet.remove(), { once: true })
    setTimeout(() => sheet.remove(), 400)
  }

  private mountExpandedSheet(): void {
    const existing = document.getElementById('mp-expanded-sheet')
    if (existing) existing.remove()

    const station   = this.playerStore.currentStation
    const isPlaying = this.playerStore.isPlaying
    const volume    = this.playerStore.volume
    const isFav     = station ? this.favoritesStore.isFavorite(station.id) : false

    const sheet = document.createElement('div')
    sheet.id = 'mp-expanded-sheet'
    sheet.className = 'mp-sheet'
    sheet.innerHTML = `
      <canvas class="mp-sheet-ambient" id="mp-sheet-ambient"></canvas>
      <div class="mp-sheet-handle-wrap">
        <div class="mp-sheet-handle"></div>
      </div>

      <button class="mp-sheet-close" id="mp-sheet-close" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div class="mp-sheet-artwork">
        <div class="mp-sheet-logo">
          ${station ? stationLogoHtml(station.favicon, station.name, 'player') : ''}
        </div>
        ${isPlaying ? `<div class="mp-sheet-live"><span class="mp-sheet-live-dot"></span> Live</div>` : ''}
      </div>

      <div class="mp-sheet-info">
        <div class="mp-sheet-name">${this.esc(station?.name ?? '')}</div>
        <div class="mp-sheet-meta">
          ${station ? `${countryFlag(station.countryCode)} ${this.esc(station.country)}` : ''}
          ${station?.codec ? ` · ${this.esc(station.codec)}` : ''}
          ${station?.bitrate ? ` · ${station.bitrate} kbps` : ''}
        </div>
        ${station?.tags?.length ? `<div class="mp-sheet-tags">${station.tags.slice(0,5).map(t => `<span class="mp-sheet-tag">${this.esc(t)}</span>`).join('')}</div>` : ''}
      </div>

      <div class="mp-sheet-controls">
        <button class="mp-sheet-btn mp-sheet-fav${isFav ? ' active' : ''}" id="mp-sheet-fav" aria-label="Favorite">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </button>
        <button class="mp-sheet-btn mp-sheet-stop" id="mp-sheet-stop" aria-label="Stop">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
        </button>
        <!-- Play button wrapped in isolation layer so ambient canvas colors don't bleed in -->
        <div class="mp-sheet-play-wrap">
          <button class="mp-sheet-btn mp-sheet-play${isPlaying ? ' playing' : ''}" id="mp-sheet-play" aria-label="${isPlaying ? 'Pause' : 'Play'}">
            ${this.playerStore.isLoading
              ? `<span class="loading-spinner loading-spinner--md"></span>`
              : isPlaying
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            }
          </button>
        </div>
      </div>

      <div class="mp-sheet-volume">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <div class="mp-sheet-vol-track" id="mp-sheet-vol-track">
          <div class="mp-sheet-vol-fill" id="mp-sheet-vol-fill" style="width:${Math.round(volume * 100)}%">
            <div class="mp-sheet-vol-thumb"></div>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      </div>

      <!-- Sleep timer -->
      <div class="mp-sheet-sleep-row" id="mp-sheet-sleep"></div>

      <!-- Identify song -->
      <div class="mp-sheet-recognize-row">
        <button class="mp-sheet-recognize-btn${isPlaying ? '' : ' disabled'}" id="mp-sheet-recognize"
          aria-label="Identify song" ${isPlaying ? '' : 'disabled'}>
          ${this.recognizeIcon()}
          Identify Song
        </button>
      </div>
    `

    document.body.appendChild(sheet)
    requestAnimationFrame(() => sheet.classList.add('mp-sheet--open'))

    this.attachSheetListeners(sheet)
    this.syncSheetWithEvents(sheet)

    // Mount sleep timer
    const sleepContainer = sheet.querySelector<HTMLElement>('#mp-sheet-sleep')
    if (sleepContainer) this._sleepTimer.mount(sleepContainer)

    // Start ambient if already playing
    if (isPlaying) {
      const ambCanvas = sheet.querySelector<HTMLCanvasElement>('#mp-sheet-ambient')
      if (ambCanvas) {
        this._sheetVisualizer.startAmbientVisualization(
          ambCanvas, this.audioService.getVisualizer(), 0.42, true
        )
        requestAnimationFrame(() => ambCanvas.classList.add('active'))
      }
    }
  }

  private attachSheetListeners(sheet: HTMLElement): void {
    const q = (sel: string) => sheet.querySelector<HTMLElement>(sel)

    q('#mp-sheet-close')?.addEventListener('click', () => this.closeExpanded())

    q('#mp-sheet-recognize')?.addEventListener('click', () => void this.handleRecognize())

    q('#mp-sheet-play')?.addEventListener('click', () => {
      if (this.playerStore.isPlaying) this.playerStore.pause()
      else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
    })

    q('#mp-sheet-stop')?.addEventListener('click', () => this.playerStore.stop())

    q('#mp-sheet-fav')?.addEventListener('click', async () => {
      const station = this.playerStore.currentStation
      if (!station) return
      if (this.favoritesStore.isFavorite(station.id)) await this.bridge.favorites.remove(station.id)
      else await this.bridge.favorites.add(station)
      const res = await this.bridge.favorites.getAll()
      if (res.success) this.favoritesStore.setFavorites(res.data)
    })

    // Volume slider — touch + mouse, prevent sheet scroll
    const track = q('#mp-sheet-vol-track')
    if (track) {
      const setVol = (clientX: number) => {
        const rect = track.getBoundingClientRect()
        this.playerStore.setVolume(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
      }
      let dragging = false

      track.addEventListener('mousedown', (e) => {
        dragging = true
        e.preventDefault()
        setVol((e as MouseEvent).clientX)
      })

      track.addEventListener('touchstart', (e) => {
        dragging = true
        e.stopPropagation()
        // Don't preventDefault here — let the browser handle tap
        setVol((e as TouchEvent).touches[0]!.clientX)
      }, { passive: true })

      // Use capture on document so we get the event even if finger moves outside track
      const onTouchMove = (e: TouchEvent) => {
        if (!dragging) return
        e.preventDefault()   // stops sheet scroll
        e.stopPropagation()
        setVol(e.touches[0]!.clientX)
      }
      const onMouseMove = (e: MouseEvent) => { if (dragging) setVol(e.clientX) }
      const onEnd = () => { dragging = false }

      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('touchend', onEnd)
      document.addEventListener('mouseup', onEnd)
    }

    // Swipe down on the handle to close (not the whole sheet)
    const handle = sheet.querySelector<HTMLElement>('.mp-sheet-handle-wrap')
    if (handle) {
      let touchStartY = 0
      handle.addEventListener('touchstart', (e) => {
        touchStartY = (e as TouchEvent).touches[0]!.clientY
      }, { passive: true })
      handle.addEventListener('touchend', (e) => {
        const dy = (e as TouchEvent).changedTouches[0]!.clientY - touchStartY
        if (dy > 60) this.closeExpanded()
      }, { passive: true })
    }
  }

  private syncSheetWithEvents(sheet: HTMLElement): void {
    const q = (sel: string) => sheet.querySelector<HTMLElement>(sel)

    const unsub1 = this.eventBus.on('player:play', () => {
      const isPlaying = this.playerStore.isPlaying
      const btn = q('#mp-sheet-play')
      if (btn) {
        btn.classList.toggle('playing', isPlaying)
        btn.innerHTML = isPlaying
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
      }
      const liveEl = sheet.querySelector('.mp-sheet-live')
      const artwork = sheet.querySelector('.mp-sheet-artwork')
      if (isPlaying && !liveEl && artwork) {
        artwork.insertAdjacentHTML('beforeend', `<div class="mp-sheet-live"><span class="mp-sheet-live-dot"></span> Live</div>`)
      } else if (!isPlaying && liveEl) liveEl.remove()
      // Start/stop ambient
      const ambCanvas = sheet.querySelector<HTMLCanvasElement>('#mp-sheet-ambient')
      if (ambCanvas) {
        if (isPlaying) {
          this._sheetVisualizer.startAmbientVisualization(ambCanvas, this.audioService.getVisualizer(), 0.42, true)
          requestAnimationFrame(() => ambCanvas.classList.add('active'))
        } else {
          this._sheetVisualizer.stopVisualization()
          ambCanvas.classList.remove('active')
        }
      }
      // Sync recognize button
      const recBtn = q('#mp-sheet-recognize')
      if (recBtn) {
        recBtn.classList.toggle('disabled', !isPlaying)
        recBtn.toggleAttribute('disabled', !isPlaying)
      }
    })

    const unsub2 = this.eventBus.on('player:pause', () => {
      const btn = q('#mp-sheet-play')
      if (btn) {
        btn.classList.remove('playing')
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
      }
      sheet.querySelector('.mp-sheet-live')?.remove()
      this._sheetVisualizer.stopVisualization()
      sheet.querySelector<HTMLCanvasElement>('#mp-sheet-ambient')?.classList.remove('active')
    })

    const unsub3 = this.eventBus.on('player:stop', () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); this.closeExpanded() })

    const unsub4 = this.eventBus.on('player:volume', ({ volume }) => {
      const fill = q('#mp-sheet-vol-fill')
      if (fill) fill.style.width = `${Math.round(volume * 100)}%`
    })

    const unsub5 = this.eventBus.on('player:loading', ({ loading }) => {
      const btn = q('#mp-sheet-play')
      if (!btn) return
      const isPlaying = this.playerStore.isPlaying
      btn.innerHTML = loading
        ? `<span class="loading-spinner loading-spinner--md"></span>`
        : isPlaying
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
    })

    const unsub6 = this.eventBus.on('favorites:changed', () => {
      const station = this.playerStore.currentStation
      if (!station) return
      const isFav = this.favoritesStore.isFavorite(station.id)
      const btn = q('#mp-sheet-fav')
      if (!btn) return
      btn.classList.toggle('active', isFav)
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>`
    })

    // Store a combined cleanup so closeExpanded() can unsubscribe even when
    // triggered by a route change rather than the player:stop event.
    this._sheetCleanup = () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6() }
  }

  // ── Mini bar surgical updates ─────────────────────────────────────────────

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
    if (isPlaying && !dot && logoWrap) logoWrap.insertAdjacentHTML('beforeend', `<span class="mini-player-live-dot"></span>`)
    else if (!isPlaying && dot) dot.remove()
    // Sync recognize button
    const recBtn = this.querySelector<HTMLElement>('#mp-recognize-btn')
    if (recBtn) {
      recBtn.classList.toggle('disabled', !isPlaying)
      recBtn.toggleAttribute('disabled', !isPlaying)
    }
    // Sync bar ambient
    if (isPlaying) this.startBarAmbient()
    else this.stopBarAmbient()
  }

  private onStopChange(): void {
    this._renderedStationId = null
    this.stopBarAmbient()
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
    // Stop ambient while buffering, restart when done
    if (loading) this.stopBarAmbient()
    else if (isPlaying) this.startBarAmbient()
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

  // ── Song Recognition ──────────────────────────────────────────────────────

  private async handleRecognize(): Promise<void> {
    const station = this.playerStore.currentStation
    if (!station || !this.playerStore.isPlaying || this._recognition.busy) return
    this.openRecognitionModal()
    const streamUrl = station.urlResolved || station.url
    const result = await this._recognition.recognize(streamUrl)
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

        <button class="rcm-close" id="rcm-close" aria-label="Close" style="opacity:0;pointer-events:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Listening / animation state -->
        <div class="rcm-listening" id="rcm-listening">
          <div class="rcm-viz-wrap">
            <div class="rcm-ambient-container">
              <div class="rcm-search-orb"></div>
              <div class="rcm-blur-point rcm-point-1"></div>
              <div class="rcm-blur-point rcm-point-2"></div>
              <div class="rcm-blur-point rcm-point-3"></div>
              <div class="rcm-blur-point rcm-point-4"></div>
              <div class="rcm-blur-point rcm-point-5"></div>
              <div class="rcm-blur-point rcm-point-6"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-7"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-8"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-9"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-10"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-11"></div>
              <div class="rcm-blur-point rcm-outer rcm-point-12"></div>
              <div class="rcm-particle rcm-particle-1"></div>
              <div class="rcm-particle rcm-particle-2"></div>
              <div class="rcm-particle rcm-particle-3"></div>
              <div class="rcm-particle rcm-particle-4"></div>
              <div class="rcm-particle rcm-particle-5"></div>
              <div class="rcm-particle rcm-particle-6"></div>
            </div>
          </div>
          <div class="rcm-listening-text">
            <div class="rcm-listening-label">Identifying song…</div>
            <div class="rcm-listening-sub">Analyzing audio fingerprint</div>
          </div>
        </div>

        <!-- Result state (hidden initially) -->
        <div class="rcm-result" id="rcm-result" style="display:none"></div>

      </div>
    `

    document.body.appendChild(modal)
    modal.querySelector('#rcm-close')?.addEventListener('click', () => this.closeRecognitionModal())
  }

  private resolveRecognitionModal(result: RecognitionResult | null): void {
    const listening = document.getElementById('rcm-listening')
    const resultEl  = document.getElementById('rcm-result')
    if (!listening || !resultEl) return

    listening.classList.add('rcm-fade-out')

    setTimeout(() => {
      listening.style.display = 'none'
      resultEl.style.display  = 'flex'

      // Reveal the close button now that there's a result to dismiss
      const closeBtn = document.getElementById('rcm-close')
      if (closeBtn) {
        closeBtn.style.opacity = '1'
        closeBtn.style.pointerEvents = 'auto'
      }

      if (!result || (!result.title && !result.artist)) {
        // ── Not found ──
        resultEl.innerHTML = `
          <div class="rcm-miss-wrap">
            <div class="rcm-miss-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="rcm-miss-title">Song not recognized</div>
            <div class="rcm-miss-sub">This station may not broadcast track info.<br>Try again in a few seconds.</div>
            <div class="rcm-miss-actions">
              <button class="rcm-retry-btn" id="rcm-retry">Try again</button>
            </div>
          </div>
        `
        resultEl.querySelector('#rcm-retry')?.addEventListener('click', () => {
          this.closeRecognitionModal()
          setTimeout(() => void this.handleRecognize(), 150)
        })

      } else {
        // ── Found ──
        const titleText  = this.esc(result.title)
        const artistText = result.artist ? this.esc(result.artist) : ''
        const cover      = result.coverArt?.replace(/"/g, '%22') ?? ''

        const coverSection = cover
          ? `<div class="rcm-hero">
               <div class="rcm-hero-blur" style="background-image:url('${cover}')"></div>
               <img class="rcm-hero-cover" src="${cover}" alt="${titleText}">
               <div class="rcm-hero-gradient"></div>
             </div>`
          : `<div class="rcm-hero rcm-hero-nocov">
               <div class="rcm-hero-nocov-orb">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="1.5"
                   stroke-linecap="round" stroke-linejoin="round">
                   <path d="M9 18V5l12-2v13"/>
                   <circle cx="6" cy="18" r="3"/>
                   <circle cx="18" cy="16" r="3"/>
                 </svg>
               </div>
             </div>`

        resultEl.innerHTML = `
          ${coverSection}
          <div class="rcm-body">
            <div class="rcm-identity">
              <div class="rcm-identity-badge">
                <span class="rcm-badge-dot"></span>Identified
              </div>
              <div class="rcm-title">${titleText}</div>
              ${artistText ? `<div class="rcm-artist">${artistText}</div>` : ''}
              ${result.album
                ? `<div class="rcm-meta">
                     <span>${this.esc(result.album)}</span>
                     ${result.releaseDate ? `<span class="rcm-meta-sep">·</span><span>${result.releaseDate.slice(0, 4)}</span>` : ''}
                   </div>`
                : ''}
            </div>
            ${this.renderStreamingLinks(result.streamingLinks ?? [])}
          </div>
        `
      }

      resultEl.classList.add('rcm-result-in')

      // Wire up streaming link buttons (use Capacitor Browser, not raw href)
      resultEl.querySelectorAll<HTMLButtonElement>('.rcm-stream-btn[data-stream-url], .rcm-more-btn[data-stream-url]').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = btn.dataset.streamUrl
          if (url) void this.openStreamingLink(url)
        })
      })
    }, 350)
  }

  private renderStreamingLinks(links: StreamingLink[]): string {
    if (!links.length) return ''

    const providerMeta: Record<string, { label: string; color: string; icon: string }> = {
      spotify: {
        label: 'Spotify',
        color: '#1DB954',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 0 1-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 0 1-.973-.519.781.781 0 0 1 .52-.973c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 0 1 .257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 1 1-.543-1.793c3.563-1.08 9.484-.87 13.22 1.37a.937.937 0 0 1-.96 1.58z"/></svg>`,
      },
      applemusic: {
        label: 'Apple Music',
        color: '#fc3c44',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81 1.268-.834 2.032-1.99 2.253-3.485.076-.51.108-1.03.109-1.543.003-4.013.001-8.025.001-12.037zm-6.427 3.98v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 0 1 1.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 0 0 .016-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 0 0-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.326.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13v7.96c0 .418-.06.826-.246 1.205-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 0 1 1.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 0 0 .016-.193c0-2.95-.001-5.9.002-8.85 0-.232.033-.46.17-.656.148-.21.354-.32.595-.376.76-.18 1.52-.36 2.28-.53l2.326-.47 2.325-.47c.17-.033.34-.07.51-.09.28-.03.502.135.554.41.023.12.03.245.03.368.002.96 0 1.92 0 2.88z"/></svg>`,
      },
      shazam: {
        label: 'Shazam',
        color: '#0088ff',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.004 0C5.374 0 0 5.374 0 12.004 0 18.63 5.374 24 12.004 24 18.63 24 24 18.63 24 12.004 24 5.374 18.63 0 12.004 0zm-.317 18.692c-1.996 0-3.808-.744-5.188-1.964l1.43-1.43a5.07 5.07 0 0 0 3.758 1.664c2.808 0 5.09-2.282 5.09-5.09 0-1.404-.57-2.674-1.494-3.598l1.43-1.43a7.1 7.1 0 0 1 2.094 5.028c0 3.924-3.196 7.82-7.12 7.82zm.63-5.35c-.55.55-1.44.55-1.99 0l-2.83-2.83c-.55-.55-.55-1.44 0-1.99l2.83-2.83c.55-.55 1.44-.55 1.99 0l2.83 2.83c.55.55.55 1.44 0 1.99l-2.83 2.83z"/></svg>`,
      },
    }

    // Encode URLs into data attributes — click handler uses @capacitor/browser
    // so links open in an in-app browser with a proper close/back button,
    // instead of hijacking the WebView (which has no back navigation).
    const items = links.map(link => {
      const meta = providerMeta[link.provider] ?? {
        label: link.provider.charAt(0).toUpperCase() + link.provider.slice(1),
        color: 'var(--accent)',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
      }
      const safeUrl = link.url.replace(/"/g, '&quot;')
      return `<button class="rcm-stream-btn" data-stream-url="${safeUrl}"
          style="--stream-color:${meta.color}">
          ${meta.icon}
          <span>${meta.label}</span>
        </button>`
    }).join('')

    return `<div class="rcm-stream-links">${items}</div>`
  }

  private renderStreamingLinks(links: StreamingLink[]): string {
    if (!links.length) return ''

    const externalIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`

    const providerMeta: Record<string, { label: string; color: string; icon: string; secondary?: boolean }> = {
      spotify: {
        label: 'Spotify',
        color: '#1DB954',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 0 1-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 0 1-.973-.519.781.781 0 0 1 .52-.973c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 0 1 .257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 1 1-.543-1.793c3.563-1.08 9.484-.87 13.22 1.37a.937.937 0 0 1-.96 1.58z"/></svg>`,
      },
      applemusic: {
        label: 'Apple Music',
        color: '#fc3c44',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81 1.268-.834 2.032-1.99 2.253-3.485.076-.51.108-1.03.109-1.543.003-4.013.001-8.025.001-12.037zm-6.427 3.98v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 0 1 1.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 0 0 .016-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 0 0-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.326.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13v7.96c0 .418-.06.826-.246 1.205-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 0 1 1.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 0 0 .016-.193c0-2.95-.001-5.9.002-8.85 0-.232.033-.46.17-.656.148-.21.354-.32.595-.376.76-.18 1.52-.36 2.28-.53l2.326-.47 2.325-.47c.17-.033.34-.07.51-.09.28-.03.502.135.554.41.023.12.03.245.03.368.002.96 0 1.92 0 2.88z"/></svg>`,
      },
      deezer: {
        label: 'Deezer',
        color: '#a238ff',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.944 17.773h4.112v1.217h-4.112zm0-2.77h4.112v1.217h-4.112zm0-2.77h4.112v1.218h-4.112zm0-2.77h4.112v1.217h-4.112zM12.862 17.773h4.11v1.217h-4.11zm0-2.77h4.11v1.217h-4.11zm0-2.77h4.11v1.218h-4.11zm0-2.77h4.11v1.217h-4.11zM6.78 17.773h4.11v1.217H6.78zm0-2.77h4.11v1.217H6.78zm0-2.77h4.11v1.218H6.78zM.697 17.773h4.11v1.217H.697zm0-2.77h4.11v1.217H.697z"/></svg>`,
      },
      shazam: {
        label: 'View on Shazam',
        color: '#0088ff',
        secondary: true,
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.004 0C5.374 0 0 5.374 0 12.004 0 18.63 5.374 24 12.004 24 18.63 24 24 18.63 24 12.004 24 5.374 18.63 0 12.004 0zm-.317 18.692c-1.996 0-3.808-.744-5.188-1.964l1.43-1.43a5.07 5.07 0 0 0 3.758 1.664c2.808 0 5.09-2.282 5.09-5.09 0-1.404-.57-2.674-1.494-3.598l1.43-1.43a7.1 7.1 0 0 1 2.094 5.028c0 3.924-3.196 7.82-7.12 7.82zm.63-5.35c-.55.55-1.44.55-1.99 0l-2.83-2.83c-.55-.55-.55-1.44 0-1.99l2.83-2.83c.55-.55 1.44-.55 1.99 0l2.83 2.83c.55.55.55 1.44 0 1.99l-2.83 2.83z"/></svg>`,
      },
    }

    const primary: string[]   = []
    const secondary: string[] = []

    for (const link of links) {
      const meta = providerMeta[link.provider] ?? {
        label: link.provider.charAt(0).toUpperCase() + link.provider.slice(1),
        color: 'var(--accent-primary)',
        secondary: false,
        icon: externalIcon,
      }
      const safeUrl = link.url.replace(/"/g, '&quot;')

      if (meta.secondary) {
        secondary.push(
          `<button class="rcm-more-btn" data-stream-url="${safeUrl}" style="--stream-color:${meta.color}">
            ${meta.icon}<span>${meta.label}</span>${externalIcon}
          </button>`
        )
      } else {
        primary.push(
          `<button class="rcm-stream-btn" data-stream-url="${safeUrl}" style="--stream-color:${meta.color}">
            ${meta.icon}<span>${meta.label}</span>
          </button>`
        )
      }
    }

    if (!primary.length && !secondary.length) return ''

    return `
      <div class="rcm-streams">
        <div class="rcm-streams-label">Open in</div>
        ${primary.length ? `<div class="rcm-streams-grid">${primary.join('')}</div>` : ''}
        ${secondary.length ? `<div class="rcm-streams-more">${secondary.join('')}</div>` : ''}
      </div>
    `
  }

  /** Open a streaming link correctly depending on its scheme/host. */
  private async openStreamingLink(url: string): Promise<void> {
    const { Capacitor } = await import('@capacitor/core')

    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank', 'noopener')
      return
    }

    // Detect URLs that belong to streaming apps — these should be opened via
    // a native ACTION_VIEW Intent so Android routes them to the installed app
    // (or the Play Store if not installed). Using Browser.open() for these
    // causes Chrome Custom Tab to open, immediately redirect to the app scheme,
    // then close — leaving an invisible overlay that blocks the UI.
    const isAppLink = (
      url.startsWith('spotify:') ||
      url.startsWith('deezer:') ||
      url.includes('open.spotify.com') ||
      url.includes('deezer.com') ||
      url.includes('deezer.page.link')
    )

    if (isAppLink) {
      // Use our native AudioPlayerPlugin.openUrl() — fires ACTION_VIEW Intent,
      // no overlay, no stuck state, works for both deep-links and https app URLs.
      try {
        const AudioPlayer = (await import('@capacitor/core')).registerPlugin<{
          openUrl(o: { url: string }): Promise<void>
        }>('AudioPlayer')
        await AudioPlayer.openUrl({ url })
      } catch (e) {
        console.warn('[StreamingLink] openUrl failed:', e)
      }
      return
    }

    // Plain https links (Shazam, Apple Music web, etc.) — open in in-app browser
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({
      url,
      presentationStyle: 'popover',
      toolbarColor: '#121214',
    })
  }

  private closeRecognitionModal(): void {
    const modal = document.getElementById('recognition-modal')
    if (!modal) return
    modal.classList.add('rcm-fade-out-modal')
    setTimeout(() => modal.remove(), 320)
  }

  private recognizeIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 2v20"/>
      <path d="M5 6v12"/>
      <path d="M13 4v16"/>
      <path d="M17 7v10"/>
      <path d="M21 10v4"/>
    </svg>`
  }
}
