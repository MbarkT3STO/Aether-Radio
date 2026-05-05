import { app, BrowserWindow, session, globalShortcut } from 'electron'
import { join } from 'path'
import { IpcHandlerRegistry } from './ipc/IpcHandlerRegistry'
import { TrayManager } from './tray/TrayManager'
import { WindowStateManager } from './window/WindowStateManager'

const trayManager = new TrayManager()
const windowStateManager = new WindowStateManager()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const state = windowStateManager.getState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Restore maximized state
  if (state.maximized) {
    mainWindow.maximize()
  }

  // Intercept close → hide instead of quit (tray keeps app alive)
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  // Track window size/position for next launch
  windowStateManager.track(mainWindow)

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
  // Allow radio stream CORS
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
      },
    })
  })

  createWindow()

  if (!mainWindow) return

  // System tray (Feature 1)
  trayManager.create(mainWindow)

  // Register all domain IPC handlers (includes WindowIpcHandler)
  IpcHandlerRegistry.registerAll(mainWindow, trayManager)

  // Global keyboard shortcuts (Feature 2)
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('shortcut:toggle-playback')
  })
  globalShortcut.register('MediaStop', () => {
    mainWindow?.webContents.send('shortcut:stop')
  })
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('shortcut:next-station')
  })
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('shortcut:toggle-playback')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

// Keep app alive when all windows are closed — tray handles quit
app.on('window-all-closed', () => {
  // Do not quit; the tray icon provides the quit action
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  trayManager.destroy()
})

// Allow force-quit via Cmd+Q on macOS (app menu)
app.on('before-quit', () => {
  // Remove the close interceptor so the window actually closes
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})
