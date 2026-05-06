import { Preferences } from '@capacitor/preferences';
const KEY = 'customStations';
export class CapacitorCustomStationsRepository {
    async getAll() {
        const { value } = await Preferences.get({ key: KEY });
        return value ? JSON.parse(value) : [];
    }
    async add(station) {
        const stations = await this.getAll();
        if (stations.some(s => s.id === station.id))
            throw new Error('Station already exists');
        const newStation = { ...station, addedAt: new Date().toISOString(), source: 'custom' };
        stations.push(newStation);
        await Preferences.set({ key: KEY, value: JSON.stringify(stations) });
        return newStation;
    }
    async remove(stationId) {
        const stations = await this.getAll();
        await Preferences.set({ key: KEY, value: JSON.stringify(stations.filter(s => s.id !== stationId)) });
    }
    async update(stationId, updates) {
        const stations = await this.getAll();
        const idx = stations.findIndex(s => s.id === stationId);
        if (idx === -1)
            throw new Error('Station not found');
        stations[idx] = { ...stations[idx], ...updates };
        await Preferences.set({ key: KEY, value: JSON.stringify(stations) });
        return stations[idx];
    }
    toRadioStation(s) {
        return {
            id: s.id, name: s.name, url: s.url, urlResolved: s.url,
            homepage: '', favicon: s.favicon || '', country: s.country,
            countryCode: s.countryCode, state: '', language: '',
            tags: s.genre ? [s.genre] : [], codec: '', bitrate: 0,
            votes: 0, clickCount: 0, clickTrend: 0,
            lastCheckOk: true, lastChangeTime: s.addedAt, hls: false
        };
    }
}
