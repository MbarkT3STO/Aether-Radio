import { ok, err, appError } from '../../Result';
export class GetStationByIdUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute(id) {
        try {
            const station = await this.stationRepo.getById(id);
            return ok(station);
        }
        catch (e) {
            return err(appError('GET_STATION_FAILED', 'Failed to get station by ID', e));
        }
    }
}
