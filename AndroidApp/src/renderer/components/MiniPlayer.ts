import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { AudioService } from '../services/AudioService'
import { VisualizerService } from '../services/VisualizerService'
import { SleepTimer } from './SleepTimer'
import { ExpandedPlayer } from './ExpandedPlayer'
import { stationLogoHtml } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class MiniPlayer extends BaseComponent {
  private eventBus     = EventBus.getInstance()
  private playerStore  = PlayerStore.getInstance()
  private favStore     = FavoritesStore.getInstance()
  private bridge       = BridgeService.getInstance()
  private audio        = AudioService.getInstance()
  private viz          = new VisualizerService()
  private ambientViz   = new VisualizerService()
  private sleepTimer   = new SleepTimer()
  private renderedId: string | null = null
  private expanded: ExpandedPlayer | null = null
  private expandedEl: HTMLElement | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('player:play',       () => this.onStateChange())
    this.eventBus.on('player:pause',      () => this.onStateChange())
    this.eventBus.on('player:stop',       () => this.rebuild())
    this.eventBus.on('player:loading',    ({ loading }) => this.onLoading(loading))
    this.eventBus.on('favorites:changed', () => this.refreshFav())
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  render(): string {
    const station  = this.playerStore.currentStation
    const playing  = this.playerStore.isPlaying
    const loading  = this.playerStore.isLoading

    if (!station) {
      return `<div class="mp mp--empty">
        <div class="mp-logo"><div class="mp-logo-fallback">${this.svgRadio()}</div></div>
        <div class="mp-info"><span class="mp-empty-text">No station playing</span></div>
        <div class="mp-controls">
          <button class="mp-btn mp-btn--play" disabled>${this.svgPlay()}</button>
        </div>
      </div>`
    }

    const fav = this.favStore.isFavorite(station.id)

    return `<div class="mp" id="mp-root">
      <canvas class="mp-ambient" id="mp-ambient"></canvas>

      <div class="mp-logo" id="mp-logo">
        ${stationLogoHtml(station.favicon, station.name, 'player')}
        ${playing ? `<span class="mp-live-dot"></span>` : ''}
      </div>

      <div class="mp-info" id="mp-info">
        <div class="mp-name">${this.esc(station.name)}</div>
        <div class="mp-meta">
          ${countryFlag(station.countryCode)} ${this.esc(station.country)}${station.tags[0] ? ` · ${this.esc(station.tags[0])}` : ''}
        </div>
      </div>

      <div class="mp-controls">
        <div id="mp-sleep-slot"></div>

        <button class="mp-btn" id="mp-fav" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="${fav ? 'icon-fav-on' : 'icon-fav-off'}">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </button>

        <button class="mp-btn" id="mp-stop" title="Stop">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>

        <button class="mp-btn mp-btn--play ${playing ? 'mp-btn--playing' : ''}" id="mp-play">
          ${loading ? `<span class="spinner spinner--md"></span>` : (playing ? this.svgPause() : this.svgPlay())}
        </button>

        <button class="mp-btn mp-btn--expand" id="mp-expand" title="Open player" aria-label="Open full player">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </div>`
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  protected afterMount(): void {
    this.renderedId = this.playerStore.currentStation?.id ?? null
    this.wire()
    this.mountSleep()
    this.audio.setOnPlayStarted(async (el) => {
      await this.viz.initialize(el)
      const canvas = this.querySelector<HTMLCanvasElement>('#mp-ambient')
      if (canvas) {
        this.ambientViz.startAmbientVisualization(canvas, this.viz, true, true)
        requestAnimationFrame(() => canvas.classList.add('mp-ambient--on'))
      }
    })
  }

  protected beforeUnmount(): void {
    this.viz.stopVisualization()
    this.ambientViz.stopVisualization()
  }

  // ─── Wiring ────────────────────────────────────────────────────────────────

  private wire(): void {
    // Play / Pause
    const play = this.querySelector('#mp-play')
    if (play) {
      play.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.playerStore.isPlaying) this.playerStore.pause()
        else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
      })
    }

    // Stop
    const stop = this.querySelector('#mp-stop')
    if (stop) {
      stop.addEventListener('click', (e) => {
        e.stopPropagation()
        this.playerStore.stop()
      })
    }

    // Favorite
    const fav = this.querySelector('#mp-fav')
    if (fav) {
      fav.addEventListener('click', async (e) => {
        e.stopPropagation()
        const s = this.playerStore.currentStation
        if (!s) return
        if (this.favStore.isFavorite(s.id)) await this.bridge.favorites.remove(s.id)
        else await this.bridge.favorites.add(s)
        const r = await this.bridge.favorites.getAll()
        if (r.success) this.favStore.setFavorites(r.data)
      })
    }

    // Expand — dedicated button, both click + touchend for Android WebView reliability
    const expand = this.querySelector('#mp-expand')
    if (expand) {
      expand.addEventListener('click', (e) => {
        e.stopPropagation()
        this.openExpanded()
      })
      expand.addEventListener('touchend', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.openExpanded()
      })
    }
  }

  private mountSleep(): void {
    const slot = this.querySelector('#mp-sleep-slot')
    if (slot) void this.sleepTimer.mount(slot as HTMLElement)
  }

  // ─── Expanded player ───────────────────────────────────────────────────────

  private openExpanded(): void {
    if (this.expanded || !this.playerStore.currentStation) return

    this.expandedEl = document.createElement('div')
    this.expandedEl.id = 'ep-container'
    document.body.appendChild(this.expandedEl)

    this.expanded = new ExpandedPlayer(() => {
      this.expandedEl?.remove()
      this.expandedEl = null
      this.expanded = null
    })
    void this.expanded.mount(this.expandedEl)
  }

  // ─── Partial updates ───────────────────────────────────────────────────────

  private onStateChange(): void {
    const station = this.playerStore.currentStation
    if (!station || station.id !== this.renderedId || !this.querySelector('#mp-play')) {
      this.rebuild()
      return
    }
    const playing = this.playerStore.isPlaying
    const playBtn = this.querySelector<HTMLElement>('#mp-play')
    if (playBtn) {
      playBtn.classList.toggle('mp-btn--playing', playing)
      if (!this.playerStore.isLoading) playBtn.innerHTML = playing ? this.svgPause() : this.svgPlay()
    }
    const logo = this.querySelector<HTMLElement>('#mp-logo')
    if (logo) {
      const dot = logo.querySelector('.mp-live-dot')
      if (playing && !dot) logo.insertAdjacentHTML('beforeend', `<span class="mp-live-dot"></span>`)
      else if (!playing && dot) dot.remove()
    }
    const canvas = this.querySelector<HTMLCanvasElement>('#mp-ambient')
    if (!playing) {
      this.ambientViz.stopVisualization()
      canvas?.classList.remove('mp-ambient--on')
    }
  }

  private onLoading(loading: boolean): void {
    const btn = this.querySelector<HTMLElement>('#mp-play')
    if (!btn) { this.rebuild(); return }
    btn.innerHTML = loading
      ? `<span class="spinner spinner--md"></span>`
      : (this.playerStore.isPlaying ? this.svgPause() : this.svgPlay())
  }

  private refreshFav(): void {
    const s = this.playerStore.currentStation
    if (!s) return
    const fav = this.favStore.isFavorite(s.id)
    const btn = this.querySelector<HTMLElement>('#mp-fav')
    if (!btn) return
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" class="${fav ? 'icon-fav-on' : 'icon-fav-off'}">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  private rebuild(): void {
    this.ambientViz.stopVisualization()
    const parent = this.element?.parentNode as HTMLElement | null
    if (!parent) return
    parent.innerHTML = this.render()
    this.element = parent.firstElementChild as HTMLElement
    this.renderedId = this.playerStore.currentStation?.id ?? null
    this.setupImageErrorHandlers()
    this.afterMount()
  }

  // ─── SVG helpers ───────────────────────────────────────────────────────────

  private svgPlay(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
  }
  private svgPause(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
  }
  private svgRadio(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`
  }
  private esc(t: string): string {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
}
