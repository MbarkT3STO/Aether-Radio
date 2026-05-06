import { Preferences } from '@capacitor/preferences'
import type { IHistoryRepository } from '../../domain/repositories/IHistoryRepository'
import type { PlayHistory } from '../../domain/entities/PlayHistory'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'history'
const MAX = 50

export class CapacitorHistoryRepository implements IHistoryRepository {
  async getAll(): Promise<PlayHistory[]> {
    const { value } = await Preferences.get({ key: KEY })
    return value ? (JSON.parse(value) as PlayHistory[]) : []
  }

  async add(station: RadioStation): Promise<PlayHistory> {
    const history = await this.getAll()
    const entry: PlayHistory = { station, playedAt: new Date().toISOString() }
    const filtered = history.filter(h => h.station.id !== station.id)
    filtered.unshift(entry)
    const trimmed = filtered.slice(0, MAX)
    await Preferences.set({ key: KEY, value: JSON.stringify(trimmed) })
    return entry
  }

  async clear(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify([]) })
  }
}
