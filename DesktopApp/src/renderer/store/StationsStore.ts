import type { RadioStation } from '../../domain/entities/RadioStation'
import { EventBus } from './EventBus'

export class StationsStore {
  private static instance: StationsStore
  private eventBus = EventBus.getInstance()

  private _stations: RadioStation[] = []
  private _total = 0

  private constructor() {}

  static getInstance(): StationsStore {
    if (!StationsStore.instance) {
      StationsStore.instance = new StationsStore()
    }
    return StationsStore.instance
  }

  get stations(): RadioStation[] {
    return this._stations
  }

  get total(): number {
    return this._total
  }

  setStations(stations: RadioStation[], total?: number): void {
    this._stations = stations
    this._total = total ?? stations.length
    this.eventBus.emit('stations:loaded', { stations, total: this._total })
  }

  appendStations(stations: RadioStation[]): void {
    this._stations = [...this._stations, ...stations]
    this.eventBus.emit('stations:loaded', { stations: this._stations, total: this._total })
  }

  clear(): void {
    this._stations = []
    this._total = 0
    this.eventBus.emit('stations:loaded', { stations: [], total: 0 })
  }
}
