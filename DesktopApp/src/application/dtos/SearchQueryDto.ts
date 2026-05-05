export interface SearchQueryDto {
  name?: string
  country?: string
  countryCode?: string
  tag?: string
  bitrateMin?: number
  bitrateMax?: number
  codec?: string
  order?: 'name' | 'votes' | 'clickcount' | 'bitrate' | 'random'
  reverse?: boolean
}
