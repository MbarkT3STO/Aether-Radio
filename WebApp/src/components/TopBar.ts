import { BaseComponent } from './base/BaseComponent'
import { BridgeService } from '../services/BridgeService'
import { EventBus } from '../store/EventBus'
import { AboutModal } from './AboutModal'
import { LOGO_URL } from '../utils/assets'
import type { AccentColor, Theme } from '../domain/entities/AppSettings'

const DOWNLOAD_URL = 'https://aether-radio.netlify.app/#download'

const SUN_ICON = `<svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`

const MOON_ICON = `<svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`

const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`

/**
 * Palette used by the accent picker. Kept in sync with SettingsView's list
 * and with the design tokens in accents.css. The `light` / `dark` values
 * drive the little swatch dots in the dropdown — CSS tokens handle the
 * actual accent color switch.
 */
const ACCENTS: Array<{ id: AccentColor; label: string; light: string; dark: string }> = [
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

export class TopBar extends BaseComponent {
  private bridge = BridgeService.getInstance()
  private eventBus = EventBus.getInstance()

  private currentTheme: Theme = 'dark'
  private currentAccent: AccentColor = 'blue'
  private accentOpen = false
  private scrollListener: ((e: Event) => void) | null = null
  private outsideClickHandler: ((e: Event) => void) | null = null

  render(): string {
    return `
      <header class="app-topbar" id="app-topbar" role="banner">
        <button type="button"
                class="mobile-menu-btn"
                id="mobile-menu-btn"
                aria-label="Open navigation menu"
                title="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <button class="app-topbar-brand" id="topbar-brand" aria-label="About Aether Radio">
          <img class="app-topbar-brand-mark" src="${LOGO_URL}" alt="" width="30" height="30">
          <span class="app-topbar-brand-text">
            <span class="app-topbar-brand-name">Aether Radio</span>
            <span class="app-topbar-brand-tag">World Radio</span>
          </span>
        </button>

        <div class="app-topbar-spacer"></div>

        <div class="app-topbar-actions">
          <div class="app-accent" id="app-accent">
            <button type="button"
                    class="app-accent-btn"
                    id="accent-btn"
                    aria-haspopup="true"
                    aria-expanded="false"
                    aria-label="Change accent color"
                    title="Change accent color">
              <span class="app-accent-swatch" aria-hidden="true"></span>
            </button>
            <div class="app-accent-menu" id="accent-menu" role="menu" hidden>
              ${ACCENTS.map(a => `
                <button type="button"
                        role="menuitem"
                        data-accent="${a.id}"
                        style="--sw:${this.currentTheme === 'dark' ? a.dark : a.light}">
                  <span class="app-accent-dot" aria-hidden="true"></span>
                  ${a.label}
                </button>
              `).join('')}
            </div>
          </div>

          <button type="button"
                  class="app-topbar-icon-btn app-topbar-theme"
                  id="theme-toggle"
                  aria-label="Toggle theme"
                  title="Toggle theme">
            ${SUN_ICON}${MOON_ICON}
          </button>

          <a class="app-topbar-cta"
             href="${DOWNLOAD_URL}"
             target="_blank"
             rel="noopener noreferrer"
             title="Download the desktop or Android app">
            ${DOWNLOAD_ICON}
            <span>Download</span>
          </a>
        </div>
      </header>
    `
  }

  protected async afterMount(): Promise<void> {
    // Load current theme + accent from settings so the UI reflects them
    const settingsResult = await this.bridge.settings.get()
    if (settingsResult.success) {
      this.currentTheme = settingsResult.data.theme
      this.currentAccent = settingsResult.data.accentColor ?? 'blue'
      this.syncCurrentAccentState()
    }

    this.attachListeners()
    this.attachScrollListener()
  }

  protected beforeUnmount(): void {
    if (this.scrollListener) {
      const contentEl = document.querySelector<HTMLElement>('.app-content')
      contentEl?.removeEventListener('scroll', this.scrollListener)
      this.scrollListener = null
    }
    this.removeOutsideClickHandler()
  }

  // ── Listeners ──────────────────────────────────────────────────────────

  private attachListeners(): void {
    const brandBtn = this.querySelector('#topbar-brand')
    if (brandBtn) this.on(brandBtn, 'click', () => AboutModal.show())

    const themeBtn = this.querySelector('#theme-toggle')
    if (themeBtn) this.on(themeBtn, 'click', () => this.toggleTheme())

    const accentBtn = this.querySelector('#accent-btn')
    if (accentBtn) this.on(accentBtn, 'click', (e) => {
      e.stopPropagation()
      this.toggleAccentMenu()
    })

    // Mobile hamburger menu
    const menuBtn = this.querySelector('#mobile-menu-btn')
    if (menuBtn) this.on(menuBtn, 'click', () => this.toggleMobileSidebar())

    // Accent menu items
    this.querySelectorAll<HTMLElement>('.app-accent-menu button[data-accent]').forEach(btn => {
      this.on(btn, 'click', (e) => {
        e.stopPropagation()
        const id = btn.getAttribute('data-accent') as AccentColor | null
        if (id) this.pickAccent(id)
      })
    })
  }

  /**
   * Watch `.app-content` for scroll and toggle the "is-scrolled" class on
   * the top bar. We listen on the content element because that's the
   * actual scroller — the top bar is position:sticky within its flex
   * parent, not within window scroll.
   */
  private attachScrollListener(): void {
    const contentEl = document.querySelector<HTMLElement>('.app-content')
    const bar = this.querySelector<HTMLElement>('#app-topbar')
    if (!contentEl || !bar) return

    let ticking = false
    const onScroll = (): void => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        bar.classList.toggle('is-scrolled', contentEl.scrollTop > 4)
        ticking = false
      })
    }
    this.scrollListener = onScroll
    contentEl.addEventListener('scroll', onScroll, { passive: true })
    // Initial state
    onScroll()
  }

  // ── Theme ──────────────────────────────────────────────────────────────

  private async toggleTheme(): Promise<void> {
    const next: Theme = this.currentTheme === 'dark' ? 'light' : 'dark'
    this.currentTheme = next
    document.documentElement.setAttribute('data-theme', next)
    this.eventBus.emit('theme:changed', { theme: next })
    await this.bridge.settings.update({ theme: next })
    // Rebuild accent swatches so dark/light shades match the new theme
    this.refreshAccentSwatches()
  }

  // ── Accent picker ──────────────────────────────────────────────────────

  private toggleAccentMenu(): void {
    this.accentOpen = !this.accentOpen
    const menu = this.querySelector<HTMLElement>('#accent-menu')
    const btn = this.querySelector<HTMLElement>('#accent-btn')
    if (!menu || !btn) return

    menu.hidden = !this.accentOpen
    btn.setAttribute('aria-expanded', String(this.accentOpen))

    // Outside click closes
    this.removeOutsideClickHandler()
    if (this.accentOpen) {
      this.outsideClickHandler = (e: Event): void => {
        const t = e.target as Node
        if (!this.element?.contains(t)) this.toggleAccentMenu()
      }
      // Defer to avoid the same click closing immediately
      setTimeout(() => {
        if (this.outsideClickHandler) document.addEventListener('click', this.outsideClickHandler)
      }, 0)
    }
  }

  private async pickAccent(accent: AccentColor): Promise<void> {
    if (accent === this.currentAccent) {
      this.toggleAccentMenu()
      return
    }
    this.currentAccent = accent
    document.documentElement.setAttribute('data-accent', accent)
    this.syncCurrentAccentState()
    this.toggleAccentMenu()
    await this.bridge.settings.update({ accentColor: accent })
  }

  private syncCurrentAccentState(): void {
    this.querySelectorAll<HTMLElement>('.app-accent-menu button[data-accent]').forEach(btn => {
      btn.classList.toggle('is-current', btn.getAttribute('data-accent') === this.currentAccent)
    })
  }

  private refreshAccentSwatches(): void {
    // Update the little dots in the dropdown to reflect the new theme's
    // accent shades. We keep the DOM order intact and only rewrite colors.
    this.querySelectorAll<HTMLElement>('.app-accent-menu button[data-accent]').forEach(btn => {
      const id = btn.getAttribute('data-accent') as AccentColor | null
      if (!id) return
      const accent = ACCENTS.find(a => a.id === id)
      if (!accent) return
      btn.style.setProperty('--sw', this.currentTheme === 'dark' ? accent.dark : accent.light)
    })
  }

  private removeOutsideClickHandler(): void {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler)
      this.outsideClickHandler = null
    }
  }

  // ── Mobile sidebar drawer ──────────────────────────────────────────────

  private toggleMobileSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>('.app-sidebar')
    if (!sidebar) return

    const isOpen = sidebar.classList.contains('mobile-open')

    if (isOpen) {
      this.closeMobileSidebar()
    } else {
      this.openMobileSidebar()
    }
  }

  private openMobileSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>('.app-sidebar')
    if (!sidebar) return

    sidebar.classList.add('mobile-open')

    // Force expanded state on the inner sidebar for proper touch targets
    const innerSidebar = sidebar.querySelector<HTMLElement>('.sidebar')
    if (innerSidebar && innerSidebar.classList.contains('collapsed')) {
      innerSidebar.classList.add('mobile-force-expanded')
      innerSidebar.classList.remove('collapsed')
    }

    // Create backdrop if it doesn't exist
    // IMPORTANT: Append inside #app (not body) so the backdrop shares the
    // sidebar's stacking context. Otherwise #app's z-index:1 would trap
    // the sidebar below a body-level backdrop, blocking all clicks.
    const appEl = document.getElementById('app')
    let backdrop = document.querySelector<HTMLElement>('.mobile-sidebar-backdrop')
    if (!backdrop) {
      backdrop = document.createElement('div')
      backdrop.className = 'mobile-sidebar-backdrop'
      if (appEl) appEl.appendChild(backdrop)
      else document.body.appendChild(backdrop)
    }

    // Show backdrop with a slight delay for animation
    requestAnimationFrame(() => {
      backdrop!.classList.add('visible')
    })

    // Close on backdrop tap
    backdrop.addEventListener('click', () => this.closeMobileSidebar(), { once: true })
  }

  private closeMobileSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>('.app-sidebar')
    const backdrop = document.querySelector<HTMLElement>('.mobile-sidebar-backdrop')

    if (sidebar) {
      sidebar.classList.remove('mobile-open')

      // Restore collapsed state if it was forced expanded
      const innerSidebar = sidebar.querySelector<HTMLElement>('.sidebar')
      if (innerSidebar && innerSidebar.classList.contains('mobile-force-expanded')) {
        innerSidebar.classList.remove('mobile-force-expanded')
        innerSidebar.classList.add('collapsed')
      }
    }

    if (backdrop) backdrop.classList.remove('visible')
  }
}
