export type Theme = 'dark' | 'light'
export type BufferSize = 'low' | 'balanced' | 'high'

/** Accent color identifiers — maps to CSS token overrides */
export type AccentColor =
  | 'blue'          // Apple systemBlue (default)
  | 'indigo'        // Apple systemIndigo
  | 'royal-purple'  // Rich violet (the app's original purple)
  | 'purple'        // Apple systemPurple
  | 'pink'          // Apple systemPink
  | 'red'           // Apple systemRed
  | 'orange'        // Apple systemOrange
  | 'green'         // Apple systemGreen
  | 'mint'          // Apple systemMint
  | 'teal'          // Apple systemTeal
  | 'cyan'          // Apple systemCyan
  | 'graphite'      // Refined neutral (classic macOS Graphite)

export interface AppSettings {
  theme: Theme
  volume: number // 0–1
  bufferSize: BufferSize
  accentColor: AccentColor
  apiMirror: string
  audioOutputDeviceId: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  volume: 0.8,
  bufferSize: 'balanced',
  accentColor: 'blue',
  apiMirror: 'https://de1.api.radio-browser.info',
  audioOutputDeviceId: null,
}
