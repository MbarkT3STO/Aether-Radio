import type { CustomStation } from '../entities/CustomStation'
import type { RadioStation } from '../entities/RadioStation'

export interface ICustomStationsRepository {
  getAll(): Promise<CustomStation[]>
  add(station: CustomStation): Promise<CustomStation>
  remove(stationId: string): Promise<void>
  update(stationId: string, updates: Partial<CustomStation>): Promise<CustomStation>
  toRadioStation(customStation: CustomStation): RadioStation
}
