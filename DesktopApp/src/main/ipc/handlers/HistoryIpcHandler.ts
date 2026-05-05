import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { RadioStation } from '../../../domain/entities/RadioStation'

export class HistoryIpcHandler {
  static register(): void {
    const container = Container.getInstance()

    ipcMain.handle(IpcChannel.GET_HISTORY, async () => {
      const result = await container.getHistoryUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.ADD_HISTORY, async (_, station: RadioStation) => {
      const result = await container.addToHistoryUseCase.execute(station)
      return result
    })

    ipcMain.handle(IpcChannel.CLEAR_HISTORY, async () => {
      const result = await container.clearHistoryUseCase.execute()
      return result
    })
  }
}
