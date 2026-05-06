import { EventBus } from './EventBus';
export class FavoritesStore {
    constructor() {
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "_favorites", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    static getInstance() {
        if (!FavoritesStore.instance) {
            FavoritesStore.instance = new FavoritesStore();
        }
        return FavoritesStore.instance;
    }
    get favorites() {
        return this._favorites;
    }
    setFavorites(favorites) {
        this._favorites = favorites;
        this.eventBus.emit('favorites:changed', { favorites });
    }
    isFavorite(stationId) {
        return this._favorites.some(f => f.station.id === stationId);
    }
}
