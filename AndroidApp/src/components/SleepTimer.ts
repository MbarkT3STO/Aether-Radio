/**
 * SleepTimer — mobile bottom-sheet version.
 * Renders a small timer button; tapping opens a modal sheet with presets.
 */
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'

const PRESETS = [15, 30, 45, 60, 90, 120] as const

export class SleepTimer {
  private playerStore = PlayerStore.getInstance()
  private eventBus    = EventBus.getInstance()
  private _sheet: HTMLElement | null = null
  private _tickInterval: ReturnType<typeof setInterval> | null = null
  private _unsub: (() => void) | null = null
  private _container: HTMLElement | null = null

  mount(container: HTMLElement): void {
    this._container = container
    this.render()
    // Refresh UI whenever a sleep timer starts/stops — we start/stop the
    // tick interval lazily here to avoid running a 30s poll forever.
    this._unsub = this.eventBus.on('player:sleep-timer', () => {
      this.render()
      this.syncTick()
    })
    this.syncTick()
  }

  unmount(): void {
    this._unsub?.()
    this._unsub = null
    this.stopTick()
    this._sheet?.remove()
    this._sheet = null
    if (this._container) this._container.innerHTML = ''
    this._container = null
  }

  /**
   * Start the once-per-30-seconds UI refresh only while a sleep timer is
   * active; stop it otherwise. Saves the idle polling cost.
   */
  private syncTick(): void {
    if (this.playerStore.hasSleepTimer) {
      if (this._tickInterval === null) {
        this._tickInterval = setInterval(() => this.render(), 30_000)
      }
    } else {
      this.stopTick()
    }
  }

  private stopTick(): void {
    if (this._tickInterval !== null) {
      clearInterval(this._tickInterval)
      this._tickInterval = null
    }
  }

  private render(): void {
    if (!this._container) return
    const active      = this.playerStore.hasSleepTimer
    const minutesLeft = this.playerStore.sleepTimerMinutesLeft

    this._container.innerHTML = `
      <button class="sleep-timer-btn${active ? ' sleep-timer-btn--active' : ''}"
        id="sleep-timer-toggle" aria-label="${active ? `Sleep timer: ${minutesLeft}m left` : 'Sleep timer'}">
        ${this.icon()}
        ${active && minutesLeft !== null
          ? `<span class="sleep-timer-badge">${minutesLeft}m</span>`
          : ''}
      </button>`

    this._container.querySelector('#sleep-timer-toggle')?.addEventListener('click', () => {
      this.openSheet()
    })
  }

  private openSheet(): void {
    if (this._sheet) { this._sheet.remove(); this._sheet = null; return }

    const active      = this.playerStore.hasSleepTimer
    const minutesLeft = this.playerStore.sleepTimerMinutesLeft

    const sheet = document.createElement('div')
    sheet.className = 'sleep-timer-sheet'
    sheet.innerHTML = `
      <div class="sleep-timer-sheet-backdrop" id="st-backdrop"></div>
      <div class="sleep-timer-sheet-panel">
        <div class="sleep-timer-sheet-handle"></div>
        <div class="sleep-timer-sheet-title">${this.icon()} Sleep Timer</div>

        ${active ? `
          <div class="sleep-timer-active-row">
            <span class="sleep-timer-active-label">Stops in <strong>${minutesLeft}m</strong></span>
            <button class="sleep-timer-cancel-btn" id="st-cancel">Cancel</button>
          </div>
        ` : ''}

        <div class="sleep-timer-presets">
          ${PRESETS.map(m => `
            <button class="sleep-timer-preset${active && minutesLeft === m ? ' active' : ''}"
              data-min="${m}">${m} min</button>
          `).join('')}
        </div>

        <div class="sleep-timer-custom-row">
          <input class="sleep-timer-custom-input" id="st-custom-input"
            type="number" min="1" max="480" placeholder="Custom (min)" inputmode="numeric">
          <button class="sleep-timer-custom-set" id="st-custom-set">Set</button>
        </div>
      </div>`

    document.body.appendChild(sheet)
    this._sheet = sheet
    requestAnimationFrame(() => sheet.querySelector('.sleep-timer-sheet-panel')?.classList.add('open'))

    // Backdrop close
    sheet.querySelector('#st-backdrop')?.addEventListener('click', () => this.closeSheet())

    // Cancel
    sheet.querySelector('#st-cancel')?.addEventListener('click', () => {
      this.playerStore.clearSleepTimer()
      this.closeSheet()
    })

    // Presets
    sheet.querySelectorAll('.sleep-timer-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = parseInt((btn as HTMLElement).dataset['min'] ?? '0', 10)
        if (m > 0) { this.playerStore.setSleepTimer(m); this.closeSheet() }
      })
    })

    // Custom
    sheet.querySelector('#st-custom-set')?.addEventListener('click', () => {
      const val = parseInt((sheet.querySelector('#st-custom-input') as HTMLInputElement).value, 10)
      if (!isNaN(val) && val >= 1 && val <= 480) {
        this.playerStore.setSleepTimer(val)
        this.closeSheet()
      }
    })
  }

  private closeSheet(): void {
    const panel = this._sheet?.querySelector('.sleep-timer-sheet-panel')
    panel?.classList.remove('open')
    setTimeout(() => { this._sheet?.remove(); this._sheet = null; this.render() }, 300)
  }

  private icon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/>
      <path d="M5 3 2 6"/><path d="m22 6-3-3"/>
    </svg>`
  }
}
