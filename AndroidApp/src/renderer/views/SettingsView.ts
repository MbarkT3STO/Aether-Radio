import { BaseComponent } from '../components/base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { EventBus } from '../store/EventBus'
import { ConfirmModal } from '../components/ConfirmModal'
import type { AppSettings, Theme } from '../../domain/entities/AppSettings'

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

        <!-- Header -->
        <div class="view-header">
          <div class="view-header-row">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h1>Settings</h1>
          </div>
          <p class="view-subtitle">Customize your Aether Radio experience</p>
        </div>

        <!-- Content (filled after data loads) -->
        <div id="settings-content">
          <div class="loading-container">
            <div class="loading-spinner"></div>
          </div>
        </div>

      </div>
    `
  }

  private async renderContent(): Promise<void> {
    const content = this.querySelector('#settings-content')
    if (!content || !this.settings) return

    const s = this.settings

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
              <button class="stg-toggle-btn ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                ${this.iconMoon()} Dark
              </button>
              <button class="stg-toggle-btn ${s.theme === 'light' ? 'active' : ''}" data-theme="light">
                ${this.iconSunSmall()} Light
              </button>
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
          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Now Playing Notifications</div>
              <div class="stg-row-desc">Show OS notification when a station starts</div>
            </div>
            <button class="stg-switch ${s.showNowPlayingNotification ? 'stg-switch--on' : ''}"
              id="stg-notif-switch" role="switch"
              aria-checked="${s.showNowPlayingNotification}">
              <span class="stg-switch-thumb"></span>
            </button>
          </div>
        </div>

        <!-- ── Data ── -->
        <div class="stg-card">
          <div class="stg-card-header">
            <div class="stg-card-icon">${this.iconDatabase()}</div>
            <div>
              <div class="stg-card-title">Data</div>
              <div class="stg-card-sub">Import and export your data</div>
            </div>
          </div>
          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Favorites</div>
              <div class="stg-row-desc">Back up or restore your saved stations</div>
            </div>
            <div class="stg-btn-group">
              <button class="stg-action-btn" id="stg-export-favs">Export</button>
              <button class="stg-action-btn" id="stg-import-favs">Import</button>
            </div>
            <input type="file" id="stg-import-file" accept=".json" style="display:none">
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
              <div class="stg-card-sub">App information</div>
            </div>
          </div>
          <div class="stg-about">
            <div class="stg-about-logo">
              <img src="/assets/logo.png" alt="Aether Radio" class="stg-about-logo-img">
            </div>
            <div>
              <div class="stg-about-name">Aether Radio</div>
              <div class="stg-about-version">Version 1.1.0 · Radio Browser API</div>
            </div>
          </div>
          <div class="stg-divider"></div>
          <div class="stg-row">
            <div class="stg-row-info">
              <div class="stg-row-label">Data Source</div>
              <div class="stg-row-desc">Community-driven radio station database</div>
            </div>
            <span class="stg-data-source-link">radio-browser.info</span>
          </div>
        </div>

      </div>
    `

    this.attachListeners()
  }

  private attachListeners(): void {
    // Theme buttons
    this.querySelectorAll('.stg-toggle-btn[data-theme]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const theme = btn.getAttribute('data-theme') as Theme
        await this.applyUpdate({ theme })
        document.documentElement.setAttribute('data-theme', theme)
        this.eventBus.emit('theme:changed', { theme })
      })
    })

    // Buffer buttons
    this.querySelectorAll('.stg-toggle-btn[data-buffer]').forEach(btn => {
      this.on(btn, 'click', async () => {
        const bufferSize = btn.getAttribute('data-buffer') as 'low' | 'balanced' | 'high'
        await this.applyUpdate({ bufferSize })
        this.eventBus.emit('settings:buffer-changed', { bufferSize })
      })
    })

    // Notification toggle
    const notifSwitch = this.querySelector<HTMLElement>('#stg-notif-switch')
    if (notifSwitch) {
      this.on(notifSwitch, 'click', async () => {
        const newVal = !this.settings?.showNowPlayingNotification
        await this.applyUpdate({ showNowPlayingNotification: newVal })
        // Propagate to native layer
        this.eventBus.emit('settings:notifications-changed', { enabled: newVal })
      })
    }

    // Export favorites
    const exportBtn = this.querySelector<HTMLElement>('#stg-export-favs')
    if (exportBtn) {
      this.on(exportBtn, 'click', async () => {
        try {
          const result = await this.bridge.favorites.getAll()
          if (!result.success) { this.showToast('Could not load favorites', 'error'); return }
          const json = JSON.stringify(result.data, null, 2)
          const { Filesystem, Directory } = await import('@capacitor/filesystem')
          await Filesystem.writeFile({
            path: 'aether-favorites.json',
            data: json,
            directory: Directory.Cache,
          })
          const { Share } = await import('@capacitor/share')
          await Share.share({
            title: 'Aether Radio Favorites',
            text: 'My saved radio stations',
            files: ['aether-favorites.json'],
          })
        } catch {
          this.showToast('Export failed', 'error')
        }
      })
    }

    // Import favorites
    const importBtn = this.querySelector<HTMLElement>('#stg-import-favs')
    const importFile = this.querySelector<HTMLInputElement>('#stg-import-file')
    if (importBtn && importFile) {
      this.on(importBtn, 'click', () => importFile.click())
      this.on(importFile, 'change', async () => {
        const file = importFile.files?.[0]
        if (!file) return
        try {
          const text = await file.text()
          const stations = JSON.parse(text)
          if (!Array.isArray(stations)) throw new Error('Invalid format')
          for (const station of stations) {
            await this.bridge.favorites.add(station)
          }
          this.showToast(`Imported ${stations.length} stations`, 'success')
        } catch {
          this.showToast('Import failed — invalid file', 'error')
        }
        importFile.value = ''
      })
    }

    // Clear history
    const clearHistoryBtn = this.querySelector<HTMLElement>('#stg-clear-history')
    if (clearHistoryBtn) {
      this.on(clearHistoryBtn, 'click', async () => {
        const confirmed = await ConfirmModal.show({
          title: 'Clear History',
          message: 'All recently played stations will be removed. This cannot be undone.',
          confirmLabel: 'Clear All',
          cancelLabel: 'Cancel',
          danger: true,
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
          </svg>`
        })
        if (!confirmed) return
        const result = await this.bridge.history.clear()
        if (result.success) {
          this.showToast('Play history cleared', 'success')
        }
      })
    }
  }

  private async applyUpdate(update: Partial<AppSettings>): Promise<void> {
    const result = await this.bridge.settings.update(update)
    if (result.success) {
      this.settings = result.data
      await this.renderContent()
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const event = new CustomEvent('show-toast', { detail: { message, type } })
    window.dispatchEvent(event)
  }

  // ── Icons ─────────────────────────────────────────────────

  private iconSun(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
  }

  private iconSunSmall(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
  }

  private iconMoon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
  }

  private iconVolume(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
  }

  private iconInfo(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }

  private iconDatabase(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`
  }
}
