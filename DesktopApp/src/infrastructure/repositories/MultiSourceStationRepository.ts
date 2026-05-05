import type { IStationRepository } from '../../domain/repositories/IStationRepository'
import type { ICustomStationsRepository } from '../../domain/repositories/ICustomStationsRepository'
import type { RadioStation } from '../../domain/entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'
import { RadioBrowserApiClient } from '../api/RadioBrowserApiClient'

export class MultiSourceStationRepository implements IStationRepository {
  private apiClients: RadioBrowserApiClient[]

  constructor(
    private readonly customStationsRepo: ICustomStationsRepository,
    apiBaseUrls: string[]
  ) {
    this.apiClients = apiBaseUrls.map(url => new RadioBrowserApiClient(url))
  }

  async search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]> {
    const results = await Promise.allSettled([
      // Search custom stations
      this.searchCustomStations(query),
      // Search all API sources
      ...this.apiClients.map(client => client.search(query, pagination))
    ])

    return this.mergeResults(results, pagination.limit)
  }

  async getTopVoted(count: number): Promise<RadioStation[]> {
    // Use first API client for top voted (they all have the same data)
    const apiResults = await this.apiClients[0]?.getTopVoted(count)
    return apiResults || []
  }

  async getTopClicked(count: number): Promise<RadioStation[]> {
    const apiResults = await this.apiClients[0]?.getTopClicked(count)
    return apiResults || []
  }

  async getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const results = await Promise.allSettled([
      // Get custom stations for this country
      this.getCustomStationsByCountry(countryCode),
      // Get from all API sources
      ...this.apiClients.map(client => client.getByCountry(countryCode, pagination))
    ])

    return this.mergeResults(results, pagination.limit)
  }

  async getByGenre(tag: string, pagination: PaginationDto): Promise<RadioStation[]> {
    const results = await Promise.allSettled([
      // Get custom stations for this genre
      this.getCustomStationsByGenre(tag),
      // Get from all API sources
      ...this.apiClients.map(client => client.getByTag(tag, pagination))
    ])

    return this.mergeResults(results, pagination.limit)
  }

  async getById(id: string): Promise<RadioStation | null> {
    // Check custom stations first
    const customStations = await this.customStationsRepo.getAll()
    const customStation = customStations.find(s => s.id === id)
    if (customStation) {
      return this.customStationsRepo.toRadioStation(customStation)
    }

    // Try API sources
    for (const client of this.apiClients) {
      try {
        const results = await client.search({ name: id }, { limit: 1, offset: 0 })
        if (results.length > 0) {
          return results[0] ?? null
        }
      } catch (error) {
        continue
      }
    }

    return null
  }

  async getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>> {
    // Use first API client (they all have the same country data)
    const apiCountries = await this.apiClients[0]?.getCountries() || []
    
    // Add custom stations count
    const customStations = await this.customStationsRepo.getAll()
    const customCountryCounts = new Map<string, number>()
    
    customStations.forEach(station => {
      const count = customCountryCounts.get(station.countryCode) || 0
      customCountryCounts.set(station.countryCode, count + 1)
    })

    // Merge counts
    const mergedCountries = apiCountries.map(country => ({
      ...country,
      stationCount: country.stationCount + (customCountryCounts.get(country.code) || 0)
    }))

    // Add countries that only exist in custom stations
    customCountryCounts.forEach((count, code) => {
      if (!mergedCountries.find(c => c.code === code)) {
        const customStation = customStations.find(s => s.countryCode === code)
        if (customStation) {
          mergedCountries.push({
            name: customStation.country,
            code: code,
            stationCount: count
          })
        }
      }
    })

    return mergedCountries.sort((a, b) => b.stationCount - a.stationCount)
  }

  async getGenres(): Promise<Array<{ name: string; stationCount: number }>> {
    const apiGenres = await this.apiClients[0]?.getTags() || []
    
    // Add custom stations genres
    const customStations = await this.customStationsRepo.getAll()
    const customGenreCounts = new Map<string, number>()
    
    customStations.forEach(station => {
      if (station.genre) {
        const count = customGenreCounts.get(station.genre) || 0
        customGenreCounts.set(station.genre, count + 1)
      }
    })

    // Merge counts
    const mergedGenres = apiGenres.map(genre => ({
      ...genre,
      stationCount: genre.stationCount + (customGenreCounts.get(genre.name) || 0)
    }))

    // Add genres that only exist in custom stations
    customGenreCounts.forEach((count, name) => {
      if (!mergedGenres.find(g => g.name === name)) {
        mergedGenres.push({ name, stationCount: count })
      }
    })

    return mergedGenres.sort((a, b) => b.stationCount - a.stationCount).slice(0, 100)
  }

  async reportClick(stationId: string): Promise<void> {
    // Try to report to all API clients (fire and forget)
    await Promise.allSettled(
      this.apiClients.map(client => client.reportClick(stationId))
    )
  }

  private async searchCustomStations(query: SearchQueryDto): Promise<RadioStation[]> {
    const customStations = await this.customStationsRepo.getAll()
    
    let filtered = customStations

    if (query.name) {
      const searchTerm = query.name.toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm) ||
        s.description?.toLowerCase().includes(searchTerm)
      )
    }

    if (query.countryCode) {
      filtered = filtered.filter(s => s.countryCode === query.countryCode)
    }

    if (query.country) {
      filtered = filtered.filter(s => 
        s.country.toLowerCase().includes(query.country!.toLowerCase())
      )
    }

    return filtered.map(s => this.customStationsRepo.toRadioStation(s))
  }

  private async getCustomStationsByCountry(countryCode: string): Promise<RadioStation[]> {
    const customStations = await this.customStationsRepo.getAll()
    return customStations
      .filter(s => s.countryCode === countryCode)
      .map(s => this.customStationsRepo.toRadioStation(s))
  }

  private async getCustomStationsByGenre(genre: string): Promise<RadioStation[]> {
    const customStations = await this.customStationsRepo.getAll()
    return customStations
      .filter(s => s.genre?.toLowerCase() === genre.toLowerCase())
      .map(s => this.customStationsRepo.toRadioStation(s))
  }

  private mergeResults(
    results: PromiseSettledResult<RadioStation[]>[],
    limit: number
  ): RadioStation[] {
    const allStations: RadioStation[] = []
    const seenIds = new Set<string>()

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(station => {
          if (!seenIds.has(station.id)) {
            seenIds.add(station.id)
            allStations.push(station)
          }
        })
      }
    })

    return allStations.slice(0, limit)
  }
}
