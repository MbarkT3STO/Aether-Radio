import { ok, err, appError } from '../../Result';
export class RemoveFavoriteUseCase {
    constructor(favoritesRepo) {
        Object.defineProperty(this, "favoritesRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: favoritesRepo
        });
    }
    async execute(stationId) {
        try {
            await this.favoritesRepo.remove(stationId);
            return ok(undefined);
        }
        catch (e) {
            return err(appError('REMOVE_FAVORITE_FAILED', 'Failed to remove favorite', e));
        }
    }
}
