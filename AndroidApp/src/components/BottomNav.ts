import { BaseComponent } from './base/BaseComponent'
import { Router } from '../router/Router'
import { EventBus } from '../store/EventBus'

interface NavItem { route: string; label: string; icon: string }

// Mobile bottom nav — 5 primary destinations (iOS convention: max 5 tabs).
// Secondary destinations (History, Custom Stations, Featured) remain
// reachable via Home cards/Settings/search chips. Settings is kept as the
// 5th tab to preserve access to the accent picker and preferences.
const NAV_ITEMS: NavItem[] = [
  {
    route: '/',
    label: 'Home',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
  },
  {
    route: '/search',
    label: 'Search',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.35-4.35"/></svg>`
  },
  {
    route: '/explore',
    label: 'Explore',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>`
  },
  {
    route: '/favorites',
    label: 'Favorites',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  },
  {
    route: '/settings',
    label: 'Settings',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`
  }
]

// Routes that are shown in-app via Home shortcuts / Settings — we still
// highlight the closest primary tab so the user isn't disoriented.
const SECONDARY_ROUTE_MAP: Record<string, string> = {
  '/history':  '/',
  '/custom':   '/',
  '/featured': '/',
}

export class BottomNav extends BaseComponent {
  private router   = Router.getInstance()
  private eventBus = EventBus.getInstance()
  private currentRoute = '/'

  constructor(props: Record<string, never>) {
    super(props)
    this.eventBus.on('route:changed', ({ route }) => {
      const base = route.split('?')[0] || '/'
      this.currentRoute = SECONDARY_ROUTE_MAP[base] ?? base
      this.updateActiveState()
    })
  }

  render(): string {
    return `
      <nav class="bottom-nav" role="tablist" aria-label="Primary">
        ${NAV_ITEMS.map(item => `
          <button class="bottom-nav-item${this.currentRoute === item.route ? ' active' : ''}"
            data-route="${item.route}" aria-label="${item.label}"
            role="tab" aria-selected="${this.currentRoute === item.route}">
            <span class="bottom-nav-icon">${item.icon}</span>
            <span class="bottom-nav-label">${item.label}</span>
          </button>
        `).join('')}
      </nav>
    `
  }

  protected afterMount(): void {
    this.querySelectorAll('.bottom-nav-item').forEach(item => {
      this.on(item, 'click', () => {
        const route = item.getAttribute('data-route')
        if (route) this.router.navigate(route)
      })
    })
    this.updateActiveState()
  }

  private updateActiveState(): void {
    this.querySelectorAll('.bottom-nav-item').forEach(item => {
      const isActive = item.getAttribute('data-route') === this.currentRoute
      item.classList.toggle('active', isActive)
      item.setAttribute('aria-selected', String(isActive))
    })
  }
}
