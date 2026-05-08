export enum IpcChannel {
  SEARCH_STATIONS = 'radio:search',
  GET_TOP_STATIONS = 'radio:top',
  GET_BY_COUNTRY = 'radio:byCountry',
  GET_BY_GENRE = 'radio:byGenre',
  GET_FAVORITES = 'favorites:get',
  ADD_FAVORITE = 'favorites:add',
  REMOVE_FAVORITE = 'favorites:remove',
  GET_HISTORY = 'history:get',
  ADD_HISTORY = 'history:add',
  CLEAR_HISTORY = 'history:clear',
  GET_SETTINGS = 'settings:get',
  UPDATE_SETTINGS = 'settings:update',
  GET_COUNTRIES = 'radio:countries',
  GET_GENRES = 'radio:genres',
  REPORT_CLICK = 'radio:reportClick',
  GET_CUSTOM_STATIONS = 'custom:get',
  ADD_CUSTOM_STATION = 'custom:add',
  REMOVE_CUSTOM_STATION = 'custom:remove',
  UPDATE_CUSTOM_STATION = 'custom:update',

  // Tray / Window
  TRAY_UPDATE = 'tray:update',
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_CLOSE = 'window:close',

  // Playback state (power save blocker)
  PLAYER_STATE_CHANGED = 'player:state-changed',

  // Favorites import/export
  EXPORT_FAVORITES = 'favorites:export',
  IMPORT_FAVORITES = 'favorites:import',

  // Shell
  OPEN_EXTERNAL = 'shell:openExternal',
  SHOW_LOG_FOLDER = 'shell:showLogFolder',

  // App info
  GET_APP_INFO = 'app:getInfo',

  // Song recognition
  RECOGNIZE_SONG = 'recognition:recognize',
}
