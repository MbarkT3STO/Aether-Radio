export interface RadioStation {
  id: string
  name: string
  url: string
  urlResolved: string
  homepage: string
  favicon: string
  country: string
  countryCode: string
  state: string
  language: string
  tags: string[]
  codec: string
  bitrate: number
  votes: number
  clickCount: number
  clickTrend: number
  lastCheckOk: boolean
  lastChangeTime: string
  hls: boolean
}
