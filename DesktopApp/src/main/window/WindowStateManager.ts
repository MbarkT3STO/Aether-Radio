import Store from 'electron-store'
import { BrowserWindow } from 'electron'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
}

const DEFAULT: WindowState = { width: 1400, height: 900, maximized: false }

export class WindowStateManager {
  private store: Store
  private state: WindowState

  constructor() {
    this.store = new Store({ name: 'window-state' }) as Store
    this.state = (this.store.get('state') as WindowState | undefined) ?? DEFAULT
  }

  getState(): WindowState {
    return this.state
  }

  track(win: BrowserWindow): void {
    const save = (): void => {
      if (!win.isMaximized() && !win.isMinimized()) {
        const [x, y] = win.getPosition()
        const [width, height] = win.getSize()
        this.state = { x, y, width, height, maximized: false }
      } else {
        this.state = { ...this.state, maximized: win.isMaximized() }
      }
      this.store.set('state', this.state)
    }

    win.on('resize', save)
    win.on('move', save)
    win.on('close', save)
  }
}
