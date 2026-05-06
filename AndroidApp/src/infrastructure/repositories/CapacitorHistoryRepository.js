import { Preferences } from '@capacitor/preferences';
const KEY = 'history';
const MAX = 50;
export class CapacitorHistoryRepository {
    async getAll() {
        const { value } = await Preferences.get({ key: KEY });
        return value ? JSON.parse(value) : [];
    }
    async add(station) {
        const history = await this.getAll();
        const entry = { station, playedAt: new Date().toISOString() };
        const filtered = history.filter(h => h.station.id !== station.id);
        filtered.unshift(entry);
        const trimmed = filtered.slice(0, MAX);
        await Preferences.set({ key: KEY, value: JSON.stringify(trimmed) });
        return entry;
    }
    async clear() {
        await Preferences.set({ key: KEY, value: JSON.stringify([]) });
    }
}
