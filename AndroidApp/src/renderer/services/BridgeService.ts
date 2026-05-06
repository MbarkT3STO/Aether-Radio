/**
 * BridgeService — Android/Capacitor version.
 * Replaces the Electron IPC bridge. All data operations run directly
 * in the renderer via the Container (use cases + Capacitor Preferences).
 * No IPC, no preload, no native process boundary.
 */
import { Container } from '../../infrastructure/di/Container'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { AppSettings } from '../../domain/entities/AppSettings'
import type { CustomStation } from '../../domain/entities/CustomStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import type { Result } from '../../application/Result'
import { ok } from '../../application/Result'

export class BridgeService {
  private static instance: BridgeService
  private container = Container.getInstance()

  static getInstance(): BridgeService {
    if (!BridgeService.instance) BridgeService.instance = new BridgeService()
    return BridgeService.instance
  }

  get radio() {
    return {
      search: (query: SearchQueryDto, pagination: PaginationDto) =>
        this.container.searchStationsUseCase.execute(query, pagination),
      getTop: (count: number) =>
        this.container.getTopStationsUseCase.execute(count),
      getByCountry: (code: string, pagination: PaginationDto) =>
        this.container.getStationsByCountryUseCase.execute(code, pagination),
      getByGenre: (tag: string, pagination: PaginationDto) =>
        this.container.getStationsByGenreUseCase.execute(tag, pagination),
      getCountries: () =>
        this.container.getCountriesUseCase.execute(),
      getGenres: () =>
        this.container.getGenresUseCase.execute(),
      reportClick: async (stationId: string) => {
        try { await this.container.stationRepo.reportClick(stationId) } catch { /* ignore */ }
      }
    }
  }

  get favorites() {
    return {
      getAll: () => this.container.getFavoritesUseCase.execute(),
      add: (station: RadioStation) => this.container.addFavoriteUseCase.execute(station),
      remove: (stationId: string) => this.container.removeFavoriteUseCase.execute(stationId),
      // Export/import not available on Android — return graceful no-op
      export: async (): Promise<Result<number>> => ok(0),
      import: async (): Promise<Result<number>> => ok(0),
    }
  }

  get history() {
    return {
      getAll: () => this.container.getHistoryUseCase.execute(),
      add: (station: RadioStation) => this.container.addToHistoryUseCase.execute(station),
      clear: () => this.container.clearHistoryUseCase.execute(),
    }
  }

  get settings() {
    return {
      get: () => this.container.getSettingsUseCase.execute(),
      update: (settings: Partial<AppSettings>) => this.container.updateSettingsUseCase.execute(settings),
    }
  }

  get customStations() {
    return {
      getAll: () => this.container.getCustomStationsUseCase.execute(),
      add: (station: Omit<CustomStation, 'addedAt' | 'source'>) =>
        this.container.addCustomStationUseCase.execute(station as CustomStation),
      remove: (stationId: string) => this.container.removeCustomStationUseCase.execute(stationId),
      update: (stationId: string, updates: Partial<CustomStation>) =>
        this.container.updateCustomStationUseCase.execute(stationId, updates),
    }
  }
}
