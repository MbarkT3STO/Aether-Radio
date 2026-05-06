import { Preferences } from '@capacitor/preferences';
import { DEFAULT_SETTINGS } from '../../domain/entities/AppSettings';
const KEY = 'settings';
export class CapacitorSettingsRepository {
    async get() {
        const { value } = await Preferences.get({ key: KEY });
        return value ? { ...DEFAULT_SETTINGS, ...JSON.parse(value) } : DEFAULT_SETTINGS;
    }
    async update(settings) {
        const current = await this.get();
        const updated = { ...current, ...settings };
        await Preferences.set({ key: KEY, value: JSON.stringify(updated) });
        return updated;
    }
}
