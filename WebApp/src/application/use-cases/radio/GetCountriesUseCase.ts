import type { IStationRepository } from '../../../domain/repositories/IStationRepository'
import type { Country } from '../../../domain/value-objects/Country'
import { type Result, ok, err, appError } from '../../Result'

export class GetCountriesUseCase {
  constructor(private readonly stationRepo: IStationRepository) {}

  async execute(): Promise<Result<Country[]>> {
    try {
      const countries = await this.stationRepo.getCountries()
      return ok(countries)
    } catch (e) {
      return err(appError('GET_COUNTRIES_FAILED', 'Failed to get countries', e))
    }
  }
}
