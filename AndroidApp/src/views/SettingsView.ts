import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { EventBus } from '../store/EventBus'
import { ConfirmModal } from '../components/ConfirmModal'
import type { AppSettings, Theme } from '../domain/entities/AppSettings'

// ── External URLs — kept in sync with Desktop SettingsView ──
const REPO_OWNER   = 'MbarkT3STO'
const REPO_NAME    = 'Aether-Radio'
const REPO_URL     = `https://github.com/${REPO_OWNER}/${REPO_NAME}`
const ISSUES_URL   = `${REPO_URL}/issues`
const RELEASES_URL = `${REPO_URL}/releases`
const DEV_URL      = `https://github.com/${REPO_OWNER}`
const DEV_NAME     = 'MBVRK'
const FUND_URL     = 'https://liberapay.com/MBVRK/'
const WEBSITE_URL  = 'https://www.radio-browser.info'
const APP_VERSION  = '1.1.0'

// Accent palette — mirrors Desktop (accents.css has the actual colors).
const ACCENTS: Array<{ id: string; label: string; light: string; dark: string }> = [
  { id: 'blue',         label: 'Blue',         light: '#007AFF', dark: '#0A84FF' },
  { id: 'indigo',       label: 'Indigo',       light: '#5856D6', dark: '#5E5CE6' },
  { id: 'royal-purple', label: 'Royal Purple', light: '#7C3AED', dark: '#A78BFA' },
  { id: 'purple',       label: 'Purple',       light: '#AF52DE', dark: '#BF5AF2' },
  { id: 'pink',         label: 'Pink',         light: '#FF2D55', dark: '#FF375F' },
  { id: 'red',          label: 'Red',          light: '#FF3B30', dark: '#FF453A' },
  { id: 'orange',       label: 'Orange',       light: '#FF9500', dark: '#FF9F0A' },
  { id: 'green',        label: 'Green',        light: '#34C759', dark: '#30D158' },
  { id: 'mint',         label: 'Mint',         light: '#00C7BE', dark: '#63E6E2' },
  { id: 'teal',         label: 'Teal',         light: '#30B0C7', dark: '#40C8E0' },
  { id: 'cyan',         label: 'Cyan',         light: '#32ADE6', dark: '#64D2FF' },
  { id: 'graphite',     label: 'Graphite',     light: '#6E6E73', dark: '#AEAEB2' },
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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></svg>
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

        <!-- ── Appearance ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconSun()}</div>
            <div>
              <div class="stg-card-title">Appearance</div>
              <div class="stg-card-sub">Visual preferences</div>
            </div>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Theme</div>
              <div class="stg-row-desc">Choose your preferred color scheme</div>
            </div>
            <div class="stg-toggle-group">
              <button class="stg-toggle-btn ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark" aria-label="Dark theme">
                ${this.iconMoon()} Dark
              </button>
              <button class="stg-toggle-btn ${s.theme === 'light' ? 'active' : ''}" data-theme="light" aria-label="Light theme">
                ${this.iconSunSmall()} Light
              </button>
            </div>
          </div>

          <div class="stg-row stg-row--stacked">
            <div class="stg-row-info">
              <div class="stg-row-label">Accent Color</div>
              <div class="stg-row-desc">Tint buttons, highlights, and controls</div>
            </div>
            <div class="stg-accent-swatches" role="radiogroup" aria-label="Accent color">
              ${this.renderAccentSwatches(currentAccent)}
            </div>
          </div>
        </div>

        <!-- ── Audio ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconVolume()}</div>
            <div>
              <div class="stg-card-title">Audio</div>
              <div class="stg-card-sub">Playback settings</div>
            </div>
          </div>
          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Buffer Size</div>
              <div class="stg-row-desc">Balance between latency and stability</div>
            </div>
            <div class="stg-toggle-group">
              <button class="stg-toggle-btn ${s.bufferSize === 'low' ? 'active' : ''}" data-buffer="low">Low</button>
              <button class="stg-toggle-btn ${s.bufferSize === 'balanced' ? 'active' : ''}" data-buffer="balanced">Balanced</button>
              <button class="stg-toggle-btn ${s.bufferSize === 'high' ? 'active' : ''}" data-buffer="high">High</button>
            </div>
          </div>
        </div>

        <!-- ── Data ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconDatabase()}</div>
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
            <button class="stg-action-btn stg-action-btn--danger" id="stg-clear-history">Clear History</button>
          </div>
        </div>

        <!-- ── About ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconInfo()}</div>
            <div>
              <div class="stg-card-title">About</div>
              <div class="stg-card-sub">About this project</div>
            </div>
          </div>

          <!-- Hero -->
          <div class="stg-about">
            <div class="stg-about-logo">
              <img src="./assets/logo.png" alt="Aether Radio" class="stg-about-logo-img">
            </div>
            <div>
              <div class="stg-about-name">
                Aether Radio
                <span class="am-version-badge" style="margin-left:8px;">v${APP_VERSION}</span>
              </div>
              <div class="stg-about-version">World radio, reimagined</div>
            </div>
          </div>

          <div class="stg-divider"></div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Description</div>
              <div class="stg-row-desc">
                A modern radio player that streams over 30,000 stations from around the world,
                right on your Android device.
              </div>
            </div>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Version</div>
              <div class="stg-row-desc">Released 2026 · Android</div>
            </div>
            <span class="stg-data-source-link" style="cursor:default;">${APP_VERSION}</span>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">License</div>
              <div class="stg-row-desc">Free and open source</div>
            </div>
            <span class="stg-data-source-link" style="cursor:default;">MIT</span>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Data Source</div>
              <div class="stg-row-desc">Community-driven radio station database</div>
            </div>
            <span class="stg-data-source-link" id="stg-data-source-link" role="link" tabindex="0">radio-browser.info</span>
          </div>
        </div>

        <!-- ── Repository ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconGitHub()}</div>
            <div>
              <div class="stg-card-title">Repository</div>
              <div class="stg-card-sub">Source code and contributions</div>
            </div>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">GitHub</div>
              <div class="stg-row-desc">${REPO_OWNER} / ${REPO_NAME}</div>
            </div>
            <button class="stg-action-btn" id="stg-open-repo">Open</button>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Report an Issue</div>
              <div class="stg-row-desc">Bugs, feedback, and feature requests</div>
            </div>
            <button class="stg-action-btn" id="stg-report-issue">Report</button>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Releases</div>
              <div class="stg-row-desc">Download previous builds and view the changelog</div>
            </div>
            <button class="stg-action-btn" id="stg-open-releases">View</button>
          </div>
        </div>

        <!-- ── Developer ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconUser()}</div>
            <div>
              <div class="stg-card-title">Developer</div>
              <div class="stg-card-sub">The maker behind Aether Radio</div>
            </div>
          </div>

          <div class="stg-about">
            <div class="stg-about-logo stg-about-logo--dev" data-dev-fallback>
              <div class="stg-about-logo-fallback">${this.iconUserFallback()}</div>
              <img src="https://github.com/${REPO_OWNER}.png?size=120" alt="${DEV_NAME}"
                   class="stg-about-logo-img" data-dev-avatar
                   referrerpolicy="no-referrer">
            </div>
            <div>
              <div class="stg-about-name">${DEV_NAME}</div>
              <div class="stg-about-version">Independent developer · Open source enthusiast</div>
            </div>
          </div>

          <div class="stg-divider"></div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">GitHub Profile</div>
              <div class="stg-row-desc">View all public repositories</div>
            </div>
            <button class="stg-action-btn" id="stg-open-dev">Visit</button>
          </div>

          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Support Development</div>
              <div class="stg-row-desc">Fund ongoing work via Liberapay</div>
            </div>
            <button class="stg-action-btn" id="stg-sponsor">Donate</button>
          </div>
        </div>

      </div>
    `
    this.attachListeners()
  }

  private renderAccentSwatches(current: string): string {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return ACCENTS.map(a => {
      const color = isDark ? a.dark : a.light
      const active = a.id === current ? 'active' : ''
      return `
        <button type="button"
                class="stg-accent-swatch ${active}"
                data-accent="${a.id}"
                role="radio"
                aria-checked="${a.id === current}"
                aria-label="${a.label}"
                title="${a.label}"
                style="--sw:${color}">
          <span class="stg-accent-swatch-dot"></span>
          <span class="stg-accent-swatch-check">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="m5 12 5 5L20 7"/>
            </svg>
          </span>
        </button>
      `
    }).join('')
  }

  private attachListeners(): void {
    // Theme
    this.querySelectorAll('.stg-toggle-btn[data-theme]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const theme = btn.getAttribute('data-theme') as Theme
        if (this.settings?.theme === theme) return
        document.documentElement.setAttribute('data-theme', theme)
        await this.applyUpdate({ theme })
        this.eventBus.emit('theme:changed', { theme })
      })
    })

    // Buffer
    this.querySelectorAll('.stg-toggle-btn[data-buffer]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const bufferSize = btn.getAttribute('data-buffer') as 'low' | 'balanced' | 'high'
        if (this.settings?.bufferSize === bufferSize) return
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
        // Update visual state without full re-render
        this.querySelectorAll<HTMLElement>('.stg-accent-swatch').forEach(b => {
          const isActive = b === btn
          b.classList.toggle('active', isActive)
          b.setAttribute('aria-checked', String(isActive))
        })
      })
    })

    // Clear history — confirm first
    const clearBtn = this.querySelector<HTMLElement>('#stg-clear-history')
    if (clearBtn) {
      this.on(clearBtn, 'click', async () => {
        const confirmed = await ConfirmModal.show({
          title: 'Clear Play History',
          message: 'All recently played stations will be permanently removed. This cannot be undone.',
          confirmLabel: 'Clear History',
          cancelLabel: 'Keep it',
          danger: true,
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>`
        })
        if (!confirmed) return
        const result = await this.bridge.history.clear()
        if (result.success) this.showToast('Play history cleared', 'success')
        else this.showToast('Failed to clear history', 'error')
      })
    }

    // External links — all route through Capacitor Browser on native
    const linkIds: Array<[string, string]> = [
      ['#stg-data-source-link', WEBSITE_URL],
      ['#stg-open-repo',        REPO_URL],
      ['#stg-report-issue',     ISSUES_URL],
      ['#stg-open-releases',    RELEASES_URL],
      ['#stg-open-dev',         DEV_URL],
      ['#stg-sponsor',          FUND_URL],
    ]
    for (const [sel, url] of linkIds) {
      const el = this.querySelector<HTMLElement>(sel)
      if (el) this.on(el, 'click', () => void this.openExternal(url))
    }

    // Developer avatar — show local fallback if the remote avatar fails (offline)
    const devAvatar = this.querySelector<HTMLImageElement>('[data-dev-avatar]')
    if (devAvatar) {
      const handleError = (): void => {
        const parent = devAvatar.closest('[data-dev-fallback]') as HTMLElement | null
        if (parent) parent.classList.add('stg-about-logo--offline')
      }
      devAvatar.addEventListener('error', handleError)
      if (devAvatar.complete && devAvatar.naturalWidth === 0) handleError()
    }
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

  // ── Icons ─────────────────────────────────────────────────

  private iconSun(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
  }

  private iconSunSmall(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
  }

  private iconMoon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
  }

  private iconVolume(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>`
  }

  private iconInfo(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
  }

  private iconDatabase(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`
  }

  private iconGitHub(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"/></svg>`
  }

  private iconUser(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  }

  private iconUserFallback(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  }
}
