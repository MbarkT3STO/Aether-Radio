/**
 * Shared station card renderer used by all views.
 */
import type { RadioStation } from '../../domain/entities/RadioStation'
import { stationLogoHtml } from './stationLogo'
import { countryFlag } from './countryFlag'

interface CardOptions {
  station: RadioStation
  isPlaying: boolean
  isFavorite: boolean
  /** Override the footer meta line (e.g. time-ago for history) */
  metaOverride?: string
  /** Always show heart as active (favorites view) */
  alwaysActive?: boolean
}

export function renderStationCard(opts: CardOptions): string {
  const { station, isPlaying, isFavorite, metaOverride, alwaysActive } = opts
  const meta = metaOverride ?? buildMeta(station)
  const favActive = alwaysActive ? true : isFavorite
  const action = alwaysActive ? 'remove' : 'favorite'
  const stationId = station.id

  return `<div class="station-card${isPlaying ? ' playing' : ''}" data-station-id="${stationId}">
  <div class="station-card-header">
    ${stationLogoHtml(station.favicon, station.name, 'card')}
    <div class="station-card-info">
      <div class="station-card-name">${esc(station.name)}</div>
      <div class="station-card-country">
        ${countryFlag(station.countryCode)}
        ${esc(station.country)}
      </div>
    </div>
  </div>
  ${station.tags.length > 0 ? `<div class="station-card-tags">${station.tags.slice(0, 3).map(t => `<span class="station-card-tag">${esc(t)}</span>`).join('')}</div>` : ''}
  <div class="station-card-footer">
    <div class="station-card-meta">${meta}</div>
    <button class="station-card-favorite${favActive ? ' active' : ''}" data-action="${action}" data-station-id="${stationId}" title="${favActive ? 'Remove from favorites' : 'Add to favorites'}">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${favActive ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    </button>
  </div>
</div>`
}

function buildMeta(station: RadioStation): string {
  const parts: string[] = []
  if (station.bitrate) parts.push(`<span>${station.bitrate} kbps</span>`)
  if (station.codec)   parts.push(`<span>${station.codec.toUpperCase()}</span>`)
  if (station.votes)   parts.push(`<span class="meta-votes"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg> ${station.votes.toLocaleString()}</span>`)
  return parts.join('<span class="meta-dot">·</span>')
}

/** Safe HTML escaping for text content */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
