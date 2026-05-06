export interface CustomStation {
  id: string
  name: string
  url: string
  country: string
  countryCode: string
  genre: string
  description?: string
  favicon?: string
  addedAt: string
  source: 'custom'
}
