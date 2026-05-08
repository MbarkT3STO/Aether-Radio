/**
 * BridgeService — web version.
 *
 * On desktop, this wraps window.electronAPI (IPC to the main process).
 * On the web, there is no main process — everything runs in the browser,
 * so we call the use-cases directly via the DI Container.
 *
 * The public API is intentionally identical to the desktop BridgeService
 * so views and components work without modification.
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

      // The public Radio Browser "click" reporting endpoint is noisy and
      // gated behind a station UUID — fire-and-forget is fine on web.
      reportClick: async (stationId: string): Promise<void> => {
        try {
          await this.c.stationRepo.reportClick(stationId)
        } catch {
          // Ignore — reporting is best-effort
        }
      },
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

      export: async (): Promise<Result<number>> => {
        const result = await this.c.getFavoritesUseCase.execute()
        if (!result.success) return result as Result<number>
        const favorites = result.data
        if (favorites.length === 0) {
          return { success: true, data: 0 }
        }
        const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' })
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = 'aether-favorites.json'
        document.body.appendChild(a)
        a.click()
        a.remove()
        // Give the download a moment before revoking
        setTimeout(() => URL.revokeObjectURL(href), 2000)
        return { success: true, data: favorites.length }
      },

      import: async (): Promise<Result<number>> => {
        return new Promise<Result<number>>((resolve) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'application/json,.json'
          input.style.display = 'none'
          document.body.appendChild(input)

          // `cancel` event fires when the picker is dismissed without a selection
          let settled = false
          const settle = (value: Result<number>): void => {
            if (settled) return
            settled = true
            input.remove()
            resolve(value)
          }

          input.addEventListener('cancel', () => {
            settle({ success: false, error: { code: 'CANCELLED', message: 'Cancelled' } })
          })

          input.addEventListener('change', async () => {
            const file = input.files?.[0]
            if (!file) {
              settle({ success: false, error: { code: 'CANCELLED', message: 'Cancelled' } })
              return
            }
            try {
              const text = await file.text()
              const favorites = JSON.parse(text) as Favorite[]
              if (!Array.isArray(favorites)) {
                settle({ success: false, error: { code: 'INVALID_FILE', message: 'Invalid favorites file' } })
                return
              }
              let count = 0
              for (const fav of favorites) {
                if (fav?.station) {
                  await this.c.addFavoriteUseCase.execute(fav.station)
                  count++
                }
              }
              settle({ success: true, data: count })
            } catch (e) {
              settle({ success: false, error: { code: 'INVALID_FILE', message: 'Invalid favorites file', details: e } })
            }
          })

          input.click()

          // Safety fallback: if neither `cancel` nor `change` fires within a long
          // window (can happen in older Safari), resolve as cancelled.
          setTimeout(() => {
            if (!settled) settle({ success: false, error: { code: 'CANCELLED', message: 'Cancelled' } })
          }, 5 * 60 * 1000)
        })
      },
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

  /** Open a URL in a new browser tab. */
  openExternal(url: string): void {
    if (typeof url !== 'string') return
    if (!url.startsWith('https://') && !url.startsWith('http://')) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
