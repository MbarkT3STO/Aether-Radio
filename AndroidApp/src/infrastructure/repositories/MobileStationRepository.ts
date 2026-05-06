/**
 * MobileStationRepository — wraps a single RadioBrowserApiClient and merges
 * results with custom stations. Equivalent to MultiSourceStationRepository
 * but without the Electron-specific multi-mirror failover (single API client).
 */
import type { IStationRepository } from '../../domain/repositories/IStationRepository'
import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'

export class MobileStationRepository implements IStationRepository {
  constructor(
    private apiClient: RadioBrowserApiClient,
    private readonly customStationsRepo: ICustomStationsRepository
  ) {}

  async search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]> {
    const [customResults, apiResults] = await Promise.all([
      this.searchCustomStations(query),
      this.apiClient.search(query, pagination),
    ])
    return this.mergeResults([customResults, apiResults], pagination.limit)
  }

  async getTopVoted(count: number): Promise<RadioStation[]> {
    return this.apiClient.getTopVoted(count)
  }

  async getTopClicked(count: number): Promise<RadioStation[]> {
    return this.apiClient.getTopClicked(count)
  }

  async getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const [customResults, apiResults] = await Promise.all([
      this.getCustomStationsByCountry(countryCode),
      this.apiClient.getByCountry(countryCode, pagination),
    ])
    return this.mergeResults([customResults, apiResults], pagination.limit)
  }

  async getByGenre(tag: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const [customResults, apiResults] = await Promise.all([
      this.getCustomStationsByGenre(tag),
      this.apiClient.getByTag(tag, pagination),
    ])
    return this.mergeResults([customResults, apiResults], pagination.limit)
  }

  async getById(id: string): Promise<RadioStation | null> {
    const customStations = await this.customStationsRepo.getAll()
    const custom = customStations.find(s => s.id === id)
    if (custom) return this.customStationsRepo.toRadioStation(custom)
    try {
      const results = await this.apiClient.search({ name: id }, { limit: 1, offset: 0 })
      return results[0] ?? null
    } catch {
      return null
    }
  }

  async getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>> {
    const [apiCountries, customStations] = await Promise.all([
      this.apiClient.getCountries(),
      this.customStationsRepo.getAll(),
    ])
    const customCounts = new Map<string, number>()
    customStations.forEach(s => {
      customCounts.set(s.countryCode, (customCounts.get(s.countryCode) ?? 0) + 1)
    })
    const merged = apiCountries.map(c => ({
      ...c,
      stationCount: c.stationCount + (customCounts.get(c.code) ?? 0),
    }))
    customCounts.forEach((count, code) => {
      if (!merged.find(c => c.code === code)) {
        const cs = customStations.find(s => s.countryCode === code)
        if (cs) merged.push({ name: cs.country, code, stationCount: count })
      }
    })
    return merged.sort((a, b) => b.stationCount - a.stationCount)
  }

  async getGenres(): Promise<Array<{ name: string; stationCount: number }>> {
    const [apiGenres, customStations] = await Promise.all([
      this.apiClient.getTags(),
      this.customStationsRepo.getAll(),
    ])
    const customCounts = new Map<string, number>()
    customStations.forEach(s => {
      if (s.genre) customCounts.set(s.genre, (customCounts.get(s.genre) ?? 0) + 1)
    })
    const merged = apiGenres.map(g => ({
      ...g,
      stationCount: g.stationCount + (customCounts.get(g.name) ?? 0),
    }))
    customCounts.forEach((count, name) => {
      if (!merged.find(g => g.name === name)) merged.push({ name, stationCount: count })
    })
    return merged.sort((a, b) => b.stationCount - a.stationCount).slice(0, 100)
  }

  async reportClick(stationId: string): Promise<void> {
    this.apiClient.reportClick(stationId)
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async searchCustomStations(query: SearchQueryDto): Promise<RadioStation[]> {
    const all = await this.customStationsRepo.getAll()
    let filtered = all
    if (query.name) {
      const term = query.name.toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      )
    }
    if (query.countryCode) filtered = filtered.filter(s => s.countryCode === query.countryCode)
    if (query.country) {
      filtered = filtered.filter(s =>
        s.country.toLowerCase().includes(query.country!.toLowerCase())
      )
    }
    return filtered.map(s => this.customStationsRepo.toRadioStation(s))
  }

  private async getCustomStationsByCountry(countryCode: string): Promise<RadioStation[]> {
    const all = await this.customStationsRepo.getAll()
    return all
      .filter(s => s.countryCode === countryCode)
      .map(s => this.customStationsRepo.toRadioStation(s))
  }

  private async getCustomStationsByGenre(genre: string): Promise<RadioStation[]> {
    const all = await this.customStationsRepo.getAll()
    return all
      .filter(s => s.genre?.toLowerCase() === genre.toLowerCase())
      .map(s => this.customStationsRepo.toRadioStation(s))
  }

  private mergeResults(groups: RadioStation[][], limit: number): RadioStation[] {
    const seen = new Set<string>()
    const merged: RadioStation[] = []
    for (const group of groups) {
      for (const station of group) {
        if (!seen.has(station.id)) {
          seen.add(station.id)
          merged.push(station)
        }
      }
    }
    return merged.slice(0, limit)
  }
}
