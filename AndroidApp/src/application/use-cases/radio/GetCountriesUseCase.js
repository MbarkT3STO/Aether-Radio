import { ok, err, appError } from '../../Result';
export class GetCountriesUseCase {
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
            const countries = await this.stationRepo.getCountries();
            return ok(countries);
        }
        catch (e) {
            return err(appError('GET_COUNTRIES_FAILED', 'Failed to get countries', e));
        }
    }
}
