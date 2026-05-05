import { ipcMain, powerSaveBlocker, BrowserWindow } from 'electron'
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
  }
}
