import type { IStationRepository } from '../../domain/repositories/IStationRepository'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'

export class ElectronStationRepository implements IStationRepository {
  constructor(private readonly apiClient: RadioBrowserApiClient) {}

  async search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]> {
    return this.apiClient.search(query, pagination)
  }

  async getTopVoted(count: number): Promise<RadioStation[]> {
    return this.apiClient.getTopVoted(count)
  }

  async getTopClicked(count: number): Promise<RadioStation[]> {
    return this.apiClient.getTopClicked(count)
  }

  async getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]> {
    return this.apiClient.getByCountry(countryCode, pagination)
  }

  async getByGenre(tag: string, pagination: PaginationDto): Promise<RadioStation[]> {
    return this.apiClient.getByTag(tag, pagination)
  }

  async getById(id: string): Promise<RadioStation | null> {
    // Radio Browser API doesn't have a direct "get by ID" endpoint
    // We search by UUID in the name field as a workaround
    const results = await this.apiClient.search({ name: id }, { limit: 1, offset: 0 })
    return results[0] ?? null
  }

  async getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>> {
    return this.apiClient.getCountries()
  }

  async getGenres(): Promise<Array<{ name: string; stationCount: number }>> {
    return this.apiClient.getTags()
  }

  async reportClick(stationId: string): Promise<void> {
    await this.apiClient.reportClick(stationId)
  }
}
