import type { ISettingsRepository } from '../../domain/repositories/ISettingsRepository'
import type { AppSettings } from '../../domain/entities/AppSettings'
import { DEFAULT_SETTINGS } from '../../domain/entities/AppSettings'
import type Store from 'electron-store'

interface StoreSchema {
  settings: AppSettings
}

export class ElectronSettingsRepository implements ISettingsRepository {
  constructor(private readonly store: Store<StoreSchema>) {}

  async get(): Promise<AppSettings> {
    return this.store.get('settings', DEFAULT_SETTINGS)
  }

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const updated = { ...current, ...settings }
    this.store.set('settings', updated)
    return updated
  }
}
