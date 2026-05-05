import type { ICustomStationsRepository } from '../../../domain/repositories/ICustomStationsRepository'
import type { CustomStation } from '../../../domain/entities/CustomStation'
import { type Result, ok, err, appError } from '../../Result'

export class AddCustomStationUseCase {
  constructor(private readonly customStationsRepo: ICustomStationsRepository) {}

  async execute(station: Omit<CustomStation, 'addedAt' | 'source'>): Promise<Result<CustomStation>> {
    try {
      // Validate required fields
      if (!station.id || !station.name || !station.url) {
        return err(appError('VALIDATION_ERROR', 'Station ID, name, and URL are required'))
      }

      if (!station.countryCode || !station.country) {
        return err(appError('VALIDATION_ERROR', 'Country code and country name are required'))
      }

      // Create full station object
      const fullStation: CustomStation = {
        ...station,
        addedAt: new Date().toISOString(),
        source: 'custom'
      }

      const added = await this.customStationsRepo.add(fullStation)
      return ok(added)
    } catch (error) {
      return err(appError('ADD_CUSTOM_STATION_FAILED', 'Failed to add custom station', error))
    }
  }
}
