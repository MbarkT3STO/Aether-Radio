import { MultiSourceStationRepository } from '../repositories/MultiSourceStationRepository';
import { CapacitorFavoritesRepository } from '../repositories/CapacitorFavoritesRepository';
import { CapacitorHistoryRepository } from '../repositories/CapacitorHistoryRepository';
import { CapacitorSettingsRepository } from '../repositories/CapacitorSettingsRepository';
import { CapacitorCustomStationsRepository } from '../repositories/CapacitorCustomStationsRepository';
import { SearchStationsUseCase } from '../../application/use-cases/radio/SearchStationsUseCase';
import { GetTopStationsUseCase } from '../../application/use-cases/radio/GetTopStationsUseCase';
import { GetStationsByCountryUseCase } from '../../application/use-cases/radio/GetStationsByCountryUseCase';
import { GetStationsByGenreUseCase } from '../../application/use-cases/radio/GetStationsByGenreUseCase';
import { GetStationByIdUseCase } from '../../application/use-cases/radio/GetStationByIdUseCase';
import { GetCountriesUseCase } from '../../application/use-cases/radio/GetCountriesUseCase';
import { GetGenresUseCase } from '../../application/use-cases/radio/GetGenresUseCase';
import { AddFavoriteUseCase } from '../../application/use-cases/favorites/AddFavoriteUseCase';
import { RemoveFavoriteUseCase } from '../../application/use-cases/favorites/RemoveFavoriteUseCase';
import { GetFavoritesUseCase } from '../../application/use-cases/favorites/GetFavoritesUseCase';
import { AddToHistoryUseCase } from '../../application/use-cases/history/AddToHistoryUseCase';
import { GetHistoryUseCase } from '../../application/use-cases/history/GetHistoryUseCase';
import { ClearHistoryUseCase } from '../../application/use-cases/history/ClearHistoryUseCase';
import { GetSettingsUseCase } from '../../application/use-cases/settings/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../../application/use-cases/settings/UpdateSettingsUseCase';
import { AddCustomStationUseCase } from '../../application/use-cases/custom-stations/AddCustomStationUseCase';
import { RemoveCustomStationUseCase } from '../../application/use-cases/custom-stations/RemoveCustomStationUseCase';
import { GetCustomStationsUseCase } from '../../application/use-cases/custom-stations/GetCustomStationsUseCase';
import { UpdateCustomStationUseCase } from '../../application/use-cases/custom-stations/UpdateCustomStationUseCase';
import { DEFAULT_SOURCES } from '../../domain/entities/StationSource';
export class Container {
    constructor() {
        Object.defineProperty(this, "_customStationsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new CapacitorCustomStationsRepository()
        });
        Object.defineProperty(this, "_stationRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new MultiSourceStationRepository(this._customStationsRepo, DEFAULT_SOURCES.filter(s => s.enabled && s.type === 'radio-browser' && s.baseUrl)
                .sort((a, b) => a.priority - b.priority)
                .map(s => s.baseUrl))
        });
        Object.defineProperty(this, "_favoritesRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new CapacitorFavoritesRepository()
        });
        Object.defineProperty(this, "_historyRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new CapacitorHistoryRepository()
        });
        Object.defineProperty(this, "_settingsRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new CapacitorSettingsRepository()
        });
        Object.defineProperty(this, "_searchStationsUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new SearchStationsUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getTopStationsUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetTopStationsUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getStationsByCountryUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetStationsByCountryUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getStationsByGenreUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetStationsByGenreUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getStationByIdUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetStationByIdUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getCountriesUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetCountriesUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_getGenresUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetGenresUseCase(this._stationRepo)
        });
        Object.defineProperty(this, "_addFavoriteUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AddFavoriteUseCase(this._favoritesRepo)
        });
        Object.defineProperty(this, "_removeFavoriteUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new RemoveFavoriteUseCase(this._favoritesRepo)
        });
        Object.defineProperty(this, "_getFavoritesUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetFavoritesUseCase(this._favoritesRepo)
        });
        Object.defineProperty(this, "_addToHistoryUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AddToHistoryUseCase(this._historyRepo)
        });
        Object.defineProperty(this, "_getHistoryUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetHistoryUseCase(this._historyRepo)
        });
        Object.defineProperty(this, "_clearHistoryUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new ClearHistoryUseCase(this._historyRepo)
        });
        Object.defineProperty(this, "_getSettingsUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetSettingsUseCase(this._settingsRepo)
        });
        Object.defineProperty(this, "_updateSettingsUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new UpdateSettingsUseCase(this._settingsRepo)
        });
        Object.defineProperty(this, "_addCustomStationUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AddCustomStationUseCase(this._customStationsRepo)
        });
        Object.defineProperty(this, "_removeCustomStationUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new RemoveCustomStationUseCase(this._customStationsRepo)
        });
        Object.defineProperty(this, "_getCustomStationsUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new GetCustomStationsUseCase(this._customStationsRepo)
        });
        Object.defineProperty(this, "_updateCustomStationUseCase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new UpdateCustomStationUseCase(this._customStationsRepo)
        });
    }
    static getInstance() {
        if (!Container.instance)
            Container.instance = new Container();
        return Container.instance;
    }
    get searchStationsUseCase() { return this._searchStationsUseCase; }
    get getTopStationsUseCase() { return this._getTopStationsUseCase; }
    get getStationsByCountryUseCase() { return this._getStationsByCountryUseCase; }
    get getStationsByGenreUseCase() { return this._getStationsByGenreUseCase; }
    get getStationByIdUseCase() { return this._getStationByIdUseCase; }
    get getCountriesUseCase() { return this._getCountriesUseCase; }
    get getGenresUseCase() { return this._getGenresUseCase; }
    get addFavoriteUseCase() { return this._addFavoriteUseCase; }
    get removeFavoriteUseCase() { return this._removeFavoriteUseCase; }
    get getFavoritesUseCase() { return this._getFavoritesUseCase; }
    get addToHistoryUseCase() { return this._addToHistoryUseCase; }
    get getHistoryUseCase() { return this._getHistoryUseCase; }
    get clearHistoryUseCase() { return this._clearHistoryUseCase; }
    get getSettingsUseCase() { return this._getSettingsUseCase; }
    get updateSettingsUseCase() { return this._updateSettingsUseCase; }
    get addCustomStationUseCase() { return this._addCustomStationUseCase; }
    get removeCustomStationUseCase() { return this._removeCustomStationUseCase; }
    get getCustomStationsUseCase() { return this._getCustomStationsUseCase; }
    get updateCustomStationUseCase() { return this._updateCustomStationUseCase; }
    get stationRepo() { return this._stationRepo; }
}
