import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'

export class RadioBrowserEndpoints {
  constructor(private readonly baseUrl: string) {}

  search(query: SearchQueryDto, pagination: PaginationDto): string {
    const params = new URLSearchParams()
    
    if (query.name) params.append('name', query.name)
    if (query.country) params.append('country', query.country)
    if (query.countryCode) params.append('countrycode', query.countryCode)
    if (query.tag) params.append('tag', query.tag)
    if (query.bitrateMin !== undefined) params.append('bitrateMin', String(query.bitrateMin))
    if (query.bitrateMax !== undefined) params.append('bitrateMax', String(query.bitrateMax))
    if (query.codec) params.append('codec', query.codec)
    if (query.order) params.append('order', query.order)
    if (query.reverse !== undefined) params.append('reverse', String(query.reverse))
    
    params.append('limit', String(pagination.limit))
    params.append('offset', String(pagination.offset))
    params.append('hidebroken', 'true')
    
    return `${this.baseUrl}/json/stations/search?${params.toString()}`
  }

  topVoted(count: number): string {
    return `${this.baseUrl}/json/stations/topvote/${count}`
  }

  topClicked(count: number): string {
    return `${this.baseUrl}/json/stations/topclick/${count}`
  }

  byCountry(countryCode: string, pagination: PaginationDto): string {
    const params = new URLSearchParams()
    params.append('limit', String(pagination.limit))
    params.append('offset', String(pagination.offset))
    params.append('hidebroken', 'true')
    return `${this.baseUrl}/json/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?${params.toString()}`
  }

  byTag(tag: string, pagination: PaginationDto): string {
    const params = new URLSearchParams()
    params.append('limit', String(pagination.limit))
    params.append('offset', String(pagination.offset))
    params.append('hidebroken', 'true')
    return `${this.baseUrl}/json/stations/bytagexact/${encodeURIComponent(tag)}?${params.toString()}`
  }

  countries(): string {
    return `${this.baseUrl}/json/countries`
  }

  tags(): string {
    return `${this.baseUrl}/json/tags?hidebroken=true`
  }

  reportClick(stationUuid: string): string {
    return `${this.baseUrl}/json/url/${stationUuid}`
  }
}
