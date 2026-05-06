import type { Favorite } from '../entities/Favorite'
import type { RadioStation } from '../entities/RadioStation'

export interface IFavoritesRepository {
  getAll(): Promise<Favorite[]>
  add(station: RadioStation): Promise<Favorite>
  remove(stationId: string): Promise<void>
  isFavorite(stationId: string): Promise<boolean>
}
