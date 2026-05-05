import { ipcMain } from 'electron'
import { IpcChannel } from '../IpcChannel'
import { Container } from '../../../infrastructure/di/Container'
import type { AppSettings } from '../../../domain/entities/AppSettings'

export class SettingsIpcHandler {
  static register(): void {
    const container = Container.getInstance()

    ipcMain.handle(IpcChannel.GET_SETTINGS, async () => {
      const result = await container.getSettingsUseCase.execute()
      return result
    })

    ipcMain.handle(IpcChannel.UPDATE_SETTINGS, async (_, settings: Partial<AppSettings>) => {
      const result = await container.updateSettingsUseCase.execute(settings)
      return result
    })
  }
}
