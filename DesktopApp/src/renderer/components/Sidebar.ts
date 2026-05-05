import { BaseComponent } from './base/BaseComponent'
import { Router } from '../router/Router'
import { EventBus } from '../store/EventBus'
import { AboutModal } from './AboutModal'

interface NavItem { route: string; label: string; icon: string }

const NAV_ITEMS: NavItem[] = [
  {
    route: '/',
    label: 'Home',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
  },
  {
    route: '/featured',
    label: 'Featured',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
  },
  {
    route: '/explore',
    label: 'Explore',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
  },
  {
    route: '/search',
    label: 'Search',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`
  },
  {
    route: '/favorites',
    label: 'Favorites',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  },
  {
    route: '/custom',
    label: 'My Stations',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`
  },
  {
    route: '/history',
    label: 'History',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`
  },
  {
    route: '/settings',
    label: 'Settings',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`
  }
]

// Chevron left — points LEFT = "collapse". CSS rotates it 180° when collapsed so it points RIGHT = "expand"
const CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`

export class Sidebar extends BaseComponent {
  private router       = Router.getInstance()
  private eventBus     = EventBus.getInstance()
  private currentRoute = '/'
  private collapsed    = false

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('route:changed', ({ route }) => {
      this.currentRoute = route.split('?')[0] || '/'
      this.updateActiveState()
    })
    this.collapsed = localStorage.getItem('sidebar-collapsed') === 'true'
  }

  render(): string {
    return `
      <div class="sidebar${this.collapsed ? ' collapsed' : ''}">

        <!-- Logo -->
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon sidebar-logo-icon--clickable" id="sidebar-logo-btn" title="About Aether Radio">
              <img src="./assets/logo.png" alt="Aether Radio" class="sidebar-logo-img">
            </div>
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-name">Aether Radio</span>
              <span class="sidebar-logo-tagline">World Radio</span>
            </div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <div class="sidebar-nav-section-label">Menu</div>
          ${NAV_ITEMS.map(item => `
            <div class="sidebar-nav-item" data-route="${item.route}" data-tooltip="${item.label}">
              <span class="sidebar-nav-icon">${item.icon}</span>
              <span class="sidebar-nav-label">${item.label}</span>
            </div>
          `).join('')}
        </nav>

        <!-- Collapse toggle — icon only, no text -->
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn"
          title="${this.collapsed ? 'Expand' : 'Collapse'}">
          ${CHEVRON}
        </button>

        <!-- Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-divider"></div>
          <div class="sidebar-version">
            <span class="sidebar-version-text">Aether Radio</span>
            <span class="sidebar-version-badge">v1</span>
          </div>
        </div>

      </div>
    `
  }

  protected afterMount(): void {
    // Logo click → About modal
    const logoBtn = this.querySelector('#sidebar-logo-btn')
    if (logoBtn) this.on(logoBtn, 'click', () => AboutModal.show())

    // Nav item clicks
    this.querySelectorAll('.sidebar-nav-item').forEach(item => {
      this.on(item, 'click', () => {
        const route = item.getAttribute('data-route')
        if (route) this.router.navigate(route)
      })

      // Set --tooltip-y so the fixed-position tooltip aligns with the item
      this.on(item, 'mouseenter', () => {
        const rect = (item as HTMLElement).getBoundingClientRect()
        const midY = rect.top + rect.height / 2;
        (item as HTMLElement).style.setProperty('--tooltip-y', `${midY}px`)
      })
    })

    // Collapse button click
    const btn = this.querySelector('#sidebar-collapse-btn')
    if (btn) this.on(btn, 'click', () => this.toggleCollapse())

    this.updateActiveState()
    // Always sync both inner and outer on mount
    this.applyCollapseState()
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed
    localStorage.setItem('sidebar-collapsed', String(this.collapsed))
    this.applyCollapseState()
  }

  /**
   * Single method that applies the current this.collapsed state
   * to BOTH the inner .sidebar div AND the outer .app-sidebar wrapper.
   * Called on mount and on every toggle.
   */
  private applyCollapseState(): void {
    // this.element IS the inner .sidebar div (it's the root element of render())
    if (this.element) {
      this.element.classList.toggle('collapsed', this.collapsed)
    }

    // Outer <aside class="app-sidebar">
    const appSidebar = document.querySelector('.app-sidebar')
    if (appSidebar) appSidebar.classList.toggle('sidebar-collapsed', this.collapsed)

    // Update button title
    const btn = this.querySelector('#sidebar-collapse-btn')
    if (btn) btn.setAttribute('title', this.collapsed ? 'Expand' : 'Collapse')
  }

  private syncOuterWrapper(): void {
    // Kept for backward compat — delegates to applyCollapseState
    this.applyCollapseState()
  }

  private updateActiveState(): void {
    this.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-route') === this.currentRoute)
    })
  }
}
