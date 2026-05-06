import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository'
import type { AppSettings } from '../../../domain/entities/AppSettings'
import { type Result, ok, err, appError } from '../../Result'

export class UpdateSettingsUseCase {
  constructor(private readonly settingsRepo: ISettingsRepository) {}

  async execute(settings: Partial<AppSettings>): Promise<Result<AppSettings>> {
    try {
      const updated = await this.settingsRepo.update(settings)
      return ok(updated)
    } catch (e) {
      return err(appError('UPDATE_SETTINGS_FAILED', 'Failed to update settings', e))
    }
  }
}
