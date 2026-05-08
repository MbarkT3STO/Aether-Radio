import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { EventBus } from '../store/EventBus'
import { AboutModal } from '../components/AboutModal'
import { ConfirmModal } from '../components/ConfirmModal'
import type { AppSettings, Theme } from '../domain/entities/AppSettings'

// Accent palette — mirrors Desktop (accents.css defines the actual colors).
const ACCENT_SWATCHES: Array<{ key: string; label: string; color: string }> = [
  { key: 'blue',         label: 'Blue',    color: '#007AFF' },
  { key: 'indigo',       label: 'Indigo',  color: '#5856D6' },
  { key: 'royal-purple', label: 'Royal',   color: '#7C3AED' },
  { key: 'purple',       label: 'Purple',  color: '#AF52DE' },
  { key: 'pink',         label: 'Pink',    color: '#FF2D55' },
  { key: 'red',          label: 'Red',     color: '#FF3B30' },
  { key: 'orange',       label: 'Orange',  color: '#FF9500' },
  { key: 'green',        label: 'Green',   color: '#34C759' },
  { key: 'mint',         label: 'Mint',    color: '#00C7BE' },
  { key: 'teal',         label: 'Teal',    color: '#30B0C7' },
  { key: 'cyan',         label: 'Cyan',    color: '#32ADE6' },
  { key: 'graphite',     label: 'Graphite', color: '#6E6E73' },
]

const DEFAULT_ACCENT = 'blue'

export class SettingsView extends BaseComponent {
  private bridge   = BridgeService.getInstance()
  private eventBus = EventBus.getInstance()
  private settings: AppSettings | null = null

  protected async afterMount(): Promise<void> {
    await this.loadSettings()
  }

  private async loadSettings(): Promise<void> {
    const result = await this.bridge.settings.get()
    if (result.success) {
      this.settings = result.data
      await this.renderContent()
    }
  }

  render(): string {
    return `
      <div class="settings-view animate-fade-in">
        <div class="view-header">
          <div class="view-header-row">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h1>Settings</h1>
          </div>
          <p class="view-subtitle">Customize your Aether Radio experience</p>
        </div>
        <div id="settings-content">
          <div class="loading-container"><div class="loading-spinner"></div></div>
        </div>
      </div>
    `
  }

  private async renderContent(): Promise<void> {
    const content = this.querySelector('#settings-content')
    if (!content || !this.settings) return
    const s = this.settings
    const currentAccent = document.documentElement.getAttribute('data-accent') ?? DEFAULT_ACCENT

    content.innerHTML = `
      <div class="stg-content-wrap">

        <!-- Appearance -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </div>
            <div>
              <div class="stg-card-title">Appearance</div>
              <div class="stg-card-sub">Theme &amp; accent color</div>
            </div>
          </div>

          <!-- Theme -->
          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Theme</div>
              <div class="stg-row-desc">Choose your preferred color scheme</div>
            </div>
            <div class="stg-toggle-group">
              <button class="stg-toggle-btn ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark" aria-label="Dark theme">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                Dark
              </button>
              <button class="stg-toggle-btn ${s.theme === 'light' ? 'active' : ''}" data-theme="light" aria-label="Light theme">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                Light
              </button>
            </div>
          </div>

          <!-- Accent color picker -->
          <div class="stg-row stg-row--stacked">
            <div class="stg-row-info">
              <div class="stg-row-label">Accent Color</div>
              <div class="stg-row-desc">Tint the app with your favorite color</div>
            </div>
            <div class="stg-accent-swatches" role="radiogroup" aria-label="Accent color">
              ${ACCENT_SWATCHES.map(sw => `
                <button
                  class="stg-accent-swatch ${currentAccent === sw.key ? 'active' : ''}"
                  data-accent="${sw.key}"
                  style="--sw:${sw.color}"
                  role="radio"
                  aria-checked="${currentAccent === sw.key}"
                  aria-label="${sw.label}"
                  title="${sw.label}">
                  <span class="stg-accent-swatch-dot"></span>
                  <span class="stg-accent-swatch-check">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Audio -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </div>
            <div>
              <div class="stg-card-title">Audio</div>
              <div class="stg-card-sub">Playback settings</div>
            </div>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Buffer Size</div>
              <div class="stg-row-desc">Balance latency and stability</div>
            </div>
            <div class="stg-toggle-group">
              <button class="stg-toggle-btn ${s.bufferSize === 'low' ? 'active' : ''}" data-buffer="low">Low</button>
              <button class="stg-toggle-btn ${s.bufferSize === 'balanced' ? 'active' : ''}" data-buffer="balanced">Balanced</button>
              <button class="stg-toggle-btn ${s.bufferSize === 'high' ? 'active' : ''}" data-buffer="high">High</button>
            </div>
          </div>
        </div>

        <!-- Data -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
            </div>
            <div>
              <div class="stg-card-title">Data</div>
              <div class="stg-card-sub">Manage your data</div>
            </div>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Play History</div>
              <div class="stg-row-desc">Clear all recently played stations</div>
            </div>
            <button class="stg-action-btn stg-action-btn--danger" id="stg-clear-history">Clear</button>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">My Stations</div>
              <div class="stg-row-desc">Add, edit, or remove your custom stations</div>
            </div>
            <button class="stg-action-btn" id="stg-manage-custom">Manage</button>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Featured Stations</div>
              <div class="stg-row-desc">Curated radio stations handpicked for you</div>
            </div>
            <button class="stg-action-btn" id="stg-featured">Open</button>
          </div>
        </div>

        <!-- About -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <div class="stg-card-title">About</div>
              <div class="stg-card-sub">App information</div>
            </div>
          </div>

          <button class="stg-about" id="stg-about-btn" style="background:transparent;border:none;width:100%;text-align:left;cursor:pointer;">
            <div class="stg-about-logo">
              <img src="./assets/logo.png" alt="Aether Radio" class="stg-about-logo-img">
            </div>
            <div>
              <div class="stg-about-name">Aether Radio</div>
              <div class="stg-about-version">Version 1.1.0 · Android · Tap for details</div>
            </div>
          </button>

          <div class="stg-divider"></div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Data Source</div>
              <div class="stg-row-desc">Community-driven radio station database</div>
            </div>
            <span class="stg-data-source-link" id="stg-data-source">radio-browser.info</span>
          </div>
        </div>

      </div>
    `
    this.attachListeners()
  }

  private attachListeners(): void {
    // Theme
    this.querySelectorAll('.stg-toggle-btn[data-theme]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const theme = btn.getAttribute('data-theme') as Theme
        await this.applyUpdate({ theme })
        document.documentElement.setAttribute('data-theme', theme)
        this.eventBus.emit('theme:changed', { theme })
      })
    })

    // Buffer size
    this.querySelectorAll('.stg-toggle-btn[data-buffer]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const bufferSize = btn.getAttribute('data-buffer') as 'low' | 'balanced' | 'high'
        await this.applyUpdate({ bufferSize })
        this.eventBus.emit('settings:buffer-changed', { bufferSize })
      })
    })

    // Accent swatches
    this.querySelectorAll<HTMLElement>('.stg-accent-swatch').forEach(btn => {
      this.on(btn, 'click', () => {
        const accent = btn.getAttribute('data-accent') ?? DEFAULT_ACCENT
        document.documentElement.setAttribute('data-accent', accent)
        try { localStorage.setItem('accent-color', accent) } catch { /* storage full */ }
        // Update active visual immediately without full re-render
        this.querySelectorAll('.stg-accent-swatch').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.querySelectorAll('.stg-accent-swatch').forEach(b => {
          b.setAttribute('aria-checked', b === btn ? 'true' : 'false')
        })
      })
    })

    // Clear history — confirm first
    const clearBtn = this.querySelector<HTMLElement>('#stg-clear-history')
    if (clearBtn) {
      this.on(clearBtn, 'click', async () => {
        const confirmed = await ConfirmModal.show({
          title: 'Clear Play History?',
          message: 'This will remove all recently played stations from your history. This action cannot be undone.',
          confirmLabel: 'Clear History',
          cancelLabel: 'Cancel',
          danger: true,
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>`
        })
        if (!confirmed) return
        const result = await this.bridge.history.clear()
        if (result.success) this.showToast('Play history cleared', 'success')
        else this.showToast('Failed to clear history', 'error')
      })
    }

    // Manage custom — navigate
    const manageBtn = this.querySelector<HTMLElement>('#stg-manage-custom')
    if (manageBtn) this.on(manageBtn, 'click', () => { window.location.hash = '#/custom' })

    // Featured — navigate
    const featBtn = this.querySelector<HTMLElement>('#stg-featured')
    if (featBtn) this.on(featBtn, 'click', () => { window.location.hash = '#/featured' })

    // About button — open AboutModal
    const aboutBtn = this.querySelector<HTMLElement>('#stg-about-btn')
    if (aboutBtn) this.on(aboutBtn, 'click', () => AboutModal.show())

    // Data source — open in browser
    const dataSource = this.querySelector<HTMLElement>('#stg-data-source')
    if (dataSource) this.on(dataSource, 'click', () => void this.openExternal('https://www.radio-browser.info'))
  }

  private async openExternal(url: string): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({
          url,
          presentationStyle: 'popover',
          toolbarColor: '#121214',
        })
        return
      }
    } catch { /* fall through */ }
    window.open(url, '_blank', 'noopener')
  }

  private async applyUpdate(update: Partial<AppSettings>): Promise<void> {
    const result = await this.bridge.settings.update(update)
    if (result.success) {
      this.settings = result.data
      await this.renderContent()
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
  }
}
