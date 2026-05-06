/**
 * BridgeService — Android/Capacitor version.
 * Replaces the Electron IPC bridge. All data operations run directly
 * in the renderer via the Container (use cases + Capacitor Preferences).
 * No IPC, no preload, no native process boundary.
 */
import { Container } from '../../infrastructure/di/Container';
import { ok } from '../../application/Result';
export class BridgeService {
    constructor() {
        Object.defineProperty(this, "container", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Container.getInstance()
        });
    }
    static getInstance() {
        if (!BridgeService.instance)
            BridgeService.instance = new BridgeService();
        return BridgeService.instance;
    }
    get radio() {
        return {
            search: (query, pagination) => this.container.searchStationsUseCase.execute(query, pagination),
            getTop: (count) => this.container.getTopStationsUseCase.execute(count),
            getByCountry: (code, pagination) => this.container.getStationsByCountryUseCase.execute(code, pagination),
            getByGenre: (tag, pagination) => this.container.getStationsByGenreUseCase.execute(tag, pagination),
            getCountries: () => this.container.getCountriesUseCase.execute(),
            getGenres: () => this.container.getGenresUseCase.execute(),
            reportClick: async (stationId) => {
                try {
                    await this.container.stationRepo.reportClick(stationId);
                }
                catch { /* ignore */ }
            }
        };
    }
    get favorites() {
        return {
            getAll: () => this.container.getFavoritesUseCase.execute(),
            add: (station) => this.container.addFavoriteUseCase.execute(station),
            remove: (stationId) => this.container.removeFavoriteUseCase.execute(stationId),
            // Export/import not available on Android — return graceful no-op
            export: async () => ok(0),
            import: async () => ok(0),
        };
    }
    get history() {
        return {
            getAll: () => this.container.getHistoryUseCase.execute(),
            add: (station) => this.container.addToHistoryUseCase.execute(station),
            clear: () => this.container.clearHistoryUseCase.execute(),
        };
    }
    get settings() {
        return {
            get: () => this.container.getSettingsUseCase.execute(),
            update: (settings) => this.container.updateSettingsUseCase.execute(settings),
        };
    }
    get customStations() {
        return {
            getAll: () => this.container.getCustomStationsUseCase.execute(),
            add: (station) => this.container.addCustomStationUseCase.execute(station),
            remove: (stationId) => this.container.removeCustomStationUseCase.execute(stationId),
            update: (stationId, updates) => this.container.updateCustomStationUseCase.execute(stationId, updates),
        };
    }
}
