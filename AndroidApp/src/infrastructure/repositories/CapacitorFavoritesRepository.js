import { Preferences } from '@capacitor/preferences';
const KEY = 'favorites';
export class CapacitorFavoritesRepository {
    async getAll() {
        const { value } = await Preferences.get({ key: KEY });
        return value ? JSON.parse(value) : [];
    }
    async add(station) {
        const favorites = await this.getAll();
        const exists = favorites.find(f => f.station.id === station.id);
        if (exists)
            return exists;
        const favorite = { station, addedAt: new Date().toISOString() };
        favorites.unshift(favorite);
        await Preferences.set({ key: KEY, value: JSON.stringify(favorites) });
        return favorite;
    }
    async remove(stationId) {
        const favorites = await this.getAll();
        const filtered = favorites.filter(f => f.station.id !== stationId);
        await Preferences.set({ key: KEY, value: JSON.stringify(filtered) });
    }
    async isFavorite(stationId) {
        const favorites = await this.getAll();
        return favorites.some(f => f.station.id === stationId);
    }
}
