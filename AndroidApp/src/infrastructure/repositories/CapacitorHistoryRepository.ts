import { Preferences } from '@capacitor/preferences'
import type { IHistoryRepository } from '../../domain/repositories/IHistoryRepository'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:history'
const MAX_HISTORY_ITEMS = 50

export class CapacitorHistoryRepository implements IHistoryRepository {
  async getAll(): Promise<PlayHistory[]> {
    const { value } = await Preferences.get({ key: KEY })
    if (!value) return []
    try {
      return JSON.parse(value) as PlayHistory[]
    } catch {
      return []
    }
  }

  async add(station: RadioStation): Promise<PlayHistory> {
    const history = await this.getAll()
    const entry: PlayHistory = {
      station,
      playedAt: new Date().toISOString(),
    }
    // Remove duplicate of same station, add to front, trim to max
    const filtered = history.filter(h => h.station.id !== station.id)
    filtered.unshift(entry)
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS)
    await Preferences.set({ key: KEY, value: JSON.stringify(trimmed) })
    return entry
  }

  async clear(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify([]) })
  }
}
