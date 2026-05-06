import { ok, err, appError } from '../../Result';
export class UpdateSettingsUseCase {
    constructor(settingsRepo) {
        Object.defineProperty(this, "settingsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: settingsRepo
        });
    }
    async execute(settings) {
        try {
            const updated = await this.settingsRepo.update(settings);
            return ok(updated);
        }
        catch (e) {
            return err(appError('UPDATE_SETTINGS_FAILED', 'Failed to update settings', e));
        }
    }
}
