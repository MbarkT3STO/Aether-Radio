import { ok, err, appError } from '../../Result';
export class GetCustomStationsUseCase {
    constructor(customStationsRepo) {
        Object.defineProperty(this, "customStationsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: customStationsRepo
        });
    }
    async execute() {
        try {
            const stations = await this.customStationsRepo.getAll();
            return ok(stations);
        }
        catch (error) {
            return err(appError('GET_CUSTOM_STATIONS_FAILED', 'Failed to get custom stations', error));
        }
    }
}
