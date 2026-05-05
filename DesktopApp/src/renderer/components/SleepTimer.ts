import { BaseComponent } from './base/BaseComponent'
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'

const PRESETS = [15, 30, 45, 60] as const

export class SleepTimer extends BaseComponent {
  private playerStore = PlayerStore.getInstance()
  private eventBus = EventBus.getInstance()
  private isOpen = false
  private tickInterval: ReturnType<typeof setInterval> | null = null
  private unsubscribeSleepTimer: (() => void) | null = null
  // Single stable outside-click handler so we can remove it precisely
  private outsideClickHandler: ((e: Event) => void) | null = null

  constructor() {
    super({})
  }

  render(): string {
    const minutesLeft = this.playerStore.sleepTimerMinutesLeft
    const active = this.playerStore.hasSleepTimer

    return `
      <div class="sleep-timer">
        <button
          class="sleep-timer-btn player-btn ${active ? 'sleep-timer-btn--active' : ''}"
          id="sleep-timer-toggle"
          title="${active ? `Sleep timer: ${minutesLeft ?? 0}m left` : 'Set sleep timer'}"
          aria-label="${active ? `Sleep timer active, ${minutesLeft ?? 0} minutes left` : 'Set sleep timer'}"
          aria-expanded="${this.isOpen}"
          aria-haspopup="true"
        >
          ${this.timerIcon()}
          ${active && minutesLeft !== null
            ? `<span class="sleep-timer-badge">${minutesLeft}m</span>`
            : ''
          }
        </button>

        ${this.isOpen ? this.renderPopover(active) : ''}
      </div>
    `
  }

  private renderPopover(active: boolean): string {
    return `
      <div class="sleep-timer-popover" role="dialog" aria-label="Sleep timer options">
        <div class="sleep-timer-popover-header">Sleep Timer</div>
        <div class="sleep-timer-presets">
          ${PRESETS.map((min) => `
            <button class="sleep-timer-preset" data-minutes="${min}"
              aria-label="Set sleep timer for ${min} minutes">${min} min</button>
          `).join('')}
        </div>
        ${active
          ? `<button class="sleep-timer-cancel" id="sleep-timer-cancel">Cancel Timer</button>`
          : ''
        }
      </div>
    `
  }

  protected afterMount(): void {
    this.attachListeners()
    this.startTick()
    // Only subscribe once — guard against double-mount
    if (!this.unsubscribeSleepTimer) {
      this.unsubscribeSleepTimer = this.eventBus.on('player:sleep-timer', () => {
        this.rerender()
      })
    }
  }

  protected beforeUnmount(): void {
    this.stopTick()
    this.removeOutsideClickHandler()
    if (this.unsubscribeSleepTimer) {
      this.unsubscribeSleepTimer()
      this.unsubscribeSleepTimer = null
    }
  }

  private attachListeners(): void {
    const toggleBtn = this.querySelector<HTMLElement>('#sleep-timer-toggle')
    if (toggleBtn) {
      this.on(toggleBtn, 'click', (e) => {
        e.stopPropagation()
        this.isOpen = !this.isOpen
        this.rerender()
      })
    }

    this.querySelectorAll<HTMLElement>('.sleep-timer-preset').forEach((btn) => {
      this.on(btn, 'click', (e) => {
        e.stopPropagation()
        const minutes = parseInt(btn.dataset['minutes'] ?? '0', 10)
        if (minutes > 0) {
          this.playerStore.setSleepTimer(minutes)
          this.isOpen = false
          this.rerender()
        }
      })
    })

    const cancelBtn = this.querySelector<HTMLElement>('#sleep-timer-cancel')
    if (cancelBtn) {
      this.on(cancelBtn, 'click', (e) => {
        e.stopPropagation()
        this.playerStore.clearSleepTimer()
        this.isOpen = false
        this.rerender()
      })
    }

    // Register outside-click handler only when popover is open
    this.removeOutsideClickHandler()
    if (this.isOpen) {
      this.outsideClickHandler = (e: Event): void => {
        if (this.element && !this.element.contains(e.target as Node)) {
          this.isOpen = false
          this.rerender()
        }
      }
      // Use capture:false, setTimeout so the current click that opened the
      // popover doesn't immediately close it
      setTimeout(() => {
        if (this.outsideClickHandler) {
          document.addEventListener('click', this.outsideClickHandler)
        }
      }, 0)
    }
  }

  private removeOutsideClickHandler(): void {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler)
      this.outsideClickHandler = null
    }
  }

  private startTick(): void {
    this.stopTick()
    this.tickInterval = setInterval(() => {
      if (this.playerStore.hasSleepTimer) {
        this.rerender()
      }
    }, 30_000)
  }

  private stopTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  private rerender(): void {
    if (!this.element || !this.element.parentNode) return
    // Clean up before DOM replacement — but keep the EventBus subscription
    this.stopTick()
    this.removeOutsideClickHandler()
    const parent = this.element.parentNode as HTMLElement
    parent.innerHTML = this.render()
    this.element = parent.firstElementChild as HTMLElement
    // Re-attach DOM listeners and tick; do NOT re-subscribe EventBus
    this.attachListeners()
    this.startTick()
  }

  private timerIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4l2 2"/>
      <path d="M5 3 2 6"/>
      <path d="m22 6-3-3"/>
      <path d="M6.38 18.7 4 21"/>
      <path d="M17.64 18.67 20 21"/>
    </svg>`
  }
}
