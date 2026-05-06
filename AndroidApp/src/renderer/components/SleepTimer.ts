import { BaseComponent } from './base/BaseComponent'
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'

const QUICK_PRESETS = [15, 30, 45, 60] as const

export class SleepTimer extends BaseComponent {
  private playerStore = PlayerStore.getInstance()
  private eventBus = EventBus.getInstance()
  private isOpen = false
  private tickInterval: ReturnType<typeof setInterval> | null = null
  private unsubscribeSleepTimer: (() => void) | null = null
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

        <!-- Custom input -->
        <div class="sleep-timer-custom">
          <input
            id="sleep-timer-input"
            class="sleep-timer-input"
            type="number"
            min="1"
            max="480"
            placeholder="min"
            aria-label="Custom minutes"
          />
          <button class="sleep-timer-set-btn" id="sleep-timer-set" aria-label="Start timer">
            Start
          </button>
        </div>

        <!-- Quick presets -->
        <div class="sleep-timer-presets-label">Quick pick</div>
        <div class="sleep-timer-presets">
          ${QUICK_PRESETS.map((min) => `
            <button class="sleep-timer-preset" data-minutes="${min}"
              aria-label="Set sleep timer for ${min} minutes">${min}m</button>
          `).join('')}
        </div>

        ${active ? `
          <div class="sleep-timer-active-row">
            <span class="sleep-timer-active-label">
              ${this.timerIcon()} Stops in ${this.playerStore.sleepTimerMinutesLeft ?? 0}m
            </span>
            <button class="sleep-timer-cancel" id="sleep-timer-cancel">Cancel</button>
          </div>
        ` : ''}
      </div>
    `
  }

  protected afterMount(): void {
    this.attachListeners()
    this.startTick()
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
    // Toggle button
    const toggleBtn = this.querySelector<HTMLElement>('#sleep-timer-toggle')
    if (toggleBtn) {
      this.on(toggleBtn, 'click', (e) => {
        e.stopPropagation()
        this.isOpen = !this.isOpen
        this.rerender()
      })
    }

    // Custom input — focus it immediately when popover opens
    const input = this.querySelector<HTMLInputElement>('#sleep-timer-input')
    if (input) {
      setTimeout(() => input.focus(), 0)

      // Enter key submits
      this.on(input, 'keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          e.stopPropagation()
          this.startCustomTimer(input.value)
        }
      })

      // Prevent popover close on input click
      this.on(input, 'click', (e) => e.stopPropagation())
    }

    // Start button
    const setBtn = this.querySelector<HTMLElement>('#sleep-timer-set')
    if (setBtn) {
      this.on(setBtn, 'click', (e) => {
        e.stopPropagation()
        const inp = this.querySelector<HTMLInputElement>('#sleep-timer-input')
        this.startCustomTimer(inp?.value ?? '')
      })
    }

    // Quick presets
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

    // Cancel
    const cancelBtn = this.querySelector<HTMLElement>('#sleep-timer-cancel')
    if (cancelBtn) {
      this.on(cancelBtn, 'click', (e) => {
        e.stopPropagation()
        this.playerStore.clearSleepTimer()
        this.isOpen = false
        this.rerender()
      })
    }

    // Outside click closes popover — attach synchronously, not via setTimeout,
    // to avoid the race where unmount fires before the timeout and the handler
    // gets added to document after cleanup and is never removed.
    this.removeOutsideClickHandler()
    if (this.isOpen) {
      this.outsideClickHandler = (e: Event): void => {
        if (this.element && !this.element.contains(e.target as Node)) {
          this.isOpen = false
          this.rerender()
        }
      }
      // Use requestAnimationFrame so the current click event that opened the
      // popover has fully propagated before we start listening for outside clicks.
      requestAnimationFrame(() => {
        if (this.outsideClickHandler) {
          document.addEventListener('click', this.outsideClickHandler)
        }
      })
    }
  }

  private startCustomTimer(raw: string): void {
    const minutes = parseInt(raw, 10)
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 480) {
      this.playerStore.setSleepTimer(minutes)
      this.isOpen = false
      this.rerender()
    } else {
      // Shake the input to signal invalid value
      const input = this.querySelector<HTMLInputElement>('#sleep-timer-input')
      if (input) {
        input.classList.add('sleep-timer-input--error')
        setTimeout(() => input.classList.remove('sleep-timer-input--error'), 600)
      }
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
    this.stopTick()
    this.removeOutsideClickHandler()
    const parent = this.element.parentNode as HTMLElement
    parent.innerHTML = this.render()
    this.element = parent.firstElementChild as HTMLElement
    this.attachListeners()
    this.startTick()
  }

  private timerIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4l2 2"/>
      <path d="M5 3 2 6"/>
      <path d="m22 6-3-3"/>
    </svg>`
  }
}
