import type { RadioStation } from './RadioStation'

export interface Favorite {
  station: RadioStation
  addedAt: string // ISO date string
}
