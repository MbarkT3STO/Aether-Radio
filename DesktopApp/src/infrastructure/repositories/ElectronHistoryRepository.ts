import type { IHistoryRepository } from '../../domain/repositories/IHistoryRepository'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type Store from 'electron-store'

const MAX_HISTORY_ITEMS = 50

interface StoreSchema {
  history: PlayHistory[]
}

export class ElectronHistoryRepository implements IHistoryRepository {
  constructor(private readonly store: Store<StoreSchema>) {}

  async getAll(): Promise<PlayHistory[]> {
    return this.store.get('history', [])
  }

  async add(station: RadioStation): Promise<PlayHistory> {
    const history = await this.getAll()
    
    const playHistory: PlayHistory = {
      station,
      playedAt: new Date().toISOString()
    }

    // Remove duplicates of the same station
    const filtered = history.filter(h => h.station.id !== station.id)
    
    // Add to beginning
    filtered.unshift(playHistory)
    
    // Keep only last 50
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS)
    
    this.store.set('history', trimmed)
    return playHistory
  }

  async clear(): Promise<void> {
    this.store.set('history', [])
  }
}
