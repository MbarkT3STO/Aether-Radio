import type { IFavoritesRepository } from '../../../domain/repositories/IFavoritesRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import type { Favorite } from '../../../domain/entities/Favorite'
import { type Result, ok, err, appError } from '../../Result'

export class AddFavoriteUseCase {
  constructor(private readonly favoritesRepo: IFavoritesRepository) {}

  async execute(station: RadioStation): Promise<Result<Favorite>> {
    try {
      const favorite = await this.favoritesRepo.add(station)
      return ok(favorite)
    } catch (e) {
      return err(appError('ADD_FAVORITE_FAILED', 'Failed to add favorite', e))
    }
  }
}
