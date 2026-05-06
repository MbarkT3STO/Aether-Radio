import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'
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

// Mobile-compatible station repository wrapping the API client
import { MobileStationRepository } from '../repositories/MobileStationRepository'

const DEFAULT_API_BASE = 'https://de1.api.radio-browser.info'

export class Container {
  private static instance: Container

  // Repositories
  private _favoritesRepo: CapacitorFavoritesRepository
  private _historyRepo: CapacitorHistoryRepository
  private _settingsRepo: CapacitorSettingsRepository
  private _customStationsRepo: CapacitorCustomStationsRepository
  private _stationRepo: MobileStationRepository

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
    const apiClient = new RadioBrowserApiClient(DEFAULT_API_BASE)

    this._favoritesRepo      = new CapacitorFavoritesRepository()
    this._historyRepo        = new CapacitorHistoryRepository()
    this._settingsRepo       = new CapacitorSettingsRepository()
    this._customStationsRepo = new CapacitorCustomStationsRepository()
    this._stationRepo        = new MobileStationRepository(apiClient, this._customStationsRepo)

    this._searchStationsUseCase      = new SearchStationsUseCase(this._stationRepo)
    this._getTopStationsUseCase      = new GetTopStationsUseCase(this._stationRepo)
    this._getStationsByCountryUseCase = new GetStationsByCountryUseCase(this._stationRepo)
    this._getStationsByGenreUseCase  = new GetStationsByGenreUseCase(this._stationRepo)
    this._getStationByIdUseCase      = new GetStationByIdUseCase(this._stationRepo)
    this._getCountriesUseCase        = new GetCountriesUseCase(this._stationRepo)
    this._getGenresUseCase           = new GetGenresUseCase(this._stationRepo)
    this._addFavoriteUseCase         = new AddFavoriteUseCase(this._favoritesRepo)
    this._removeFavoriteUseCase      = new RemoveFavoriteUseCase(this._favoritesRepo)
    this._getFavoritesUseCase        = new GetFavoritesUseCase(this._favoritesRepo)
    this._addToHistoryUseCase        = new AddToHistoryUseCase(this._historyRepo)
    this._getHistoryUseCase          = new GetHistoryUseCase(this._historyRepo)
    this._clearHistoryUseCase        = new ClearHistoryUseCase(this._historyRepo)
    this._getSettingsUseCase         = new GetSettingsUseCase(this._settingsRepo)
    this._updateSettingsUseCase      = new UpdateSettingsUseCase(this._settingsRepo)
    this._addCustomStationUseCase    = new AddCustomStationUseCase(this._customStationsRepo)
    this._removeCustomStationUseCase = new RemoveCustomStationUseCase(this._customStationsRepo)
    this._getCustomStationsUseCase   = new GetCustomStationsUseCase(this._customStationsRepo)
    this._updateCustomStationUseCase = new UpdateCustomStationUseCase(this._customStationsRepo)
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  /** Reinitialize with a different API base URL (from settings) */
  static reinitialize(apiBase: string): void {
    const c = Container.getInstance()
    const apiClient = new RadioBrowserApiClient(apiBase)
    c._stationRepo = new MobileStationRepository(apiClient, c._customStationsRepo)
    c._searchStationsUseCase       = new SearchStationsUseCase(c._stationRepo)
    c._getTopStationsUseCase       = new GetTopStationsUseCase(c._stationRepo)
    c._getStationsByCountryUseCase = new GetStationsByCountryUseCase(c._stationRepo)
    c._getStationsByGenreUseCase   = new GetStationsByGenreUseCase(c._stationRepo)
    c._getStationByIdUseCase       = new GetStationByIdUseCase(c._stationRepo)
    c._getCountriesUseCase         = new GetCountriesUseCase(c._stationRepo)
    c._getGenresUseCase            = new GetGenresUseCase(c._stationRepo)
  }

  get searchStationsUseCase()       { return this._searchStationsUseCase }
  get getTopStationsUseCase()       { return this._getTopStationsUseCase }
  get getStationsByCountryUseCase() { return this._getStationsByCountryUseCase }
  get getStationsByGenreUseCase()   { return this._getStationsByGenreUseCase }
  get getStationByIdUseCase()       { return this._getStationByIdUseCase }
  get getCountriesUseCase()         { return this._getCountriesUseCase }
  get getGenresUseCase()            { return this._getGenresUseCase }
  get addFavoriteUseCase()          { return this._addFavoriteUseCase }
  get removeFavoriteUseCase()       { return this._removeFavoriteUseCase }
  get getFavoritesUseCase()         { return this._getFavoritesUseCase }
  get addToHistoryUseCase()         { return this._addToHistoryUseCase }
  get getHistoryUseCase()           { return this._getHistoryUseCase }
  get clearHistoryUseCase()         { return this._clearHistoryUseCase }
  get getSettingsUseCase()          { return this._getSettingsUseCase }
  get updateSettingsUseCase()       { return this._updateSettingsUseCase }
  get addCustomStationUseCase()     { return this._addCustomStationUseCase }
  get removeCustomStationUseCase()  { return this._removeCustomStationUseCase }
  get getCustomStationsUseCase()    { return this._getCustomStationsUseCase }
  get updateCustomStationUseCase()  { return this._updateCustomStationUseCase }
  get customStationsRepo()          { return this._customStationsRepo }
}
