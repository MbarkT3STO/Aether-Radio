import type { ISettingsRepository } from '../../domain/repositories/ISettingsRepository'
import type { AppSettings } from '../../domain/entities/AppSettings'
import { DEFAULT_SETTINGS } from '../../domain/entities/AppSettings'

const KEY = 'aether:settings'

export class WebSettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      // Merge defaults so newly-introduced settings fall back to sensible values
      return { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const updated = { ...current, ...settings }
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  }
}
