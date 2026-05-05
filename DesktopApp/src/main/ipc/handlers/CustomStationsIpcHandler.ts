import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { CustomStation } from '../../../domain/entities/CustomStation'

export class CustomStationsIpcHandler {
  static register(): void {
    const container = Container.getInstance()

    ipcMain.handle(IpcChannel.GET_CUSTOM_STATIONS, async () => {
      const result = await container.getCustomStationsUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.ADD_CUSTOM_STATION, async (_, station: Omit<CustomStation, 'addedAt' | 'source'>) => {
      const result = await container.addCustomStationUseCase.execute(station)
      return result
    })

    ipcMain.handle(IpcChannel.REMOVE_CUSTOM_STATION, async (_, stationId: string) => {
      const result = await container.removeCustomStationUseCase.execute(stationId)
      return result
    })

    ipcMain.handle(IpcChannel.UPDATE_CUSTOM_STATION, async (_, stationId: string, updates: Partial<CustomStation>) => {
      const result = await container.updateCustomStationUseCase.execute(stationId, updates)
      return result
    })
  }
}
