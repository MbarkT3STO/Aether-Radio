import type { RadioStation } from '../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import { RadioBrowserEndpoints } from './RadioBrowserEndpoints'
import { RadioBrowserMapper } from './RadioBrowserMapper'

const USER_AGENT = 'AetherRadio/1.0.0'
const RETRY_DELAY_MS = 1000

// ── Simple TTL cache ──────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }
}

// Shared cache across all client instances (process-level singleton)
const cache = new TtlCache()

const TTL = {
  STATIONS: 5 * 60 * 1000,   // 5 minutes — station lists
  COUNTRIES: 60 * 60 * 1000, // 1 hour    — country list
  TAGS: 60 * 60 * 1000,      // 1 hour    — genre/tag list
}

// ── Client ────────────────────────────────────────────────────────────────────

export class RadioBrowserApiClient {
  private endpoints: RadioBrowserEndpoints

  constructor(baseUrl: string) {
    this.endpoints = new RadioBrowserEndpoints(baseUrl)
  }

  async search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.search(query, pagination)
    const cached = cache.get<RadioStation[]>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<unknown[]>(url)
    const result = RadioBrowserMapper.toDomainArray(data as never[])
    cache.set(url, result, TTL.STATIONS)
    return result
  }

  async getTopVoted(count: number): Promise<RadioStation[]> {
    const url = this.endpoints.topVoted(count)
    const cached = cache.get<RadioStation[]>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<unknown[]>(url)
    const result = RadioBrowserMapper.toDomainArray(data as never[])
    cache.set(url, result, TTL.STATIONS)
    return result
  }

  async getTopClicked(count: number): Promise<RadioStation[]> {
    const url = this.endpoints.topClicked(count)
    const cached = cache.get<RadioStation[]>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<unknown[]>(url)
    const result = RadioBrowserMapper.toDomainArray(data as never[])
    cache.set(url, result, TTL.STATIONS)
    return result
  }

  async getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.byCountry(countryCode, pagination)
    const cached = cache.get<RadioStation[]>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<unknown[]>(url)
    const result = RadioBrowserMapper.toDomainArray(data as never[])
    cache.set(url, result, TTL.STATIONS)
    return result
  }

  async getByTag(tag: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const url = this.endpoints.byTag(tag, pagination)
    const cached = cache.get<RadioStation[]>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<unknown[]>(url)
    const result = RadioBrowserMapper.toDomainArray(data as never[])
    cache.set(url, result, TTL.STATIONS)
    return result
  }

  async getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>> {
    const url = this.endpoints.countries()
    const cached = cache.get<Array<{ name: string; code: string; stationCount: number }>>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<Array<{ name: string; stationcount: number; iso_3166_1: string }>>(url)
    const result = data
      .filter(c => c.stationcount > 0)
      .map(c => ({
        name: c.name,
        code: c.iso_3166_1,
        stationCount: c.stationcount
      }))
      .sort((a, b) => b.stationCount - a.stationCount)
    cache.set(url, result, TTL.COUNTRIES)
    return result
  }

  async getTags(): Promise<Array<{ name: string; stationCount: number }>> {
    const url = this.endpoints.tags()
    const cached = cache.get<Array<{ name: string; stationCount: number }>>(url)
    if (cached) return cached
    const data = await this.fetchWithRetry<Array<{ name: string; stationcount: number }>>(url)
    const result = data
      .filter(t => t.stationcount > 0)
      .map(t => ({
        name: t.name,
        stationCount: t.stationcount
      }))
      .sort((a, b) => b.stationCount - a.stationCount)
      .slice(0, 100)
    cache.set(url, result, TTL.TAGS)
    return result
  }

  async reportClick(stationUuid: string): Promise<void> {
    const url = this.endpoints.reportClick(stationUuid)
    // Fire-and-forget — don't await, don't retry
    fetch(url, { method: 'POST', headers: { 'User-Agent': USER_AGENT } }).catch(() => {/* ignore */})
  }

  private async fetchWithRetry<T>(url: string, options: RequestInit = {}, attempt = 0): Promise<T> {
    const headers = { 'User-Agent': USER_AGENT, ...options.headers }
    try {
      const response = await fetch(url, { ...options, headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      return await response.json() as T
    } catch (error) {
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
        return this.fetchWithRetry<T>(url, options, attempt + 1)
      }
      throw error
    }
  }
}
