/**
 * BridgeService — mobile version.
 *
 * On desktop, this wraps window.electronAPI (IPC calls to the main process).
 * On Android/Capacitor, there is no main process — everything runs in the
 * browser context, so we call the use-cases directly via the DI Container.
 *
 * The public API is intentionally identical to the desktop BridgeService so
 * all views and components work without modification.
 */
import { Container } from '../infrastructure/di/Container'
import type { RadioStation } from '../domain/entities/RadioStation'
import type { Favorite } from '../domain/entities/Favorite'
import type { PlayHistory } from '../domain/entities/PlayHistory'
import type { AppSettings } from '../domain/entities/AppSettings'
import type { CustomStation } from '../domain/entities/CustomStation'
import type { SearchQueryDto } from '../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../application/dtos/PaginationDto'
import type { Country } from '../domain/value-objects/Country'
import type { Genre } from '../domain/value-objects/Genre'
import type { Result } from '../application/Result'
import { Browser } from '@capacitor/browser'

export class BridgeService {
  private static instance: BridgeService

  private constructor() {}

  static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService()
    }
    return BridgeService.instance
  }

  private get c() {
    return Container.getInstance()
  }

  get radio() {
    return {
      search: (query: SearchQueryDto, pagination: PaginationDto): Promise<Result<RadioStation[]>> =>
        this.c.searchStationsUseCase.execute(query, pagination),

      getTop: (count: number): Promise<Result<RadioStation[]>> =>
        this.c.getTopStationsUseCase.execute(count),

      getByCountry: (countryCode: string, pagination: PaginationDto): Promise<Result<RadioStation[]>> =>
        this.c.getStationsByCountryUseCase.execute(countryCode, pagination),

      getByGenre: (tag: string, pagination: PaginationDto): Promise<Result<RadioStation[]>> =>
        this.c.getStationsByGenreUseCase.execute(tag, pagination),

      getCountries: (): Promise<Result<Country[]>> =>
        this.c.getCountriesUseCase.execute(),

      getGenres: (): Promise<Result<Genre[]>> =>
        this.c.getGenresUseCase.execute(),

      reportClick: (_stationId: string): Promise<void> => Promise.resolve(),
    }
  }

  get favorites() {
    return {
      getAll: (): Promise<Result<Favorite[]>> =>
        this.c.getFavoritesUseCase.execute(),

      add: (station: RadioStation): Promise<Result<Favorite>> =>
        this.c.addFavoriteUseCase.execute(station),

      remove: (stationId: string): Promise<Result<void>> =>
        this.c.removeFavoriteUseCase.execute(stationId),

      // Export/import not available on mobile
      export: (): Promise<Result<number>> =>
        Promise.resolve({ success: false as const, error: { code: 'NOT_SUPPORTED', message: 'Export not supported on mobile' } }),

      import: (): Promise<Result<number>> =>
        Promise.resolve({ success: false as const, error: { code: 'NOT_SUPPORTED', message: 'Import not supported on mobile' } }),
    }
  }

  get history() {
    return {
      getAll: (): Promise<Result<PlayHistory[]>> =>
        this.c.getHistoryUseCase.execute(),

      add: (station: RadioStation): Promise<Result<PlayHistory>> =>
        this.c.addToHistoryUseCase.execute(station),

      clear: (): Promise<Result<void>> =>
        this.c.clearHistoryUseCase.execute(),
    }
  }

  get settings() {
    return {
      get: (): Promise<Result<AppSettings>> =>
        this.c.getSettingsUseCase.execute(),

      update: (settings: Partial<AppSettings>): Promise<Result<AppSettings>> =>
        this.c.updateSettingsUseCase.execute(settings),
    }
  }

  get customStations() {
    return {
      getAll: (): Promise<Result<CustomStation[]>> =>
        this.c.getCustomStationsUseCase.execute(),

      add: (station: Omit<CustomStation, 'addedAt' | 'source'>): Promise<Result<CustomStation>> =>
        this.c.addCustomStationUseCase.execute(station),

      remove: (stationId: string): Promise<Result<void>> =>
        this.c.removeCustomStationUseCase.execute(stationId),

      update: (stationId: string, updates: Partial<CustomStation>): Promise<Result<CustomStation>> =>
        this.c.updateCustomStationUseCase.execute(stationId, updates),
    }
  }

  /** Open a URL in the system browser */
  async openExternal(url: string): Promise<void> {
    await Browser.open({ url })
  }
}
