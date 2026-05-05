import type { RadioStation } from '../entities/RadioStation'
import type { SearchQueryDto } from '../../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../../application/dtos/PaginationDto'

export interface IStationRepository {
  search(query: SearchQueryDto, pagination: PaginationDto): Promise<RadioStation[]>
  getTopVoted(count: number): Promise<RadioStation[]>
  getTopClicked(count: number): Promise<RadioStation[]>
  getByCountry(countryCode: string, pagination: PaginationDto): Promise<RadioStation[]>
  getByGenre(tag: string, pagination: PaginationDto): Promise<RadioStation[]>
  getById(id: string): Promise<RadioStation | null>
  getCountries(): Promise<Array<{ name: string; code: string; stationCount: number }>>
  getGenres(): Promise<Array<{ name: string; stationCount: number }>>
  reportClick(stationId: string): Promise<void>
}
