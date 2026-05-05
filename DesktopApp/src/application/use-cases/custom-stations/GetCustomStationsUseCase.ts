import type { ICustomStationsRepository } from '../../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../../domain/entities/CustomStation'
import { type Result, ok, err, appError } from '../../Result'

export class GetCustomStationsUseCase {
  constructor(private readonly customStationsRepo: ICustomStationsRepository) {}

  async execute(): Promise<Result<CustomStation[]>> {
    try {
      const stations = await this.customStationsRepo.getAll()
      return ok(stations)
    } catch (error) {
      return err(appError('GET_CUSTOM_STATIONS_FAILED', 'Failed to get custom stations', error))
    }
  }
}
