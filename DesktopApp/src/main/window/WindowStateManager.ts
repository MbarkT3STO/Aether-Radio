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
  private saveTimer: ReturnType<typeof setTimeout> | null = null

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
      // Debounce: only write to disk 300ms after the last resize/move event
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => {
        this.store.set('state', this.state)
        this.saveTimer = null
      }, 300)
    }

    win.on('resize', save)
    win.on('move', save)
    // On close, flush immediately — no debounce
    win.on('close', () => {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.store.set('state', this.state)
    })
  }
}
