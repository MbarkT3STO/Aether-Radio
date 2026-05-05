import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { SearchQueryDto } from '../../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../../application/dtos/PaginationDto'

export class RadioIpcHandler {
  static register(): void {
    const container = Container.getInstance()

    ipcMain.handle(IpcChannel.SEARCH_STATIONS, async (_, query: SearchQueryDto, pagination: PaginationDto) => {
      const result = await container.searchStationsUseCase.execute(query, pagination)
      return result
    })

    ipcMain.handle(IpcChannel.GET_TOP_STATIONS, async (_, count: number) => {
      const result = await container.getTopStationsUseCase.execute(count)
      return result
    })

    ipcMain.handle(IpcChannel.GET_BY_COUNTRY, async (_, countryCode: string, pagination: PaginationDto) => {
      const result = await container.getStationsByCountryUseCase.execute(countryCode, pagination)
      return result
    })

    ipcMain.handle(IpcChannel.GET_BY_GENRE, async (_, tag: string, pagination: PaginationDto) => {
      const result = await container.getStationsByGenreUseCase.execute(tag, pagination)
      return result
    })

    ipcMain.handle(IpcChannel.GET_COUNTRIES, async () => {
      const result = await container.getCountriesUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.GET_GENRES, async () => {
      const result = await container.getGenresUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.REPORT_CLICK, async (_, stationId: string) => {
      try {
        await container.stationRepo.reportClick(stationId)
      } catch (e) {
        console.error('Failed to report click:', e)
      }
    })
  }
}
