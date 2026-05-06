import { BaseComponent } from './base/BaseComponent';
import { EventBus } from '../store/EventBus';
import { PlayerStore } from '../store/PlayerStore';
import { FavoritesStore } from '../store/FavoritesStore';
import { BridgeService } from '../services/BridgeService';
import { AudioService } from '../services/AudioService';
import { VisualizerService } from '../services/VisualizerService';
import { stationLogoHtml } from '../utils/stationLogo';
import { countryFlag } from '../utils/countryFlag';
export class MiniPlayer extends BaseComponent {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "playerStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: PlayerStore.getInstance()
        });
        Object.defineProperty(this, "favoritesStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: FavoritesStore.getInstance()
        });
        Object.defineProperty(this, "bridge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: BridgeService.getInstance()
        });
        Object.defineProperty(this, "audioService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: AudioService.getInstance()
        });
        Object.defineProperty(this, "visualizer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new VisualizerService()
        });
        Object.defineProperty(this, "barAmbient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new VisualizerService()
        });
        Object.defineProperty(this, "_renderedStationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.eventBus.on('player:play', () => this.onPlayStateChange());
        this.eventBus.on('player:pause', () => this.onPlayStateChange());
        this.eventBus.on('player:stop', () => this.fullRender());
        this.eventBus.on('player:loading', ({ loading }) => this.updateLoadingUI(loading));
        this.eventBus.on('favorites:changed', () => this.updateFavBtn());
    }
    render() {
        const station = this.playerStore.currentStation;
        const isPlaying = this.playerStore.isPlaying;
        const isLoading = this.playerStore.isLoading;
        if (!station) {
            return `
        <div class="mini-player">
          <div class="mini-player-logo">
            <div class="station-logo-fallback">${this.radioIcon()}</div>
          </div>
          <div class="mini-player-info">
            <div class="mini-player-empty">No station playing</div>
          </div>
          <div class="mini-player-controls">
            <button class="mini-player-btn mini-player-btn--play" disabled>
              ${this.playIcon()}
            </button>
          </div>
        </div>
      `;
        }
        const isFav = this.favoritesStore.isFavorite(station.id);
        return `
      <div class="mini-player" id="mini-player-root">
        <canvas class="mini-player-ambient" id="mini-player-ambient"></canvas>

        <div class="mini-player-logo" id="mini-player-logo">
          ${stationLogoHtml(station.favicon, station.name, 'player')}
          ${isPlaying ? `<span class="mini-player-live-dot"></span>` : ''}
        </div>

        <div class="mini-player-info">
          <div class="mini-player-name">${this.esc(station.name)}</div>
          <div class="mini-player-meta">
            ${countryFlag(station.countryCode)} ${this.esc(station.country)}
            ${station.tags[0] ? ` · ${this.esc(station.tags[0])}` : ''}
          </div>
        </div>

        <div class="mini-player-controls">
          <button class="mini-player-btn" id="mini-fav-btn" data-action="favorite"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              style="color:${isFav ? 'var(--accent-secondary)' : 'var(--text-tertiary)'}">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>

          <button class="mini-player-btn mini-player-btn--play ${isPlaying ? 'playing' : ''}"
            id="mini-play-btn" data-action="${isPlaying ? 'pause' : 'play'}">
            ${isLoading
            ? `<span class="loading-spinner loading-spinner--md"></span>`
            : (isPlaying ? this.pauseIcon() : this.playIcon())}
          </button>
        </div>
      </div>
    `;
    }
    afterMount() {
        this.attachListeners();
        this.audioService.setOnPlayStarted(async (audioEl) => {
            await this.visualizer.initialize(audioEl);
            const canvas = this.querySelector('#mini-player-ambient');
            if (canvas) {
                this.barAmbient.startAmbientVisualization(canvas, this.visualizer, true, true);
                requestAnimationFrame(() => canvas.classList.add('active'));
            }
        });
    }
    beforeUnmount() {
        this.visualizer.stopVisualization();
        this.barAmbient.stopVisualization();
    }
    attachListeners() {
        const playBtn = this.querySelector('#mini-play-btn');
        if (playBtn) {
            this.on(playBtn, 'click', (e) => {
                e.stopPropagation();
                if (this.playerStore.isPlaying) {
                    this.playerStore.pause();
                }
                else if (this.playerStore.currentStation) {
                    this.playerStore.play(this.playerStore.currentStation);
                }
            });
        }
        const favBtn = this.querySelector('#mini-fav-btn');
        if (favBtn) {
            this.on(favBtn, 'click', async (e) => {
                e.stopPropagation();
                const station = this.playerStore.currentStation;
                if (!station)
                    return;
                if (this.favoritesStore.isFavorite(station.id)) {
                    await this.bridge.favorites.remove(station.id);
                }
                else {
                    await this.bridge.favorites.add(station);
                }
                const result = await this.bridge.favorites.getAll();
                if (result.success)
                    this.favoritesStore.setFavorites(result.data);
            });
        }
    }
    onPlayStateChange() {
        const station = this.playerStore.currentStation;
        if (!station || !this.querySelector('#mini-play-btn') || station.id !== this._renderedStationId) {
            this.fullRender();
            return;
        }
        const isPlaying = this.playerStore.isPlaying;
        const playBtn = this.querySelector('#mini-play-btn');
        if (playBtn) {
            playBtn.classList.toggle('playing', isPlaying);
            playBtn.setAttribute('data-action', isPlaying ? 'pause' : 'play');
            if (!this.playerStore.isLoading) {
                playBtn.innerHTML = isPlaying ? this.pauseIcon() : this.playIcon();
            }
        }
        const logo = this.querySelector('.mini-player-logo');
        if (logo) {
            const dot = logo.querySelector('.mini-player-live-dot');
            if (isPlaying && !dot)
                logo.insertAdjacentHTML('beforeend', `<span class="mini-player-live-dot"></span>`);
            else if (!isPlaying && dot)
                dot.remove();
        }
        const canvas = this.querySelector('#mini-player-ambient');
        if (!isPlaying) {
            this.barAmbient.stopVisualization();
            if (canvas)
                canvas.classList.remove('active');
        }
    }
    updateLoadingUI(loading) {
        const playBtn = this.querySelector('#mini-play-btn');
        if (!playBtn) {
            this.fullRender();
            return;
        }
        const isPlaying = this.playerStore.isPlaying;
        playBtn.innerHTML = loading
            ? `<span class="loading-spinner loading-spinner--md"></span>`
            : (isPlaying ? this.pauseIcon() : this.playIcon());
    }
    updateFavBtn() {
        const station = this.playerStore.currentStation;
        if (!station)
            return;
        const isFav = this.favoritesStore.isFavorite(station.id);
        const btn = this.querySelector('#mini-fav-btn');
        if (!btn)
            return;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="color:${isFav ? 'var(--accent-secondary)' : 'var(--text-tertiary)'}">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`;
    }
    fullRender() {
        this.barAmbient.stopVisualization();
        if (this.element?.parentNode) {
            const parent = this.element.parentNode;
            parent.innerHTML = this.render();
            this.element = parent.firstElementChild;
            this._renderedStationId = this.playerStore.currentStation?.id ?? null;
            this.setupImageErrorHandlers();
            this.afterMount();
        }
    }
    playIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
    pauseIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`;
    }
    radioIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`;
    }
    esc(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
