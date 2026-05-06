import type { Favorite } from '../../domain/entities/Favorite'
import { EventBus } from './EventBus'

export class FavoritesStore {
  private static instance: FavoritesStore
  private eventBus = EventBus.getInstance()

  private _favorites: Favorite[] = []

  private constructor() {}

  static getInstance(): FavoritesStore {
    if (!FavoritesStore.instance) {
      FavoritesStore.instance = new FavoritesStore()
    }
    return FavoritesStore.instance
  }

  get favorites(): Favorite[] {
    return this._favorites
  }

  setFavorites(favorites: Favorite[]): void {
    this._favorites = favorites
    this.eventBus.emit('favorites:changed', { favorites })
  }

  isFavorite(stationId: string): boolean {
    return this._favorites.some(f => f.station.id === stationId)
  }
}
