import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'

export class TrayManager {
  private tray: Tray | null = null
  private currentStationName = 'No station playing'
  private isPlaying = false

  create(mainWindow: BrowserWindow): void {
    // Use the colored app icon for the tray on every platform.
    // @2x is loaded automatically by Electron when present alongside the 1x file.
    const iconPath = is.dev
      ? path.join(app.getAppPath(), 'src/renderer/assets/tray-icon.png')
      : path.join(__dirname, '../renderer/assets/tray-icon.png')

    const icon = nativeImage.createFromPath(iconPath)

    this.tray = new Tray(icon)
    this.tray.setToolTip('Aether Radio')
    this.updateMenu(mainWindow)
    // No click handler — interaction is via context menu only
  }

  updatePlaybackState(
    mainWindow: BrowserWindow,
    stationName: string,
    playing: boolean
  ): void {
    this.currentStationName = stationName || 'No station playing'
    this.isPlaying = playing
    this.updateMenu(mainWindow)
    this.tray?.setToolTip(
      playing ? `Aether Radio — ${this.currentStationName}` : 'Aether Radio'
    )
  }

  private updateMenu(mainWindow: BrowserWindow): void {
    const hasStation = this.currentStationName !== 'No station playing'

    const menu = Menu.buildFromTemplate([
      { label: this.currentStationName, enabled: false },
      { type: 'separator' },
      {
        label: this.isPlaying ? 'Pause' : 'Play',
        // Can only play if there's a station loaded
        enabled: hasStation || this.isPlaying,
        click: () => mainWindow.webContents.send('tray:toggle-playback'),
      },
      {
        label: 'Stop',
        enabled: this.isPlaying,
        click: () => mainWindow.webContents.send('tray:stop'),
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
        },
      },
      { type: 'separator' },
      { label: 'Quit Aether Radio', click: () => app.quit() },
    ])
    this.tray?.setContextMenu(menu)
  }

  clearStation(mainWindow: BrowserWindow): void {
    this.currentStationName = 'No station playing'
    this.isPlaying = false
    this.updateMenu(mainWindow)
    this.tray?.setToolTip('Aether Radio')
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
