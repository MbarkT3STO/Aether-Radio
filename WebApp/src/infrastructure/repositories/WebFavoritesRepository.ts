import type { IFavoritesRepository } from '../../domain/repositories/IFavoritesRepository'
import type { Favorite } from '../../domain/entities/Favorite'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:favorites'

export class WebFavoritesRepository implements IFavoritesRepository {
  async getAll(): Promise<Favorite[]> {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as Favorite[]) : []
    } catch {
      return []
    }
  }

  async add(station: RadioStation): Promise<Favorite> {
    const favorites = await this.getAll()
    const existing = favorites.find(f => f.station.id === station.id)
    if (existing) return existing

    const favorite: Favorite = {
      station,
      addedAt: new Date().toISOString(),
    }
    favorites.unshift(favorite)
    localStorage.setItem(KEY, JSON.stringify(favorites))
    return favorite
  }

  async remove(stationId: string): Promise<void> {
    const favorites = await this.getAll()
    const filtered = favorites.filter(f => f.station.id !== stationId)
    localStorage.setItem(KEY, JSON.stringify(filtered))
  }

  async isFavorite(stationId: string): Promise<boolean> {
    const favorites = await this.getAll()
    return favorites.some(f => f.station.id === stationId)
  }
}
