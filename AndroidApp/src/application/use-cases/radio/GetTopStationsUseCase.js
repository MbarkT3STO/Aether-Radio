import { ok, err, appError } from '../../Result';
export class GetTopStationsUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute(count = 50) {
        try {
            const stations = await this.stationRepo.getTopVoted(count);
            return ok(stations);
        }
        catch (e) {
            return err(appError('TOP_STATIONS_FAILED', 'Failed to get top stations', e));
        }
    }
}
