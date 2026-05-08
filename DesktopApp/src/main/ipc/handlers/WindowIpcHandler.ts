import { ipcMain, powerSaveBlocker, shell, BrowserWindow, app } from 'electron'
import { IpcChannel } from '../IpcChannel'
import type { TrayManager } from '../../tray/TrayManager'

interface TrayUpdatePayload {
  name: string
  playing: boolean
}

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  node: string
  v8: string
  platform: string
  arch: string
  userDataPath: string
  locale: string
}

export class WindowIpcHandler {
  private static powerSaveId: number | null = null

  static register(mainWindow: BrowserWindow, trayManager: TrayManager): void {
    // ── Tray state update from renderer ──────────────────────────────────
    ipcMain.on(IpcChannel.TRAY_UPDATE, (_, payload: TrayUpdatePayload) => {
      trayManager.updatePlaybackState(mainWindow, payload.name, payload.playing)
      // When the player stops (not playing and no station name), clear tray state
      if (!payload.playing && !payload.name) {
        trayManager.clearStation(mainWindow)
      }
    })

    // ── Window controls ───────────────────────────────────────────────────
    ipcMain.on(IpcChannel.WINDOW_MINIMIZE, () => {
      mainWindow.minimize()
    })

    ipcMain.on(IpcChannel.WINDOW_CLOSE, () => {
      mainWindow.hide()
    })

    // ── Power save blocker ────────────────────────────────────────────────
    ipcMain.on(IpcChannel.PLAYER_STATE_CHANGED, (_, playing: boolean) => {
      if (playing && WindowIpcHandler.powerSaveId === null) {
        WindowIpcHandler.powerSaveId = powerSaveBlocker.start('prevent-app-suspension')
      } else if (!playing && WindowIpcHandler.powerSaveId !== null) {
        powerSaveBlocker.stop(WindowIpcHandler.powerSaveId)
        WindowIpcHandler.powerSaveId = null
      }
    })

    // ── Open external URL in default browser ──────────────────────────────
    ipcMain.on(IpcChannel.OPEN_EXTERNAL, (_, url: string) => {
      // Only allow https URLs to prevent abuse
      if (typeof url === 'string' && url.startsWith('https://')) {
        shell.openExternal(url)
      }
    })

    // ── Reveal the user-data folder in Finder/Explorer ───────────────────
    ipcMain.on(IpcChannel.SHOW_LOG_FOLDER, () => {
      shell.openPath(app.getPath('userData'))
    })

    // ── App info (runtime versions, paths) ────────────────────────────────
    ipcMain.handle(IpcChannel.GET_APP_INFO, async (): Promise<AppInfo> => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        electron: process.versions.electron ?? '',
        chrome:   process.versions.chrome   ?? '',
        node:     process.versions.node     ?? '',
        v8:       process.versions.v8       ?? '',
        platform: process.platform,
        arch:     process.arch,
        userDataPath: app.getPath('userData'),
        locale:   app.getLocale(),
      }
    })
  }
}
