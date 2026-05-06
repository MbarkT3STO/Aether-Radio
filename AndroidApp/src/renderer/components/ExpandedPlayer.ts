import { BaseComponent } from './base/BaseComponent'
import { EventBus } from '../store/EventBus'
import { PlayerStore } from '../store/PlayerStore'
import { FavoritesStore } from '../store/FavoritesStore'
import { BridgeService } from '../services/BridgeService'
import { stationLogoHtml } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

export class ExpandedPlayer extends BaseComponent {
  private eventBus    = EventBus.getInstance()
  private playerStore = PlayerStore.getInstance()
  private favStore    = FavoritesStore.getInstance()
  private bridge      = BridgeService.getInstance()
  private onClose: () => void
  private unsubs: Array<() => void> = []

  constructor(onClose: () => void) {
    super({})
    this.onClose = onClose
    this.unsubs.push(
      this.eventBus.on('player:play',       () => this.onStationChange()),
      this.eventBus.on('player:pause',      () => this.updateControls()),
      this.eventBus.on('player:stop',       () => this.close()),
      this.eventBus.on('player:loading',    ({ loading }) => this.onLoading(loading)),
      this.eventBus.on('favorites:changed', () => this.refreshFav()),
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  render(): string {
    const station = this.playerStore.currentStation
    const playing = this.playerStore.isPlaying
    const loading = this.playerStore.isLoading

    if (!station) return `<div class="ep"></div>`

    const fav     = this.favStore.isFavorite(station.id)
    const bitrate = station.bitrate ? `${station.bitrate} kbps` : ''
    const codec   = station.codec || ''
    const votes   = station.votes ? `${station.votes.toLocaleString()} votes` : ''
    const meta    = [bitrate, codec, votes].filter(Boolean).join(' · ')

    return `<div class="ep" id="ep-root">
      <!-- Sheet slides up from bottom, covers content area, nav stays visible -->
      <div class="ep-sheet" id="ep-sheet">

        <!-- Drag handle -->
        <div class="ep-handle"></div>

        <!-- Close -->
        <button class="ep-close" id="ep-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Artwork -->
        <div class="ep-artwork" id="ep-artwork">
          ${stationLogoHtml(station.favicon, station.name, 'player')}
          ${playing ? `<div class="ep-artwork-glow"></div>` : ''}
        </div>

        <!-- Info -->
        <div class="ep-info">
          <div class="ep-name">${this.esc(station.name)}</div>
          <div class="ep-meta">
            ${countryFlag(station.countryCode)} ${this.esc(station.country)}${station.tags[0] ? ` · ${this.esc(station.tags[0])}` : ''}
          </div>
          ${meta ? `<div class="ep-stats">${this.esc(meta)}</div>` : ''}
        </div>

        <!-- Controls -->
        <div class="ep-controls">
          <button class="ep-btn ep-btn--icon" id="ep-fav" title="${fav ? 'Remove' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" class="${fav ? 'icon-fav-on' : 'icon-fav-off'}">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>

          <button class="ep-btn ep-btn--play ${playing ? 'ep-btn--playing' : ''}" id="ep-play">
            ${loading ? `<span class="spinner spinner--lg"></span>` : (playing ? this.svgPause() : this.svgPlay())}
          </button>

          <button class="ep-btn ep-btn--icon" id="ep-stop" title="Stop">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
        </div>

        ${playing ? `<div class="ep-live"><span class="ep-live-dot"></span><span>LIVE</span></div>` : ''}
      </div>
    </div>`
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  protected afterMount(): void {
    this.wire()
    // Animate in on next frame so CSS transition fires
    requestAnimationFrame(() => {
      this.querySelector('#ep-sheet')?.classList.add('ep-sheet--open')
    })
  }

  protected beforeUnmount(): void {
    this.unsubs.forEach(u => u())
    this.unsubs = []
  }

  // ─── Wiring ────────────────────────────────────────────────────────────────

  private wire(): void {
    const closeBtn = this.querySelector('#ep-close')
    if (closeBtn) closeBtn.addEventListener('click', () => this.close())

    const playBtn = this.querySelector('#ep-play')
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.playerStore.isPlaying) this.playerStore.pause()
        else if (this.playerStore.currentStation) this.playerStore.play(this.playerStore.currentStation)
      })
    }

    const stopBtn = this.querySelector('#ep-stop')
    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.playerStore.stop()
      })
    }

    const favBtn = this.querySelector('#ep-fav')
    if (favBtn) {
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const s = this.playerStore.currentStation
        if (!s) return
        if (this.favStore.isFavorite(s.id)) await this.bridge.favorites.remove(s.id)
        else await this.bridge.favorites.add(s)
        const r = await this.bridge.favorites.getAll()
        if (r.success) this.favStore.setFavorites(r.data)
      })
    }

    // Swipe down to close
    this.wireSwipeClose()
  }

  private wireSwipeClose(): void {
    const sheet = this.querySelector<HTMLElement>('#ep-sheet')
    if (!sheet) return
    let startY = 0, curY = 0, dragging = false

    sheet.addEventListener('touchstart', (e) => {
      startY = (e as TouchEvent).touches[0].clientY
      curY = startY
      dragging = true
      sheet.classList.add('ep-sheet--dragging')
    })
    sheet.addEventListener('touchmove', (e) => {
      if (!dragging) return
      curY = (e as TouchEvent).touches[0].clientY
      const d = Math.max(0, curY - startY)
      sheet.style.transform = `translateY(${d}px)`
    })
    sheet.addEventListener('touchend', () => {
      if (!dragging) return
      dragging = false
      sheet.classList.remove('ep-sheet--dragging')
      if (curY - startY > 100) {
        this.close()
      } else {
        sheet.style.transform = ''
      }
    })
  }

  // ─── Close ─────────────────────────────────────────────────────────────────

  close(): void {
    const sheet = this.querySelector<HTMLElement>('#ep-sheet')
    if (sheet) sheet.classList.remove('ep-sheet--open')
    setTimeout(() => this.onClose(), 320)
  }

  // ─── Partial updates ───────────────────────────────────────────────────────

  private onStationChange(): void {
    const s = this.playerStore.currentStation
    if (!s) return
    const artwork = this.querySelector<HTMLElement>('#ep-artwork')
    if (artwork) artwork.innerHTML = `${stationLogoHtml(s.favicon, s.name, 'player')}<div class="ep-artwork-glow"></div>`
    const name = this.querySelector<HTMLElement>('.ep-name')
    if (name) name.textContent = s.name
    const meta = this.querySelector<HTMLElement>('.ep-meta')
    if (meta) meta.innerHTML = `${countryFlag(s.countryCode)} ${this.esc(s.country)}${s.tags[0] ? ` · ${this.esc(s.tags[0])}` : ''}`
    this.updateControls()
    this.refreshFav()
  }

  private updateControls(): void {
    const playing = this.playerStore.isPlaying
    const btn = this.querySelector<HTMLElement>('#ep-play')
    if (!btn) return
    btn.classList.toggle('ep-btn--playing', playing)
    if (!this.playerStore.isLoading) btn.innerHTML = playing ? this.svgPause() : this.svgPlay()

    const sheet = this.querySelector<HTMLElement>('#ep-sheet')
    const liveEl = this.querySelector<HTMLElement>('.ep-live')
    if (playing && !liveEl && sheet) {
      sheet.insertAdjacentHTML('beforeend', `<div class="ep-live"><span class="ep-live-dot"></span><span>LIVE</span></div>`)
    } else if (!playing && liveEl) {
      liveEl.remove()
    }

    const glow = this.querySelector<HTMLElement>('.ep-artwork-glow')
    const artwork = this.querySelector<HTMLElement>('#ep-artwork')
    if (playing && !glow && artwork) artwork.insertAdjacentHTML('beforeend', `<div class="ep-artwork-glow"></div>`)
    else if (!playing && glow) glow.remove()
  }

  private onLoading(loading: boolean): void {
    const btn = this.querySelector<HTMLElement>('#ep-play')
    if (!btn) return
    btn.innerHTML = loading ? `<span class="spinner spinner--lg"></span>` : (this.playerStore.isPlaying ? this.svgPause() : this.svgPlay())
  }

  private refreshFav(): void {
    const s = this.playerStore.currentStation
    if (!s) return
    const fav = this.favStore.isFavorite(s.id)
    const btn = this.querySelector<HTMLElement>('#ep-fav')
    if (!btn) return
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" class="${fav ? 'icon-fav-on' : 'icon-fav-off'}">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`
  }

  // ─── SVG helpers ───────────────────────────────────────────────────────────

  private svgPlay(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
  }
  private svgPause(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
  }
  private esc(t: string): string {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
}
