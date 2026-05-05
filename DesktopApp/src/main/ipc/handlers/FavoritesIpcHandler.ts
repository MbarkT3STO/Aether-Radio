import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { RadioStation } from '../../../domain/entities/RadioStation'

export class FavoritesIpcHandler {
  static register(): void {
    const container = Container.getInstance()

    ipcMain.handle(IpcChannel.GET_FAVORITES, async () => {
      const result = await container.getFavoritesUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.ADD_FAVORITE, async (_, station: RadioStation) => {
      const result = await container.addFavoriteUseCase.execute(station)
      return result
    })

    ipcMain.handle(IpcChannel.REMOVE_FAVORITE, async (_, stationId: string) => {
      const result = await container.removeFavoriteUseCase.execute(stationId)
      return result
    })
  }
}
