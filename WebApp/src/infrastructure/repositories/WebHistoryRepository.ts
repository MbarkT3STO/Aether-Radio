import type { IHistoryRepository } from '../../domain/repositories/IHistoryRepository'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:history'
const MAX_HISTORY_ITEMS = 50

export class WebHistoryRepository implements IHistoryRepository {
  async getAll(): Promise<PlayHistory[]> {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as PlayHistory[]) : []
    } catch {
      return []
    }
  }

  async add(station: RadioStation): Promise<PlayHistory> {
    const history = await this.getAll()

    const playHistory: PlayHistory = {
      station,
      playedAt: new Date().toISOString(),
    }

    // Remove duplicates of the same station, add to front, cap at MAX
    const filtered = history.filter(h => h.station.id !== station.id)
    filtered.unshift(playHistory)
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS)

    localStorage.setItem(KEY, JSON.stringify(trimmed))
    return playHistory
  }

  async clear(): Promise<void> {
    localStorage.removeItem(KEY)
  }
}
