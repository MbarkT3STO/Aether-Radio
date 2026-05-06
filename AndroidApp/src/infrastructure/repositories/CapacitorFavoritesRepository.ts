import { Preferences } from '@capacitor/preferences'
import type { IFavoritesRepository } from '../../domain/repositories/IFavoritesRepository'
import type { Favorite } from '../../domain/entities/Favorite'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:favorites'

export class CapacitorFavoritesRepository implements IFavoritesRepository {
  async getAll(): Promise<Favorite[]> {
    const { value } = await Preferences.get({ key: KEY })
    if (!value) return []
    try {
      return JSON.parse(value) as Favorite[]
    } catch {
      return []
    }
  }

  async add(station: RadioStation): Promise<Favorite> {
    const favorites = await this.getAll()
    const exists = favorites.find(f => f.station.id === station.id)
    if (exists) return exists

    const favorite: Favorite = {
      station,
      addedAt: new Date().toISOString(),
    }
    favorites.unshift(favorite)
    await Preferences.set({ key: KEY, value: JSON.stringify(favorites) })
    return favorite
  }

  async remove(stationId: string): Promise<void> {
    const favorites = await this.getAll()
    const filtered = favorites.filter(f => f.station.id !== stationId)
    await Preferences.set({ key: KEY, value: JSON.stringify(filtered) })
  }

  async isFavorite(stationId: string): Promise<boolean> {
    const favorites = await this.getAll()
    return favorites.some(f => f.station.id === stationId)
  }
}
