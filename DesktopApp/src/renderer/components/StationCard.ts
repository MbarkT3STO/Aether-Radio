import { BaseComponent } from './base/BaseComponent'
import type { RadioStation } from '../../domain/entities/RadioStation'
import { stationLogoHtml } from '../utils/stationLogo'
import { countryFlag } from '../utils/countryFlag'

const THUMBS_UP = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`

interface StationCardProps {
  station: RadioStation
  isPlaying?: boolean
  isFavorite?: boolean
  onPlay?: (station: RadioStation) => void
  onFavorite?: (station: RadioStation) => void
}

export class StationCard extends BaseComponent<StationCardProps> {
  render(): string {
    const { station, isPlaying = false, isFavorite = false } = this.props

    return `
      <div class="station-card ${isPlaying ? 'playing' : ''}" data-station-id="${station.id}">
        <div class="station-card-header">
          ${stationLogoHtml(station.favicon, station.name, 'card')}
          <div class="station-card-info">
            <div class="station-card-name">${this.escapeHtml(station.name)}</div>
            <div class="station-card-country">${countryFlag(station.countryCode)} ${this.escapeHtml(station.country)}</div>
          </div>
        </div>

        ${station.tags.length > 0 ? `
          <div class="station-card-tags">
            ${station.tags.slice(0, 3).map(tag =>
              `<span class="station-card-tag">${this.escapeHtml(tag)}</span>`
            ).join('')}
          </div>
        ` : ''}

        <div class="station-card-footer">
          <div class="station-card-meta">
            ${station.bitrate ? `<span>${station.bitrate} kbps</span><span class="meta-dot">·</span>` : ''}
            <span>${station.codec.toUpperCase()}</span>
            ${station.votes ? `<span class="meta-dot">·</span><span class="meta-votes">${THUMBS_UP} ${station.votes.toLocaleString()}</span>` : ''}
          </div>
          <button
            class="station-card-favorite ${isFavorite ? 'active' : ''}"
            data-action="favorite"
            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="${isFavorite ? 'currentColor' : 'none'}"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
        </div>
      </div>
    `
  }

  protected afterMount(): void {
    if (this.element) {
      this.on(this.element, 'click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-action="favorite"]')) {
          e.stopPropagation()
          this.props.onFavorite?.(this.props.station)
          return
        }
        this.props.onPlay?.(this.props.station)
      })
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
