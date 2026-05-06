export type Theme = 'dark' | 'light'
export type BufferSize = 'low' | 'balanced' | 'high'

export interface AppSettings {
  theme: Theme
  volume: number // 0–1
  bufferSize: BufferSize
  apiMirror: string
  audioOutputDeviceId: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  volume: 0.8,
  bufferSize: 'balanced',
  apiMirror: 'https://de1.api.radio-browser.info',
  audioOutputDeviceId: null,
}
