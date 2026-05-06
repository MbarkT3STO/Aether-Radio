import { ok, err, appError } from '../../Result';
export class GetStationsByGenreUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute(tag, pagination) {
        try {
            const stations = await this.stationRepo.getByGenre(tag, pagination);
            return ok(stations);
        }
        catch (e) {
            return err(appError('GENRE_STATIONS_FAILED', 'Failed to get stations by genre', e));
        }
    }
}
