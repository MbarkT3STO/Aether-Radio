import { BaseComponent } from './base/BaseComponent';
import { PlayerStore } from '../store/PlayerStore';
import { EventBus } from '../store/EventBus';
const QUICK_PRESETS = [15, 30, 45, 60];
export class SleepTimer extends BaseComponent {
    constructor() {
        super({});
        Object.defineProperty(this, "playerStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: PlayerStore.getInstance()
        });
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "isOpen", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "tickInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "unsubscribeSleepTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "outsideClickHandler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    render() {
        const minutesLeft = this.playerStore.sleepTimerMinutesLeft;
        const active = this.playerStore.hasSleepTimer;
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
            : ''}
        </button>
        ${this.isOpen ? this.renderPopover(active) : ''}
      </div>
    `;
    }
    renderPopover(active) {
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
    `;
    }
    afterMount() {
        this.attachListeners();
        this.startTick();
        if (!this.unsubscribeSleepTimer) {
            this.unsubscribeSleepTimer = this.eventBus.on('player:sleep-timer', () => {
                this.rerender();
            });
        }
    }
    beforeUnmount() {
        this.stopTick();
        this.removeOutsideClickHandler();
        if (this.unsubscribeSleepTimer) {
            this.unsubscribeSleepTimer();
            this.unsubscribeSleepTimer = null;
        }
    }
    attachListeners() {
        // Toggle button
        const toggleBtn = this.querySelector('#sleep-timer-toggle');
        if (toggleBtn) {
            this.on(toggleBtn, 'click', (e) => {
                e.stopPropagation();
                this.isOpen = !this.isOpen;
                this.rerender();
            });
        }
        // Custom input — focus it immediately when popover opens
        const input = this.querySelector('#sleep-timer-input');
        if (input) {
            setTimeout(() => input.focus(), 0);
            // Enter key submits
            this.on(input, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    this.startCustomTimer(input.value);
                }
            });
            // Prevent popover close on input click
            this.on(input, 'click', (e) => e.stopPropagation());
        }
        // Start button
        const setBtn = this.querySelector('#sleep-timer-set');
        if (setBtn) {
            this.on(setBtn, 'click', (e) => {
                e.stopPropagation();
                const inp = this.querySelector('#sleep-timer-input');
                this.startCustomTimer(inp?.value ?? '');
            });
        }
        // Quick presets
        this.querySelectorAll('.sleep-timer-preset').forEach((btn) => {
            this.on(btn, 'click', (e) => {
                e.stopPropagation();
                const minutes = parseInt(btn.dataset['minutes'] ?? '0', 10);
                if (minutes > 0) {
                    this.playerStore.setSleepTimer(minutes);
                    this.isOpen = false;
                    this.rerender();
                }
            });
        });
        // Cancel
        const cancelBtn = this.querySelector('#sleep-timer-cancel');
        if (cancelBtn) {
            this.on(cancelBtn, 'click', (e) => {
                e.stopPropagation();
                this.playerStore.clearSleepTimer();
                this.isOpen = false;
                this.rerender();
            });
        }
        // Outside click closes popover
        this.removeOutsideClickHandler();
        if (this.isOpen) {
            this.outsideClickHandler = (e) => {
                if (this.element && !this.element.contains(e.target)) {
                    this.isOpen = false;
                    this.rerender();
                }
            };
            setTimeout(() => {
                if (this.outsideClickHandler) {
                    document.addEventListener('click', this.outsideClickHandler);
                }
            }, 0);
        }
    }
    startCustomTimer(raw) {
        const minutes = parseInt(raw, 10);
        if (!isNaN(minutes) && minutes >= 1 && minutes <= 480) {
            this.playerStore.setSleepTimer(minutes);
            this.isOpen = false;
            this.rerender();
        }
        else {
            // Shake the input to signal invalid value
            const input = this.querySelector('#sleep-timer-input');
            if (input) {
                input.classList.add('sleep-timer-input--error');
                setTimeout(() => input.classList.remove('sleep-timer-input--error'), 600);
            }
        }
    }
    removeOutsideClickHandler() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
    startTick() {
        this.stopTick();
        this.tickInterval = setInterval(() => {
            if (this.playerStore.hasSleepTimer) {
                this.rerender();
            }
        }, 30000);
    }
    stopTick() {
        if (this.tickInterval !== null) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
    rerender() {
        if (!this.element || !this.element.parentNode)
            return;
        this.stopTick();
        this.removeOutsideClickHandler();
        const parent = this.element.parentNode;
        parent.innerHTML = this.render();
        this.element = parent.firstElementChild;
        this.attachListeners();
        this.startTick();
    }
    timerIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4l2 2"/>
      <path d="M5 3 2 6"/>
      <path d="m22 6-3-3"/>
    </svg>`;
    }
}
