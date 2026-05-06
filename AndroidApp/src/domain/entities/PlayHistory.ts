import type { RadioStation } from './RadioStation'

export interface PlayHistory {
  station: RadioStation
  playedAt: string // ISO date string
}
