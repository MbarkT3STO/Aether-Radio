import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { AudioService } from '../services/AudioService'
import { VisualizerService } from '../services/VisualizerService'
import { SleepTimer } from './SleepTimer'
import { SongRecognitionService } from '../services/SongRecognitionService'
import type { RecognitionResult } from '../services/SongRecognitionService'
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

    const unsub3 = this.eventBus.on('player:stop', () => { unsub1(); unsub2(); unsub3(); unsub4(); this.closeExpanded() })

    const unsub4 = this.eventBus.on('player:volume', ({ volume }) => {
      const fill = q('#mp-sheet-vol-fill')
      if (fill) fill.style.width = `${Math.round(volume * 100)}%`
    })

    this.eventBus.on('player:loading', ({ loading }) => {
      const btn = q('#mp-sheet-play')
      if (!btn) return
      const isPlaying = this.playerStore.isPlaying
      btn.innerHTML = loading
        ? `<span class="loading-spinner loading-spinner--md"></span>`
        : isPlaying
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
    })

    this.eventBus.on('favorites:changed', () => {
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

        <button class="rcm-close" id="rcm-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
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
          <div class="rcm-listening-label">Identifying song…</div>
          <div class="rcm-listening-sub">Analyzing audio fingerprint</div>
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

        const coverHtml = result.coverArt
          ? `<div class="rcm-cover-hero">
               <div class="rcm-cover-blur-bg" style="background-image:url('${result.coverArt.replace(/"/g, '%22')}')"></div>
               <div class="rcm-cover-wrap">
                 <img class="rcm-cover" src="${result.coverArt.replace(/"/g, '%22')}" alt="${titleText}">
               </div>
             </div>`
          : `<div class="rcm-found-icon-hero">
               <div class="rcm-found-icon-orb">
                 <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
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
            <div class="rcm-found-title">${titleText}</div>
            ${artistText ? `<div class="rcm-found-artist">${artistText}</div>` : ''}
            ${result.album
              ? `<div class="rcm-found-album">${this.esc(result.album)}${result.releaseDate ? ` · ${result.releaseDate.slice(0, 4)}` : ''}</div>`
              : ''}
          </div>
        `
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
