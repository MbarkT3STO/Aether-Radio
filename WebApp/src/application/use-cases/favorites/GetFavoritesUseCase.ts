import type { IFavoritesRepository } from '../../../domain/repositories/IFavoritesRepository'
import type { Favorite } from '../../../domain/entities/Favorite'
import { type Result, ok, err, appError } from '../../Result'

export class GetFavoritesUseCase {
  constructor(private readonly favoritesRepo: IFavoritesRepository) {}

  async execute(): Promise<Result<Favorite[]>> {
    try {
      const favorites = await this.favoritesRepo.getAll()
      return ok(favorites)
    } catch (e) {
      return err(appError('GET_FAVORITES_FAILED', 'Failed to get favorites', e))
    }
  }
}
