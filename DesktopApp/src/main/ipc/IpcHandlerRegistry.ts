import { RadioIpcHandler } from './handlers/RadioIpcHandler'
import { FavoritesIpcHandler } from './handlers/FavoritesIpcHandler'
import { HistoryIpcHandler } from './handlers/HistoryIpcHandler'
import { SettingsIpcHandler } from './handlers/SettingsIpcHandler'
import { CustomStationsIpcHandler } from './handlers/CustomStationsIpcHandler'

export class IpcHandlerRegistry {
  static registerAll(): void {
    RadioIpcHandler.register()
    FavoritesIpcHandler.register()
    HistoryIpcHandler.register()
    SettingsIpcHandler.register()
    CustomStationsIpcHandler.register()
  }
}
