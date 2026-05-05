import type { IFavoritesRepository } from '../../domain/repositories/IFavoritesRepository'
import type { Favorite } from '../../domain/entities/Favorite'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type Store from 'electron-store'

interface StoreSchema {
  favorites: Favorite[]
}

export class ElectronFavoritesRepository implements IFavoritesRepository {
  constructor(private readonly store: Store<StoreSchema>) {}

  async getAll(): Promise<Favorite[]> {
    return this.store.get('favorites', [])
  }

  async add(station: RadioStation): Promise<Favorite> {
    const favorites = await this.getAll()
    
    // Check if already exists
    const exists = favorites.some(f => f.station.id === station.id)
    if (exists) {
      const existing = favorites.find(f => f.station.id === station.id)
      return existing!
    }

    const favorite: Favorite = {
      station,
      addedAt: new Date().toISOString()
    }

    favorites.unshift(favorite)
    this.store.set('favorites', favorites)
    return favorite
  }

  async remove(stationId: string): Promise<void> {
    const favorites = await this.getAll()
    const filtered = favorites.filter(f => f.station.id !== stationId)
    this.store.set('favorites', filtered)
  }

  async isFavorite(stationId: string): Promise<boolean> {
    const favorites = await this.getAll()
    return favorites.some(f => f.station.id === stationId)
  }
}
