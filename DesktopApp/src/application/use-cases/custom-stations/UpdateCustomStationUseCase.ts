import type { ICustomStationsRepository } from '../../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../../domain/entities/CustomStation'
import { type Result, ok, err, appError } from '../../Result'

export class UpdateCustomStationUseCase {
  constructor(private readonly customStationsRepo: ICustomStationsRepository) {}

  async execute(stationId: string, updates: Partial<CustomStation>): Promise<Result<CustomStation>> {
    try {
      if (!stationId) {
        return err(appError('VALIDATION_ERROR', 'Station ID is required'))
      }

      // Don't allow changing id, addedAt, or source
      const { id, addedAt, source, ...allowedUpdates } = updates

      const updated = await this.customStationsRepo.update(stationId, allowedUpdates)
      return ok(updated)
    } catch (error) {
      return err(appError('UPDATE_CUSTOM_STATION_FAILED', 'Failed to update custom station', error))
    }
  }
}
