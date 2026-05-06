import type { AppSettings } from '../entities/AppSettings'

export interface ISettingsRepository {
  get(): Promise<AppSettings>
  update(settings: Partial<AppSettings>): Promise<AppSettings>
}
