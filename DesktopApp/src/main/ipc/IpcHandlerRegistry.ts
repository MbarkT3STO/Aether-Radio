import { RadioIpcHandler } from './handlers/RadioIpcHandler'
import { FavoritesIpcHandler } from './handlers/FavoritesIpcHandler'
import { HistoryIpcHandler } from './handlers/HistoryIpcHandler'
import { SettingsIpcHandler } from './handlers/SettingsIpcHandler'
import { CustomStationsIpcHandler } from './handlers/CustomStationsIpcHandler'
import { WindowIpcHandler } from './handlers/WindowIpcHandler'
import { RecognitionIpcHandler } from './handlers/RecognitionIpcHandler'
import type { BrowserWindow } from 'electron'
import type { TrayManager } from '../tray/TrayManager'

export class IpcHandlerRegistry {
  static registerAll(mainWindow: BrowserWindow, trayManager: TrayManager): void {
    RadioIpcHandler.register()
    FavoritesIpcHandler.register()
    HistoryIpcHandler.register()
    SettingsIpcHandler.register()
    CustomStationsIpcHandler.register()
    WindowIpcHandler.register(mainWindow, trayManager)
    RecognitionIpcHandler.register()
  }
}
