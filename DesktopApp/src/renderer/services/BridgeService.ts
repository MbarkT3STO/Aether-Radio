import type { ElectronAPI } from '../../preload/preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export class BridgeService {
  private static instance: BridgeService
  private api: ElectronAPI

  private constructor() {
    this.api = window.electronAPI
  }

  static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService()
    }
    return BridgeService.instance
  }

  get radio() {
    return {
      search: this.api.searchStations.bind(this.api),
      getTop: this.api.getTopStations.bind(this.api),
      getByCountry: this.api.getByCountry.bind(this.api),
      getByGenre: this.api.getByGenre.bind(this.api),
      getCountries: this.api.getCountries.bind(this.api),
      getGenres: this.api.getGenres.bind(this.api),
      reportClick: this.api.reportClick.bind(this.api)
    }
  }

  get favorites() {
    return {
      getAll: this.api.getFavorites.bind(this.api),
      add: this.api.addFavorite.bind(this.api),
      remove: this.api.removeFavorite.bind(this.api)
    }
  }

  get history() {
    return {
      getAll: this.api.getHistory.bind(this.api),
      add: this.api.addHistory.bind(this.api),
      clear: this.api.clearHistory.bind(this.api)
    }
  }

  get settings() {
    return {
      get: this.api.getSettings.bind(this.api),
      update: this.api.updateSettings.bind(this.api)
    }
  }

  get customStations() {
    return {
      getAll: this.api.getCustomStations.bind(this.api),
      add: this.api.addCustomStation.bind(this.api),
      remove: this.api.removeCustomStation.bind(this.api),
      update: this.api.updateCustomStation.bind(this.api)
    }
  }
}
