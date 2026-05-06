import { BaseComponent } from './base/BaseComponent'
import { Router } from '../router/Router'
import { EventBus } from '../store/EventBus'

interface NavItem { route: string; label: string; icon: string }

const NAV_ITEMS: NavItem[] = [
  { route: '/', label: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { route: '/explore', label: 'Explore', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>` },
  { route: '/search', label: 'Search', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>` },
  { route: '/favorites', label: 'Favorites', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>` },
  { route: '/settings', label: 'Settings', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>` }
]

export class BottomNav extends BaseComponent {
  private router = Router.getInstance()
  private eventBus = EventBus.getInstance()
  private currentRoute = '/'
  private unsubscribeRoute: (() => void) | null = null

  constructor(props: Record<string, never>) {
    super(props)
    this.unsubscribeRoute = this.eventBus.on('route:changed', ({ route }) => {
      this.currentRoute = route.split('?')[0] || '/'
      this.updateActiveState()
    })
  }

  protected beforeUnmount(): void {
    this.unsubscribeRoute?.()
    this.unsubscribeRoute = null
  }

  render(): string {
    return `
      <nav class="bottom-nav">
        ${NAV_ITEMS.map(item => `
          <button class="bottom-nav-item" data-route="${item.route}">
            ${item.icon}
            <span>${item.label}</span>
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
      item.classList.toggle('active', item.getAttribute('data-route') === this.currentRoute)
    })
  }
}
