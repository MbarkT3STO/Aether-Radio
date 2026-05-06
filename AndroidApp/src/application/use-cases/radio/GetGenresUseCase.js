import { ok, err, appError } from '../../Result';
export class GetGenresUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute() {
        try {
            const genres = await this.stationRepo.getGenres();
            return ok(genres);
        }
        catch (e) {
            return err(appError('GET_GENRES_FAILED', 'Failed to get genres', e));
        }
    }
}
