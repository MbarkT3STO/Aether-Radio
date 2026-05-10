import { app, BrowserWindow, Menu, session, globalShortcut } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IpcHandlerRegistry } from './ipc/IpcHandlerRegistry'
import { TrayManager } from './tray/TrayManager'
import { WindowStateManager } from './window/WindowStateManager'

// Packaged builds get no DevTools — this flag is the single source of truth
// for every DevTools guard below. Dev builds keep full debugging power.
const DEVTOOLS_ALLOWED = is.dev

const trayManager = new TrayManager()
const windowStateManager = new WindowStateManager()

let mainWindow: BrowserWindow | null = null

/**
 * Returns the correct window icon path for the current platform.
 * macOS draws its icon from the .app bundle so we skip it there
 * (Electron respects the bundled Info.plist CFBundleIconFile).
 * Linux/Windows benefit from an explicit PNG in the window options.
 */
function getWindowIconPath(): string | undefined {
  if (process.platform === 'darwin') return undefined
  // build/icon.png ships beside the .app / .exe in production
  return is.dev
    ? join(app.getAppPath(), 'build/icon.png')
    : join(process.resourcesPath, 'build', 'icon.png')
}

function createWindow(): void {
  const state = windowStateManager.getState()

  // Frameless window on all platforms — we provide our own custom
  // traffic-light-style controls in the renderer.
  // frame:false removes the native title bar and window chrome entirely.
  // titleBarStyle:'hidden' ensures macOS doesn't show native traffic lights.
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0A0A0F',
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -20, y: -20 },
    icon: getWindowIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // Required: prevents audio stuttering when window is hidden/minimized.
      // The renderer's VisualizerService handles its own throttling via
      // document.visibilitychange to avoid wasting CPU when not visible.
      // Hard-disable DevTools in packaged builds. With this flag off Electron
      // tears out the DevTools runtime entirely — openDevTools() becomes a
      // no-op and the inspector shortcut never reaches a listener.
      devTools: DEVTOOLS_ALLOWED,
    },
  })

  // Defence-in-depth: even if something tries to force DevTools open
  // (extension, programmatic call, renderer exploit), slam it shut.
  if (!DEVTOOLS_ALLOWED) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })

    // Swallow every known DevTools keystroke before the renderer sees it:
    //   F12 · Ctrl/Cmd+Shift+I · Ctrl/Cmd+Shift+J · Ctrl/Cmd+Shift+C
    //   Cmd+Alt+I (macOS Safari-style)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      const key = input.key.toLowerCase()
      const mod = input.control || input.meta
      const isDevToolsCombo =
        key === 'f12' ||
        (mod && input.shift && (key === 'i' || key === 'j' || key === 'c')) ||
        (input.meta && input.alt && key === 'i')
      if (isDevToolsCombo) {
        event.preventDefault()
      }
    })
  }

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

  // Open DevTools in development only — production builds disable the
  // entire DevTools runtime via webPreferences.devTools = false.
  if (DEVTOOLS_ALLOWED && process.env['NODE_ENV'] === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

/**
 * Install a minimal application menu that strips every DevTools entry.
 *
 * Electron's default menu on macOS exposes View → Toggle Developer Tools
 * and an Inspect Element context item. We replace it with a stripped-down
 * menu that only keeps the bits users expect (copy/paste, window, quit)
 * and completely hide the menu bar on Windows/Linux where it's optional.
 */
function installApplicationMenu(): void {
  if (DEVTOOLS_ALLOWED) return // Dev builds keep the default menu for debugging

  if (process.platform === 'darwin') {
    const appName = app.name
    const menu = Menu.buildFromTemplate([
      {
        label: appName,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' },
        ],
      },
    ])
    Menu.setApplicationMenu(menu)
  } else {
    // Windows / Linux — drop the menu bar entirely
    Menu.setApplicationMenu(null)
  }
}

app.whenReady().then(() => {
  // Strip DevTools entries from the application menu in packaged builds
  installApplicationMenu()

  // Inject CORS header only for audio/stream responses — not for API JSON calls.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders ?? {}

    const contentType =
      Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.[0] ?? ''

    const isAudioStream =
      contentType.startsWith('audio/') ||
      contentType.includes('application/ogg') ||
      contentType.includes('application/octet-stream') ||
      details.url.includes('/stream') ||
      details.url.match(/\.(mp3|aac|ogg|m3u8|pls)(\?|$)/i) !== null

    const alreadyHasCors = Object.keys(headers).some(
      k => k.toLowerCase() === 'access-control-allow-origin'
    )

    if (isAudioStream && !alreadyHasCors) {
      callback({
        responseHeaders: {
          ...headers,
          'Access-Control-Allow-Origin': ['*'],
        },
      })
    } else {
      callback({ responseHeaders: headers })
    }
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

// Last-resort guard: some third-party HTTP libs (or undici via net.fetch)
// can throw synchronously on streams with non-Latin-1 headers. Log and keep
// the app running instead of surfacing the native error dialog.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
