import type { RadioStation } from '../../domain/entities/RadioStation'

interface ApiStation {
  stationuuid: string
  name: string
  url: string
  url_resolved: string
  homepage: string
  favicon: string
  country: string
  countrycode: string
  state: string
  language: string
  tags: string
  codec: string
  bitrate: number
  votes: number
  clickcount: number
  clicktrend: number
  lastcheckok: number
  lastchangetime: string
  hls: number
}

export class RadioBrowserMapper {
  static toDomain(apiStation: ApiStation): RadioStation {
    return {
      id: apiStation.stationuuid,
      name: apiStation.name,
      url: apiStation.url,
      urlResolved: apiStation.url_resolved,
      homepage: apiStation.homepage,
      favicon: apiStation.favicon,
      country: apiStation.country,
      countryCode: apiStation.countrycode,
      state: apiStation.state,
      language: apiStation.language,
      tags: apiStation.tags ? apiStation.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      codec: apiStation.codec,
      bitrate: apiStation.bitrate,
      votes: apiStation.votes,
      clickCount: apiStation.clickcount,
      clickTrend: apiStation.clicktrend,
      lastCheckOk: apiStation.lastcheckok === 1,
      lastChangeTime: apiStation.lastchangetime,
      hls: apiStation.hls === 1
    }
  }

  static toDomainArray(apiStations: ApiStation[]): RadioStation[] {
    return apiStations.map(s => this.toDomain(s))
  }
}
