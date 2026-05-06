import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import { type Result, ok, err, appError } from '../../Result'

export class GetTopStationsUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(count = 50): Promise<Result<RadioStation[]>> {
    try {
      const stations = await this.stationRepo.getTopVoted(count)
      return ok(stations)
    } catch (e) {
      return err(appError('TOP_STATIONS_FAILED', 'Failed to get top stations', e))
    }
  }
}
