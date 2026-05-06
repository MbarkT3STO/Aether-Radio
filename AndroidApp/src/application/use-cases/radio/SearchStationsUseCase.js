import { ok, err, appError } from '../../Result';
export class SearchStationsUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute(query, pagination) {
        try {
            const stations = await this.stationRepo.search(query, pagination);
            return ok(stations);
        }
        catch (e) {
            return err(appError('SEARCH_FAILED', 'Failed to search stations', e));
        }
    }
}
