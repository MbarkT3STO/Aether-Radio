import type { RadioStation } from '../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import { RadioBrowserEndpoints } from './RadioBrowserEndpoints'
import { RadioBrowserMapper } from './RadioBrowserMapper'

const USER_AGENT = 'AetherRadio/1.0.0'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class RadioBrowserApiClient {
  private endpoints: RadioBrowserEndpoints

  constructor(baseUrl: string) {
    this.endpoints = new RadioBrowserEndpoints(baseUrl)
  }

  async search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.search(query, pagination)
    const data = await this.fetchWithRetry<unknown[]>(url)
    return RadioBrowserMapper.toDomainArray(data as never[])
  }

  async getTopVoted(count: number): Promise<RadioStation[]> {
    const url = this.endpoints.topVoted(count)
    const data = await this.fetchWithRetry<unknown[]>(url)
    return RadioBrowserMapper.toDomainArray(data as never[])
  }

  async getTopClicked(count: number): Promise<RadioStation[]> {
    const url = this.endpoints.topClicked(count)
    const data = await this.fetchWithRetry<unknown[]>(url)
    return RadioBrowserMapper.toDomainArray(data as never[])
  }

  async getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.byCountry(countryCode, pagination)
    const data = await this.fetchWithRetry<unknown[]>(url)
    return RadioBrowserMapper.toDomainArray(data as never[])
  }

  async getByTag(tag: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.byTag(tag, pagination)
    const data = await this.fetchWithRetry<unknown[]>(url)
    return RadioBrowserMapper.toDomainArray(data as never[])
  }

  async getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>> {
    const url = this.endpoints.countries()
    const data = await this.fetchWithRetry<Array<{ name: string; stationcount: number; iso_3166_1: string }>>(url)
    return data
      .filter(c => c.stationcount > 0)
      .map(c => ({
        name: c.name,
        code: c.iso_3166_1,
        stationCount: c.stationcount
      }))
      .sort((a, b) => b.stationCount - a.stationCount)
  }

  async getTags(): Promise<Array<{ name: string; stationCount: number }>> {
    const url = this.endpoints.tags()
    const data = await this.fetchWithRetry<Array<{ name: string; stationcount: number }>>(url)
    return data
      .filter(t => t.stationcount > 0)
      .map(t => ({
        name: t.name,
        stationCount: t.stationcount
      }))
      .sort((a, b) => b.stationCount - a.stationCount)
      .slice(0, 100) // Top 100 genres
  }

  async reportClick(stationUuid: string): Promise<void> {
    const url = this.endpoints.reportClick(stationUuid)
    await this.fetchWithRetry(url, { method: 'POST' })
  }

  private async fetchWithRetry<T>(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<T> {
    const headers = {
      'User-Agent': USER_AGENT,
      ...options.headers
    }

    try {
      const response = await fetch(url, { ...options, headers })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json() as T
    } catch (error) {
      if (retries > 0) {
        await this.delay(RETRY_DELAY_MS * (MAX_RETRIES - retries + 1))
        return this.fetchWithRetry<T>(url, options, retries - 1)
      }
      throw error
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
