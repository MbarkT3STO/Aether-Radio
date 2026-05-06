import { EventBus } from '../store/EventBus';
export class Router {
    constructor() {
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "routes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "currentRoute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ''
        });
        window.addEventListener('hashchange', () => this.handleRouteChange());
    }
    static getInstance() {
        if (!Router.instance) {
            Router.instance = new Router();
        }
        return Router.instance;
    }
    register(path, handler) {
        this.routes.set(path, handler);
    }
    /** Call once after all routes are registered to trigger the initial render. */
    start() {
        this.handleRouteChange();
    }
    navigate(path) {
        window.location.hash = path;
    }
    handleRouteChange() {
        const fullHash = window.location.hash.slice(1) || '/';
        const basePath = fullHash.split('?')[0] || '/';
        this.currentRoute = fullHash;
        const handler = this.routes.get(basePath);
        if (handler) {
            handler();
            this.eventBus.emit('route:changed', { route: fullHash });
        }
        else {
            // Unknown route — go home
            this.navigate('/');
        }
    }
    getCurrentRoute() {
        return this.currentRoute;
    }
}
