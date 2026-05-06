import { Preferences } from '@capacitor/preferences'
import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../domain/entities/CustomStation'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'customStations'

export class CapacitorCustomStationsRepository implements ICustomStationsRepository {
  async getAll(): Promise<CustomStation[]> {
    const { value } = await Preferences.get({ key: KEY })
    return value ? (JSON.parse(value) as CustomStation[]) : []
  }

  async add(station: CustomStation): Promise<CustomStation> {
    const stations = await this.getAll()
    if (stations.some(s => s.id === station.id)) throw new Error('Station already exists')
    const newStation: CustomStation = { ...station, addedAt: new Date().toISOString(), source: 'custom' }
    stations.push(newStation)
    await Preferences.set({ key: KEY, value: JSON.stringify(stations) })
    return newStation
  }

  async remove(stationId: string): Promise<void> {
    const stations = await this.getAll()
    await Preferences.set({ key: KEY, value: JSON.stringify(stations.filter(s => s.id !== stationId)) })
  }

  async update(stationId: string, updates: Partial<CustomStation>): Promise<CustomStation> {
    const stations = await this.getAll()
    const idx = stations.findIndex(s => s.id === stationId)
    if (idx === -1) throw new Error('Station not found')
    stations[idx] = { ...stations[idx]!, ...updates } as CustomStation
    await Preferences.set({ key: KEY, value: JSON.stringify(stations) })
    return stations[idx]!
  }

  toRadioStation(s: CustomStation): RadioStation {
    return {
      id: s.id, name: s.name, url: s.url, urlResolved: s.url,
      homepage: '', favicon: s.favicon || '', country: s.country,
      countryCode: s.countryCode, state: '', language: '',
      tags: s.genre ? [s.genre] : [], codec: '', bitrate: 0,
      votes: 0, clickCount: 0, clickTrend: 0,
      lastCheckOk: true, lastChangeTime: s.addedAt, hls: false
    }
  }
}
