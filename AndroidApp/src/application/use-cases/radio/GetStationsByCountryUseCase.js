import { ok, err, appError } from '../../Result';
export class GetStationsByCountryUseCase {
    constructor(stationRepo) {
        Object.defineProperty(this, "stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: stationRepo
        });
    }
    async execute(countryCode, pagination) {
        try {
            const stations = await this.stationRepo.getByCountry(countryCode, pagination);
            return ok(stations);
        }
        catch (e) {
            return err(appError('COUNTRY_STATIONS_FAILED', 'Failed to get stations by country', e));
        }
    }
}
