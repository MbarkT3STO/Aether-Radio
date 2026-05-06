import { ok, err, appError } from '../../Result';
export class GetSettingsUseCase {
    constructor(settingsRepo) {
        Object.defineProperty(this, "settingsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: settingsRepo
        });
    }
    async execute() {
        try {
            const settings = await this.settingsRepo.get();
            return ok(settings);
        }
        catch (e) {
            return err(appError('GET_SETTINGS_FAILED', 'Failed to get settings', e));
        }
    }
}
