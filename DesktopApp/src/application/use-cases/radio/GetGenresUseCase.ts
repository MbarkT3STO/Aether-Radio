import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { Genre } from '../../../domain/value-objects/Genre'
import { type Result, ok, err, appError } from '../../Result'

export class GetGenresUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(): Promise<Result<Genre[]>> {
    try {
      const genres = await this.stationRepo.getGenres()
      return ok(genres)
    } catch (e) {
      return err(appError('GET_GENRES_FAILED', 'Failed to get genres', e))
    }
  }
}
