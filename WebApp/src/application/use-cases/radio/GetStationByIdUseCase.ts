import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import { type Result, ok, err, appError } from '../../Result'

export class GetStationByIdUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(id: string): Promise<Result<RadioStation | null>> {
    try {
      const station = await this.stationRepo.getById(id)
      return ok(station)
    } catch (e) {
      return err(appError('GET_STATION_FAILED', 'Failed to get station by ID', e))
    }
  }
}
