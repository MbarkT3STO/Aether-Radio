import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'
import { MultiSourceStationRepository } from '../repositories/MultiSourceStationRepository'
import { CapacitorFavoritesRepository } from '../repositories/CapacitorFavoritesRepository'
import { CapacitorHistoryRepository } from '../repositories/CapacitorHistoryRepository'
import { CapacitorSettingsRepository } from '../repositories/CapacitorSettingsRepository'
import { CapacitorCustomStationsRepository } from '../repositories/CapacitorCustomStationsRepository'
import { SearchStationsUseCase } from '../../application/use-cases/radio/SearchStationsUseCase'
import { GetTopStationsUseCase } from '../../application/use-cases/radio/GetTopStationsUseCase'
import { GetStationsByCountryUseCase } from '../../application/use-cases/radio/GetStationsByCountryUseCase'
import { GetStationsByGenreUseCase } from '../../application/use-cases/radio/GetStationsByGenreUseCase'
import { GetStationByIdUseCase } from '../../application/use-cases/radio/GetStationByIdUseCase'
import { GetCountriesUseCase } from '../../application/use-cases/radio/GetCountriesUseCase'
import { GetGenresUseCase } from '../../application/use-cases/radio/GetGenresUseCase'
import { AddFavoriteUseCase } from '../../application/use-cases/favorites/AddFavoriteUseCase'
import { RemoveFavoriteUseCase } from '../../application/use-cases/favorites/RemoveFavoriteUseCase'
import { GetFavoritesUseCase } from '../../application/use-cases/favorites/GetFavoritesUseCase'
import { AddToHistoryUseCase } from '../../application/use-cases/history/AddToHistoryUseCase'
import { GetHistoryUseCase } from '../../application/use-cases/history/GetHistoryUseCase'
import { ClearHistoryUseCase } from '../../application/use-cases/history/ClearHistoryUseCase'
import { GetSettingsUseCase } from '../../application/use-cases/settings/GetSettingsUseCase'
import { UpdateSettingsUseCase } from '../../application/use-cases/settings/UpdateSettingsUseCase'
import { AddCustomStationUseCase } from '../../application/use-cases/custom-stations/AddCustomStationUseCase'
import { RemoveCustomStationUseCase } from '../../application/use-cases/custom-stations/RemoveCustomStationUseCase'
import { GetCustomStationsUseCase } from '../../application/use-cases/custom-stations/GetCustomStationsUseCase'
import { UpdateCustomStationUseCase } from '../../application/use-cases/custom-stations/UpdateCustomStationUseCase'
import { DEFAULT_SOURCES } from '../../domain/entities/StationSource'

export class Container {
  private static instance: Container

  private _customStationsRepo = new CapacitorCustomStationsRepository()
  private _stationRepo = new MultiSourceStationRepository(
    this._customStationsRepo,
    DEFAULT_SOURCES.filter(s => s.enabled && s.type === 'radio-browser' && s.baseUrl)
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.baseUrl!)
  )
  private _favoritesRepo = new CapacitorFavoritesRepository()
  private _historyRepo = new CapacitorHistoryRepository()
  private _settingsRepo = new CapacitorSettingsRepository()

  private _searchStationsUseCase = new SearchStationsUseCase(this._stationRepo)
  private _getTopStationsUseCase = new GetTopStationsUseCase(this._stationRepo)
  private _getStationsByCountryUseCase = new GetStationsByCountryUseCase(this._stationRepo)
  private _getStationsByGenreUseCase = new GetStationsByGenreUseCase(this._stationRepo)
  private _getStationByIdUseCase = new GetStationByIdUseCase(this._stationRepo)
  private _getCountriesUseCase = new GetCountriesUseCase(this._stationRepo)
  private _getGenresUseCase = new GetGenresUseCase(this._stationRepo)
  private _addFavoriteUseCase = new AddFavoriteUseCase(this._favoritesRepo)
  private _removeFavoriteUseCase = new RemoveFavoriteUseCase(this._favoritesRepo)
  private _getFavoritesUseCase = new GetFavoritesUseCase(this._favoritesRepo)
  private _addToHistoryUseCase = new AddToHistoryUseCase(this._historyRepo)
  private _getHistoryUseCase = new GetHistoryUseCase(this._historyRepo)
  private _clearHistoryUseCase = new ClearHistoryUseCase(this._historyRepo)
  private _getSettingsUseCase = new GetSettingsUseCase(this._settingsRepo)
  private _updateSettingsUseCase = new UpdateSettingsUseCase(this._settingsRepo)
  private _addCustomStationUseCase = new AddCustomStationUseCase(this._customStationsRepo)
  private _removeCustomStationUseCase = new RemoveCustomStationUseCase(this._customStationsRepo)
  private _getCustomStationsUseCase = new GetCustomStationsUseCase(this._customStationsRepo)
  private _updateCustomStationUseCase = new UpdateCustomStationUseCase(this._customStationsRepo)

  static getInstance(): Container {
    if (!Container.instance) Container.instance = new Container()
    return Container.instance
  }

  get searchStationsUseCase() { return this._searchStationsUseCase }
  get getTopStationsUseCase() { return this._getTopStationsUseCase }
  get getStationsByCountryUseCase() { return this._getStationsByCountryUseCase }
  get getStationsByGenreUseCase() { return this._getStationsByGenreUseCase }
  get getStationByIdUseCase() { return this._getStationByIdUseCase }
  get getCountriesUseCase() { return this._getCountriesUseCase }
  get getGenresUseCase() { return this._getGenresUseCase }
  get addFavoriteUseCase() { return this._addFavoriteUseCase }
  get removeFavoriteUseCase() { return this._removeFavoriteUseCase }
  get getFavoritesUseCase() { return this._getFavoritesUseCase }
  get addToHistoryUseCase() { return this._addToHistoryUseCase }
  get getHistoryUseCase() { return this._getHistoryUseCase }
  get clearHistoryUseCase() { return this._clearHistoryUseCase }
  get getSettingsUseCase() { return this._getSettingsUseCase }
  get updateSettingsUseCase() { return this._updateSettingsUseCase }
  get addCustomStationUseCase() { return this._addCustomStationUseCase }
  get removeCustomStationUseCase() { return this._removeCustomStationUseCase }
  get getCustomStationsUseCase() { return this._getCustomStationsUseCase }
  get updateCustomStationUseCase() { return this._updateCustomStationUseCase }
  get stationRepo() { return this._stationRepo }
}
