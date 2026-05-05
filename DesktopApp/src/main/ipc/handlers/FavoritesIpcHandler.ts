import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import type { Favorite } from '../../../domain/entities/Favorite'

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

    ipcMain.handle(IpcChannel.EXPORT_FAVORITES, async () => {
      const result = await container.getFavoritesUseCase.execute()
      if (!result.success) return result
      const { dialog } = await import('electron')
      const path = await dialog.showSaveDialog({
        defaultPath: 'aether-favorites.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (path.canceled || !path.filePath) {
        return { success: false, error: { code: 'CANCELLED', message: 'Cancelled' } }
      }
      const fs = await import('fs/promises')
      await fs.writeFile(path.filePath, JSON.stringify(result.data, null, 2), 'utf-8')
      return { success: true, data: result.data.length }
    })

    ipcMain.handle(IpcChannel.IMPORT_FAVORITES, async () => {
      const { dialog } = await import('electron')
      const path = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (path.canceled || !path.filePaths[0]) {
        return { success: false, error: { code: 'CANCELLED', message: 'Cancelled' } }
      }
      const fs = await import('fs/promises')
      const raw = await fs.readFile(path.filePaths[0], 'utf-8')
      const favorites = JSON.parse(raw) as Favorite[]
      let count = 0
      for (const fav of favorites) {
        await container.addFavoriteUseCase.execute(fav.station)
        count++
      }
      return { success: true, data: count }
    })
  }
}
