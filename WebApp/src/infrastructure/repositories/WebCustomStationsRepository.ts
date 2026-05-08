import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../domain/entities/CustomStation'
import type { RadioStation } from '../../domain/entities/RadioStation'

const KEY = 'aether:custom-stations'

export class WebCustomStationsRepository implements ICustomStationsRepository {
  async getAll(): Promise<CustomStation[]> {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as CustomStation[]) : []
    } catch {
      return []
    }
  }

  async add(station: CustomStation): Promise<CustomStation> {
    const stations = await this.getAll()
    if (stations.some(s => s.id === station.id)) {
      throw new Error('Station already exists')
    }
    const newStation: CustomStation = {
      ...station,
      addedAt: new Date().toISOString(),
      source: 'custom',
    }
    stations.push(newStation)
    localStorage.setItem(KEY, JSON.stringify(stations))
    return newStation
  }

  async remove(stationId: string): Promise<void> {
    const stations = await this.getAll()
    const filtered = stations.filter(s => s.id !== stationId)
    localStorage.setItem(KEY, JSON.stringify(filtered))
  }

  async update(stationId: string, updates: Partial<CustomStation>): Promise<CustomStation> {
    const stations = await this.getAll()
    const index = stations.findIndex(s => s.id === stationId)
    if (index === -1) throw new Error('Station not found')
    const merged = { ...stations[index], ...updates } as CustomStation
    stations[index] = merged
    localStorage.setItem(KEY, JSON.stringify(stations))
    return merged
  }

  toRadioStation(customStation: CustomStation): RadioStation {
    return {
      id: customStation.id,
      name: customStation.name,
      url: customStation.url,
      urlResolved: customStation.url,
      homepage: '',
      favicon: customStation.favicon || '',
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
}
