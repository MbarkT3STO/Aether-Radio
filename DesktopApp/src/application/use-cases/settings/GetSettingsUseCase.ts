import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository'
import type { AppSettings } from '../../../domain/entities/AppSettings'
import { type Result, ok, err, appError } from '../../Result'

export class GetSettingsUseCase {
  constructor(private readonly settingsRepo: ISettingsRepository) {}

  async execute(): Promise<Result<AppSettings>> {
    try {
      const settings = await this.settingsRepo.get()
      return ok(settings)
    } catch (e) {
      return err(appError('GET_SETTINGS_FAILED', 'Failed to get settings', e))
    }
  }
}
