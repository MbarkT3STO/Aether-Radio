import { ipcMain, powerSaveBlocker, Notification, BrowserWindow } from 'electron'
import { IpcChannel } from '../IpcChannel'
import type { TrayManager } from '../../tray/TrayManager'

interface TrayUpdatePayload {
  name: string
  playing: boolean
}

interface NowPlayingPayload {
  name: string
  favicon?: string
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

    // ── Power save blocker (Feature 4) ────────────────────────────────────
    ipcMain.on(IpcChannel.PLAYER_STATE_CHANGED, (_, playing: boolean) => {
      if (playing && WindowIpcHandler.powerSaveId === null) {
        WindowIpcHandler.powerSaveId = powerSaveBlocker.start('prevent-app-suspension')
      } else if (!playing && WindowIpcHandler.powerSaveId !== null) {
        powerSaveBlocker.stop(WindowIpcHandler.powerSaveId)
        WindowIpcHandler.powerSaveId = null
      }
    })

    // ── OS Now Playing notification (Feature 6) ───────────────────────────
    ipcMain.on(IpcChannel.NOW_PLAYING, (_, payload: NowPlayingPayload) => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Now Playing',
          body: payload.name,
          silent: true,
        }).show()
      }
    })
  }
}
