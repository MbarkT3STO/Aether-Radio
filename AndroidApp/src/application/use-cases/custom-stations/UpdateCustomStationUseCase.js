import { ok, err, appError } from '../../Result';
export class UpdateCustomStationUseCase {
    constructor(customStationsRepo) {
        Object.defineProperty(this, "customStationsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: customStationsRepo
        });
    }
    async execute(stationId, updates) {
        try {
            if (!stationId) {
                return err(appError('VALIDATION_ERROR', 'Station ID is required'));
            }
            // Don't allow changing id, addedAt, or source
            const { id, addedAt, source, ...allowedUpdates } = updates;
            const updated = await this.customStationsRepo.update(stationId, allowedUpdates);
            return ok(updated);
        }
        catch (error) {
            return err(appError('UPDATE_CUSTOM_STATION_FAILED', 'Failed to update custom station', error));
        }
    }
}
