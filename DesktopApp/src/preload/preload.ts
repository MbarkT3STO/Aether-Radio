import { contextBridge, ipcRenderer } from 'electron'
import type { RadioStation } from '../domain/entities/RadioStation'
import type { Favorite } from '../domain/entities/Favorite'
import type { PlayHistory } from '../domain/entities/PlayHistory'
import type { AppSettings } from '../domain/entities/AppSettings'
import type { CustomStation } from '../domain/entities/CustomStation'
import type { SearchQueryDto } from '../application/dtos/SearchQueryDto'
import type { PaginationDto } from '../application/dtos/PaginationDto'
import type { Result } from '../application/Result'
import type { Country } from '../domain/value-objects/Country'
import type { Genre } from '../domain/value-objects/Genre'
import type { RecognitionResult } from '../main/ipc/handlers/RecognitionIpcHandler'
import type { AppInfo } from '../main/ipc/handlers/WindowIpcHandler'

export interface ElectronAPI {
  // Radio
  searchStations: (query: SearchQueryDto, pagination: PaginationDto) => Promise<Result<RadioStation[]>>
  getTopStations: (count: number) => Promise<Result<RadioStation[]>>
  getByCountry: (countryCode: string, pagination: PaginationDto) => Promise<Result<RadioStation[]>>
  getByGenre: (tag: string, pagination: PaginationDto) => Promise<Result<RadioStation[]>>
  getCountries: () => Promise<Result<Country[]>>
  getGenres: () => Promise<Result<Genre[]>>
  reportClick: (stationId: string) => Promise<void>

  // Favorites
  getFavorites: () => Promise<Result<Favorite[]>>
  addFavorite: (station: RadioStation) => Promise<Result<Favorite>>
  removeFavorite: (stationId: string) => Promise<Result<void>>
  exportFavorites: () => Promise<Result<number>>
  importFavorites: () => Promise<Result<number>>

  // History
  getHistory: () => Promise<Result<PlayHistory[]>>
  addHistory: (station: RadioStation) => Promise<Result<PlayHistory>>
  clearHistory: () => Promise<Result<void>>

  // Settings
  getSettings: () => Promise<Result<AppSettings>>
  updateSettings: (settings: Partial<AppSettings>) => Promise<Result<AppSettings>>

  // Custom Stations
  getCustomStations: () => Promise<Result<CustomStation[]>>
  addCustomStation: (station: Omit<CustomStation, 'addedAt' | 'source'>) => Promise<Result<CustomStation>>
  removeCustomStation: (stationId: string) => Promise<Result<void>>
  updateCustomStation: (stationId: string, updates: Partial<CustomStation>) => Promise<Result<CustomStation>>

  // Tray (Feature 1)
  trayUpdate: (payload: { name: string; playing: boolean }) => void
  onTrayToggle: (handler: () => void) => () => void
  onTrayStop: (handler: () => void) => () => void

  // Global shortcuts (Feature 2)
  onShortcut: (type: 'toggle-playback' | 'stop' | 'next-station', handler: () => void) => () => void

  // Power save / playback state (Feature 4)
  playerStateChanged: (playing: boolean) => void

  // Shell
  openExternal: (url: string) => void
  showLogFolder: () => void

  // App info
  getAppInfo: () => Promise<AppInfo>

  // Song recognition
  recognizeSong: (streamUrl: string) => Promise<{ success: boolean; data?: RecognitionResult; error?: string }>
  recognizeSignature: (signatureUri: string, samplems: number) => Promise<{ success: boolean; data?: RecognitionResult; error?: string }>
}

const electronAPI: ElectronAPI = {
  // Radio
  searchStations: (query, pagination) => ipcRenderer.invoke('radio:search', query, pagination),
  getTopStations: (count) => ipcRenderer.invoke('radio:top', count),
  getByCountry: (countryCode, pagination) => ipcRenderer.invoke('radio:byCountry', countryCode, pagination),
  getByGenre: (tag, pagination) => ipcRenderer.invoke('radio:byGenre', tag, pagination),
  getCountries: () => ipcRenderer.invoke('radio:countries'),
  getGenres: () => ipcRenderer.invoke('radio:genres'),
  reportClick: (stationId) => ipcRenderer.invoke('radio:reportClick', stationId),

  // Favorites
  getFavorites: () => ipcRenderer.invoke('favorites:get'),
  addFavorite: (station) => ipcRenderer.invoke('favorites:add', station),
  removeFavorite: (stationId) => ipcRenderer.invoke('favorites:remove', stationId),
  exportFavorites: () => ipcRenderer.invoke('favorites:export'),
  importFavorites: () => ipcRenderer.invoke('favorites:import'),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (station) => ipcRenderer.invoke('history:add', station),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  // Custom Stations
  getCustomStations: () => ipcRenderer.invoke('custom:get'),
  addCustomStation: (station) => ipcRenderer.invoke('custom:add', station),
  removeCustomStation: (stationId) => ipcRenderer.invoke('custom:remove', stationId),
  updateCustomStation: (stationId, updates) => ipcRenderer.invoke('custom:update', stationId, updates),

  // Tray (Feature 1)
  trayUpdate: (payload) => ipcRenderer.send('tray:update', payload),
  onTrayToggle: (handler) => {
    const listener = (): void => handler()
    ipcRenderer.on('tray:toggle-playback', listener)
    return () => ipcRenderer.removeListener('tray:toggle-playback', listener)
  },
  onTrayStop: (handler) => {
    const listener = (): void => handler()
    ipcRenderer.on('tray:stop', listener)
    return () => ipcRenderer.removeListener('tray:stop', listener)
  },

  // Global shortcuts (Feature 2)
  onShortcut: (type, handler) => {
    const channel = `shortcut:${type}`
    const listener = (): void => handler()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  // Power save (Feature 4)
  playerStateChanged: (playing) => ipcRenderer.send('player:state-changed', playing),

  // Shell
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),
  showLogFolder: () => ipcRenderer.send('shell:showLogFolder'),

  // App info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // Song recognition
  recognizeSong: (streamUrl) => ipcRenderer.invoke('recognition:recognize', streamUrl),
  recognizeSignature: (signatureUri, samplems) => ipcRenderer.invoke('recognition:recognizeSignature', signatureUri, samplems),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
