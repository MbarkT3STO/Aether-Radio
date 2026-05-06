import type { IFavoritesRepository } from '../../../domain/repositories/IFavoritesRepository'
import { type Result, ok, err, appError } from '../../Result'

export class RemoveFavoriteUseCase {
  constructor(private readonly favoritesRepo: IFavoritesRepository) {}

  async execute(stationId: string): Promise<Result<void>> {
    try {
      await this.favoritesRepo.remove(stationId)
      return ok(undefined)
    } catch (e) {
      return err(appError('REMOVE_FAVORITE_FAILED', 'Failed to remove favorite', e))
    }
  }
}
