import type { ICustomStationsRepository } from '../../../domain/repositories/ICustomStationsRepository'
import { type Result, ok, err, appError } from '../../Result'

export class RemoveCustomStationUseCase {
  constructor(private readonly customStationsRepo: ICustomStationsRepository) {}

  async execute(stationId: string): Promise<Result<void>> {
    try {
      if (!stationId) {
        return err(appError('VALIDATION_ERROR', 'Station ID is required'))
      }

      await this.customStationsRepo.remove(stationId)
      return ok(undefined)
    } catch (error) {
      return err(appError('REMOVE_CUSTOM_STATION_FAILED', 'Failed to remove custom station', error))
    }
  }
}
