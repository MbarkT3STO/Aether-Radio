import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../domain/entities/CustomStation'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type Store from 'electron-store'

interface StoreSchema {
  customStations: CustomStation[]
}

export class ElectronCustomStationsRepository implements ICustomStationsRepository {
  constructor(private readonly store: Store<StoreSchema>) {}

  async getAll(): Promise<CustomStation[]> {
    return this.store.get('customStations', [])
  }

  async add(station: CustomStation): Promise<CustomStation> {
    const stations = await this.getAll()
    
    // Check if already exists
    const exists = stations.some(s => s.id === station.id)
    if (exists) {
      throw new Error('Station already exists')
    }

    const newStation: CustomStation = {
      ...station,
      addedAt: new Date().toISOString(),
      source: 'custom'
    }

    stations.push(newStation)
    this.store.set('customStations', stations)
    return newStation
  }

  async remove(stationId: string): Promise<void> {
    const stations = await this.getAll()
    const filtered = stations.filter(s => s.id !== stationId)
    this.store.set('customStations', filtered)
  }

  async update(stationId: string, updates: Partial<CustomStation>): Promise<CustomStation> {
    const stations = await this.getAll()
    const index = stations.findIndex(s => s.id === stationId)
    
    if (index === -1) {
      throw new Error('Station not found')
    }

    const updated = { ...stations[index], ...updates }
    stations[index] = updated
    this.store.set('customStations', stations)
    return updated
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
      hls: false
    }
  }
}
