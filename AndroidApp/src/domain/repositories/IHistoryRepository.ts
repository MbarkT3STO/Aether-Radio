import type { PlayHistory } from '../entities/PlayHistory'
import type { RadioStation } from '../entities/RadioStation'

export interface IHistoryRepository {
  getAll(): Promise<PlayHistory[]>
  add(station: RadioStation): Promise<PlayHistory>
  clear(): Promise<void>
}
