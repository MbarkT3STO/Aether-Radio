import { ok, err, appError } from '../../Result';
export class RemoveCustomStationUseCase {
    constructor(customStationsRepo) {
        Object.defineProperty(this, "customStationsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: customStationsRepo
        });
    }
    async execute(stationId) {
        try {
            if (!stationId) {
                return err(appError('VALIDATION_ERROR', 'Station ID is required'));
            }
            await this.customStationsRepo.remove(stationId);
            return ok(undefined);
        }
        catch (error) {
            return err(appError('REMOVE_CUSTOM_STATION_FAILED', 'Failed to remove custom station', error));
        }
    }
}
