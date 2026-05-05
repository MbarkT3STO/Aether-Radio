import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import type { PaginationDto } from '../../dtos/PaginationDto'
import { type Result, ok, err, appError } from '../../Result'

export class GetStationsByGenreUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(tag: string, pagination: PaginationDto): Promise<Result<RadioStation[]>> {
    try {
      const stations = await this.stationRepo.getByGenre(tag, pagination)
      return ok(stations)
    } catch (e) {
      return err(appError('GENRE_STATIONS_FAILED', 'Failed to get stations by genre', e))
    }
  }
}
