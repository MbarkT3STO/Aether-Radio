import { ok, err, appError } from '../../Result';
export class GetFavoritesUseCase {
    constructor(favoritesRepo) {
        Object.defineProperty(this, "favoritesRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: favoritesRepo
        });
    }
    async execute() {
        try {
            const favorites = await this.favoritesRepo.getAll();
            return ok(favorites);
        }
        catch (e) {
            return err(appError('GET_FAVORITES_FAILED', 'Failed to get favorites', e));
        }
    }
}
