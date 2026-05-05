import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { IpcHandlerRegistry } from './ipc/IpcHandlerRegistry'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Disable for CORS and certificate issues
    }
  })

  // Load the app
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in development
  if (process.env['NODE_ENV'] === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  // Register all IPC handlers
  IpcHandlerRegistry.registerAll()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
