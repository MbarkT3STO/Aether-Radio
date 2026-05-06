export type StationSourceType = 'radio-browser' | 'custom' | 'community'

export interface StationSource {
  id: string
  name: string
  type: StationSourceType
  baseUrl?: string
  enabled: boolean
  priority: number // Lower number = higher priority
}

export const DEFAULT_SOURCES: StationSource[] = [
  {
    id: 'radio-browser-de1',
    name: 'Radio Browser (Germany)',
    type: 'radio-browser',
    baseUrl: 'https://de1.api.radio-browser.info',
    enabled: true,
    priority: 1
  },
  {
    id: 'radio-browser-nl1',
    name: 'Radio Browser (Netherlands)',
    type: 'radio-browser',
    baseUrl: 'https://nl1.api.radio-browser.info',
    enabled: true,
    priority: 2
  },
  {
    id: 'radio-browser-at1',
    name: 'Radio Browser (Austria)',
    type: 'radio-browser',
    baseUrl: 'https://at1.api.radio-browser.info',
    enabled: true,
    priority: 3
  },
  {
    id: 'custom',
    name: 'Custom Stations',
    type: 'custom',
    enabled: true,
    priority: 10
  }
]
