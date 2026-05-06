import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient';
export class MultiSourceStationRepository {
    constructor(customStationsRepo, apiBaseUrls) {
        Object.defineProperty(this, "customStationsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: customStationsRepo
        });
        Object.defineProperty(this, "apiClients", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Index of the currently healthy mirror — starts at 0 (highest priority)
        Object.defineProperty(this, "activeClientIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.apiClients = apiBaseUrls.map(url => new RadioBrowserApiClient(url));
    }
    // ── Primary-with-failover helper ──────────────────────────────────────────
    /**
     * Calls `fn` on the active client. If it fails, tries the next mirror in
     * order and remembers the new active index for subsequent calls.
     */
    async withFailover(fn) {
        const total = this.apiClients.length;
        for (let attempt = 0; attempt < total; attempt++) {
            const idx = (this.activeClientIndex + attempt) % total;
            const client = this.apiClients[idx];
            if (!client)
                continue;
            try {
                const result = await fn(client);
                // Promote this mirror as the active one if it succeeded after a failover
                if (attempt > 0)
                    this.activeClientIndex = idx;
                return result;
            }
            catch (err) {
                console.warn(`API mirror ${idx} failed, trying next…`, err);
            }
        }
        throw new Error('All API mirrors failed');
    }
    // ── IStationRepository ────────────────────────────────────────────────────
    async search(query, pagination) {
        const [customResults, apiResults] = await Promise.all([
            this.searchCustomStations(query),
            this.withFailover(c => c.search(query, pagination))
        ]);
        return this.mergeResults([customResults, apiResults], pagination.limit);
    }
    async getTopVoted(count) {
        return this.withFailover(c => c.getTopVoted(count));
    }
    async getTopClicked(count) {
        return this.withFailover(c => c.getTopClicked(count));
    }
    async getByCountry(countryCode, pagination) {
        const [customResults, apiResults] = await Promise.all([
            this.getCustomStationsByCountry(countryCode),
            this.withFailover(c => c.getByCountry(countryCode, pagination))
        ]);
        return this.mergeResults([customResults, apiResults], pagination.limit);
    }
    async getByGenre(tag, pagination) {
        const [customResults, apiResults] = await Promise.all([
            this.getCustomStationsByGenre(tag),
            this.withFailover(c => c.getByTag(tag, pagination))
        ]);
        return this.mergeResults([customResults, apiResults], pagination.limit);
    }
    async getById(id) {
        // Check custom stations first (no network call)
        const customStations = await this.customStationsRepo.getAll();
        const customStation = customStations.find(s => s.id === id);
        if (customStation) {
            return this.customStationsRepo.toRadioStation(customStation);
        }
        try {
            const results = await this.withFailover(c => c.search({ name: id }, { limit: 1, offset: 0 }));
            return results[0] ?? null;
        }
        catch {
            return null;
        }
    }
    async getCountries() {
        const [apiCountries, customStations] = await Promise.all([
            this.withFailover(c => c.getCountries()),
            this.customStationsRepo.getAll()
        ]);
        const customCountryCounts = new Map();
        customStations.forEach(station => {
            customCountryCounts.set(station.countryCode, (customCountryCounts.get(station.countryCode) ?? 0) + 1);
        });
        const mergedCountries = apiCountries.map(country => ({
            ...country,
            stationCount: country.stationCount + (customCountryCounts.get(country.code) ?? 0)
        }));
        // Add countries that only exist in custom stations
        customCountryCounts.forEach((count, code) => {
            if (!mergedCountries.find(c => c.code === code)) {
                const customStation = customStations.find(s => s.countryCode === code);
                if (customStation) {
                    mergedCountries.push({ name: customStation.country, code, stationCount: count });
                }
            }
        });
        return mergedCountries.sort((a, b) => b.stationCount - a.stationCount);
    }
    async getGenres() {
        const [apiGenres, customStations] = await Promise.all([
            this.withFailover(c => c.getTags()),
            this.customStationsRepo.getAll()
        ]);
        const customGenreCounts = new Map();
        customStations.forEach(station => {
            if (station.genre) {
                customGenreCounts.set(station.genre, (customGenreCounts.get(station.genre) ?? 0) + 1);
            }
        });
        const mergedGenres = apiGenres.map(genre => ({
            ...genre,
            stationCount: genre.stationCount + (customGenreCounts.get(genre.name) ?? 0)
        }));
        customGenreCounts.forEach((count, name) => {
            if (!mergedGenres.find(g => g.name === name)) {
                mergedGenres.push({ name, stationCount: count });
            }
        });
        return mergedGenres.sort((a, b) => b.stationCount - a.stationCount).slice(0, 100);
    }
    async reportClick(stationId) {
        // Report only to the active mirror — fire-and-forget
        const client = this.apiClients[this.activeClientIndex];
        if (client)
            client.reportClick(stationId);
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    async searchCustomStations(query) {
        const customStations = await this.customStationsRepo.getAll();
        let filtered = customStations;
        if (query.name) {
            const searchTerm = query.name.toLowerCase();
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm) ||
                s.description?.toLowerCase().includes(searchTerm));
        }
        if (query.countryCode)
            filtered = filtered.filter(s => s.countryCode === query.countryCode);
        if (query.country) {
            filtered = filtered.filter(s => s.country.toLowerCase().includes(query.country.toLowerCase()));
        }
        return filtered.map(s => this.customStationsRepo.toRadioStation(s));
    }
    async getCustomStationsByCountry(countryCode) {
        const customStations = await this.customStationsRepo.getAll();
        return customStations
            .filter(s => s.countryCode === countryCode)
            .map(s => this.customStationsRepo.toRadioStation(s));
    }
    async getCustomStationsByGenre(genre) {
        const customStations = await this.customStationsRepo.getAll();
        return customStations
            .filter(s => s.genre?.toLowerCase() === genre.toLowerCase())
            .map(s => this.customStationsRepo.toRadioStation(s));
    }
    mergeResults(groups, limit) {
        const seenIds = new Set();
        const merged = [];
        for (const group of groups) {
            for (const station of group) {
                if (!seenIds.has(station.id)) {
                    seenIds.add(station.id);
                    merged.push(station);
                }
            }
        }
        return merged.slice(0, limit);
    }
}
