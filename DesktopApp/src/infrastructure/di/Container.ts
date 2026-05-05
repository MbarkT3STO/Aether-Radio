import Store from 'electron-store'
import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'
import { ElectronStationRepository } from '../repositories/ElectronStationRepository'
import { ElectronCustomStationsRepository } from '../repositories/ElectronCustomStationsRepository'
import { MultiSourceStationRepository } from '../repositories/MultiSourceStationRepository'
import { ElectronFavoritesRepository } from '../repositories/ElectronFavoritesRepository'
import { ElectronHistoryRepository } from '../repositories/ElectronHistoryRepository'
import { ElectronSettingsRepository } from '../repositories/ElectronSettingsRepository'
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
  
  private _store: Store
  
  // Repositories
  private _stationRepo: MultiSourceStationRepository
  private _customStationsRepo: ElectronCustomStationsRepository
  private _favoritesRepo: ElectronFavoritesRepository
  private _historyRepo: ElectronHistoryRepository
  private _settingsRepo: ElectronSettingsRepository
  
  // Use Cases
  private _searchStationsUseCase: SearchStationsUseCase
  private _getTopStationsUseCase: GetTopStationsUseCase
  private _getStationsByCountryUseCase: GetStationsByCountryUseCase
  private _getStationsByGenreUseCase: GetStationsByGenreUseCase
  private _getStationByIdUseCase: GetStationByIdUseCase
  private _getCountriesUseCase: GetCountriesUseCase
  private _getGenresUseCase: GetGenresUseCase
  private _addFavoriteUseCase: AddFavoriteUseCase
  private _removeFavoriteUseCase: RemoveFavoriteUseCase
  private _getFavoritesUseCase: GetFavoritesUseCase
  private _addToHistoryUseCase: AddToHistoryUseCase
  private _getHistoryUseCase: GetHistoryUseCase
  private _clearHistoryUseCase: ClearHistoryUseCase
  private _getSettingsUseCase: GetSettingsUseCase
  private _updateSettingsUseCase: UpdateSettingsUseCase
  private _addCustomStationUseCase: AddCustomStationUseCase
  private _removeCustomStationUseCase: RemoveCustomStationUseCase
  private _getCustomStationsUseCase: GetCustomStationsUseCase
  private _updateCustomStationUseCase: UpdateCustomStationUseCase

  private constructor() {
    // Initialize store
    this._store = new Store({
      name: 'radiosphere-data'
    })

    // Get enabled API sources from settings or use defaults
    const enabledSources = DEFAULT_SOURCES
      .filter(s => s.enabled && s.type === 'radio-browser' && s.baseUrl)
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.baseUrl!)

    // Initialize repositories
    this._customStationsRepo = new ElectronCustomStationsRepository(this._store)
    this._stationRepo = new MultiSourceStationRepository(
      this._customStationsRepo,
      enabledSources
    )
    this._favoritesRepo = new ElectronFavoritesRepository(this._store)
    this._historyRepo = new ElectronHistoryRepository(this._store)
    this._settingsRepo = new ElectronSettingsRepository(this._store)

    // Initialize use cases
    this._searchStationsUseCase = new SearchStationsUseCase(this._stationRepo)
    this._getTopStationsUseCase = new GetTopStationsUseCase(this._stationRepo)
    this._getStationsByCountryUseCase = new GetStationsByCountryUseCase(this._stationRepo)
    this._getStationsByGenreUseCase = new GetStationsByGenreUseCase(this._stationRepo)
    this._getStationByIdUseCase = new GetStationByIdUseCase(this._stationRepo)
    this._getCountriesUseCase = new GetCountriesUseCase(this._stationRepo)
    this._getGenresUseCase = new GetGenresUseCase(this._stationRepo)
    this._addFavoriteUseCase = new AddFavoriteUseCase(this._favoritesRepo)
    this._removeFavoriteUseCase = new RemoveFavoriteUseCase(this._favoritesRepo)
    this._getFavoritesUseCase = new GetFavoritesUseCase(this._favoritesRepo)
    this._addToHistoryUseCase = new AddToHistoryUseCase(this._historyRepo)
    this._getHistoryUseCase = new GetHistoryUseCase(this._historyRepo)
    this._clearHistoryUseCase = new ClearHistoryUseCase(this._historyRepo)
    this._getSettingsUseCase = new GetSettingsUseCase(this._settingsRepo)
    this._updateSettingsUseCase = new UpdateSettingsUseCase(this._settingsRepo)
    this._addCustomStationUseCase = new AddCustomStationUseCase(this._customStationsRepo)
    this._removeCustomStationUseCase = new RemoveCustomStationUseCase(this._customStationsRepo)
    this._getCustomStationsUseCase = new GetCustomStationsUseCase(this._customStationsRepo)
    this._updateCustomStationUseCase = new UpdateCustomStationUseCase(this._customStationsRepo)
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  // Getters for use cases
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
  get customStationsRepo() { return this._customStationsRepo }
}
