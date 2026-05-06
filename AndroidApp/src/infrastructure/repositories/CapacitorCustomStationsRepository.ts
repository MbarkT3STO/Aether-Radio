import { Preferences } from '@capacitor/preferences'
import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../domain/entities/CustomStation'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:custom-stations'

export class CapacitorCustomStationsRepository implements ICustomStationsRepository {
  async getAll(): Promise<CustomStation[]> {
    const { value } = await Preferences.get({ key: KEY })
    if (!value) return []
    try {
      return JSON.parse(value) as CustomStation[]
    } catch {
      return []
    }
  }

  async add(station: CustomStation): Promise<CustomStation> {
    const stations = await this.getAll()
    const exists = stations.some(s => s.id === station.id)
    if (exists) throw new Error('Station already exists')
    const newStation: CustomStation = {
      ...station,
      addedAt: new Date().toISOString(),
      source: 'custom',
    }
    stations.unshift(newStation)
    await Preferences.set({ key: KEY, value: JSON.stringify(stations) })
    return newStation
  }

  toRadioStation(customStation: CustomStation): RadioStation {
    return {
      id: customStation.id,
      name: customStation.name,
      url: customStation.url,
      urlResolved: customStation.url,
      homepage: '',
      favicon: customStation.favicon ?? '',
      country: customStation.country,
      countryCode: customStation.countryCode,
      state: '',
      language: '',
      tags: customStation.genre ? [customStation.genre] : [],
      codec: 'UNKNOWN',
      bitrate: 0,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      lastCheckOk: true,
      lastChangeTime: customStation.addedAt,
      hls: false,
    }
  }

  async remove(stationId: string): Promise<void> {
    const stations = await this.getAll()
    const filtered = stations.filter(s => s.id !== stationId)
    await Preferences.set({ key: KEY, value: JSON.stringify(filtered) })
  }

  async update(stationId: string, updates: Partial<CustomStation>): Promise<CustomStation> {
    const stations = await this.getAll()
    const idx = stations.findIndex(s => s.id === stationId)
    if (idx === -1) throw new Error(`Station ${stationId} not found`)
    stations[idx] = { ...stations[idx]!, ...updates }
    await Preferences.set({ key: KEY, value: JSON.stringify(stations) })
    return stations[idx]!
  }
}
