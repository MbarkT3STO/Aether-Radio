import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../dtos/SearchQueryDto'
import type { PaginationDto } from '../../dtos/PaginationDto'
import { type Result, ok, err, appError } from '../../Result'

export class SearchStationsUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(
    query: SearchQueryDto,
    pagination: PaginationDto
  ): Promise<Result<RadioStation[]>> {
    try {
      const stations = await this.stationRepo.search(query, pagination)
      return ok(stations)
    } catch (e) {
      return err(appError('SEARCH_FAILED', 'Failed to search stations', e))
    }
  }
}
