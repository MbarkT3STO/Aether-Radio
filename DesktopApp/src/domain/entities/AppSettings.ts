export type Theme = 'dark' | 'light'
export type BufferSize = 'low' | 'balanced' | 'high'
export type StreamQuality = 'low' | 'balanced' | 'high'
export type EqualizerPreset = 'flat' | 'rock' | 'jazz' | 'vocal' | 'bass-boost' | 'treble-boost' | 'electronic' | 'custom'

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

export interface EqualizerBands {
  /** 60Hz */  bass: number
  /** 250Hz */ lowMid: number
  /** 1kHz */  mid: number
  /** 4kHz */  highMid: number
  /** 12kHz */ treble: number
}

export interface AppSettings {
  theme: Theme
  volume: number // 0–1
  bufferSize: BufferSize
  accentColor: AccentColor
  apiMirror: string
  audioOutputDeviceId: string | null
  equalizerPreset: EqualizerPreset
  equalizerBands: EqualizerBands
  crossfadeDuration: number // seconds (0 = disabled)
  showBufferHealth: boolean
}

export const DEFAULT_EQUALIZER_BANDS: EqualizerBands = {
  bass: 0,
  lowMid: 0,
  mid: 0,
  highMid: 0,
  treble: 0,
}

export const EQUALIZER_PRESETS: Record<EqualizerPreset, EqualizerBands> = {
  'flat':          { bass: 0,  lowMid: 0,  mid: 0,  highMid: 0,  treble: 0  },
  'rock':          { bass: 5,  lowMid: 3,  mid: -1, highMid: 3,  treble: 5  },
  'jazz':          { bass: 3,  lowMid: 1,  mid: 2,  highMid: 4,  treble: 3  },
  'vocal':         { bass: -2, lowMid: 0,  mid: 4,  highMid: 3,  treble: 1  },
  'bass-boost':    { bass: 7,  lowMid: 5,  mid: 0,  highMid: 0,  treble: 0  },
  'treble-boost':  { bass: 0,  lowMid: 0,  mid: 0,  highMid: 4,  treble: 7  },
  'electronic':    { bass: 5,  lowMid: 3,  mid: 0,  highMid: 2,  treble: 5  },
  'custom':        { bass: 0,  lowMid: 0,  mid: 0,  highMid: 0,  treble: 0  },
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  volume: 0.8,
  bufferSize: 'balanced',
  accentColor: 'blue',
  apiMirror: 'https://de1.api.radio-browser.info',
  audioOutputDeviceId: null,
  equalizerPreset: 'flat',
  equalizerBands: { ...DEFAULT_EQUALIZER_BANDS },
  crossfadeDuration: 0,
  showBufferHealth: false,
}
