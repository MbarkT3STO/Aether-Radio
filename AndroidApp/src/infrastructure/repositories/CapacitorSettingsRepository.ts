import { Preferences } from '@capacitor/preferences'
import type { ISettingsRepository } from '../../domain/repositories/ISettingsRepository'
import type { AppSettings } from '../../domain/entities/AppSettings'
import { DEFAULT_SETTINGS } from '../../domain/entities/AppSettings'

const KEY = 'settings'

export class CapacitorSettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    const { value } = await Preferences.get({ key: KEY })
    return value ? { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<AppSettings>) } : DEFAULT_SETTINGS
  }

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const updated = { ...current, ...settings }
    await Preferences.set({ key: KEY, value: JSON.stringify(updated) })
    return updated
  }
}
