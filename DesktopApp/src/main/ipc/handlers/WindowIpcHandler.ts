import { ipcMain, powerSaveBlocker, shell, BrowserWindow } from 'electron'
import { IpcChannel } from '../IpcChannel'
import type { TrayManager } from '../../tray/TrayManager'

interface TrayUpdatePayload {
  name: string
  playing: boolean
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
  }
}
