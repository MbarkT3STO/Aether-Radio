import { EventBus } from '../store/EventBus'

export type RouteHandler = () => void

export class Router {
  private static instance: Router
  private eventBus = EventBus.getInstance()
  private routes: Map<string, RouteHandler> = new Map()
  private currentRoute = ''

  private constructor() {
    window.addEventListener('hashchange', () => this.handleRouteChange())
  }

  static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router()
    }
    return Router.instance
  }

  register(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler)
  }

  /** Call once after all routes are registered to trigger the initial render. */
  start(): void {
    this.handleRouteChange()
  }

  navigate(path: string): void {
    // Don't trigger a hashchange if we're already on this route — it
    // would cause a needless view unmount + remount, including dropping
    // scroll position and re-fetching data.
    const currentHash = window.location.hash.slice(1) || '/'
    if (currentHash === path) return
    window.location.hash = path
  }

  private handleRouteChange(): void {
    const fullHash = window.location.hash.slice(1) || '/'
    const basePath = fullHash.split('?')[0] || '/'
    this.currentRoute = fullHash

    const handler = this.routes.get(basePath)
    if (handler) {
      handler()
      this.eventBus.emit('route:changed', { route: fullHash })
    } else {
      // Unknown route — go home
      this.navigate('/')
    }
  }

  getCurrentRoute(): string {
    return this.currentRoute
  }
}
