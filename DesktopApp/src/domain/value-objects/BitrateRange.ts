export interface BitrateRange {
  min: number
  max: number
}

export const BITRATE_PRESETS: Record<string, BitrateRange> = {
  low: { min: 0, max: 64 },
  medium: { min: 64, max: 128 },
  high: { min: 128, max: 320 },
  lossless: { min: 320, max: 9999 }
}
