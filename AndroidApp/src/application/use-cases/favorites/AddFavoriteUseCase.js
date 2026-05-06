import { ok, err, appError } from '../../Result';
export class AddFavoriteUseCase {
    constructor(favoritesRepo) {
        Object.defineProperty(this, "favoritesRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: favoritesRepo
        });
    }
    async execute(station) {
        try {
            const favorite = await this.favoritesRepo.add(station);
            return ok(favorite);
        }
        catch (e) {
            return err(appError('ADD_FAVORITE_FAILED', 'Failed to add favorite', e));
        }
    }
}
