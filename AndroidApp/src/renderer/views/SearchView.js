import { BaseComponent } from '../components/base/BaseComponent';
import { BridgeService } from '../services/BridgeService';
import { PlayerStore } from '../store/PlayerStore';
import { FavoritesStore } from '../store/FavoritesStore';
import { EventBus } from '../store/EventBus';
import { renderStationCard } from '../utils/renderCard';
const SUGGESTION_CHIPS = [
    'Jazz', 'Classical', 'Rock', 'Electronic', 'Pop',
    'Hip Hop', 'Ambient', 'News', 'Talk', 'Lofi'
];
const PAGE_SIZE = 100; // stations per page / load-more batch
export class SearchView extends BaseComponent {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "bridge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: BridgeService.getInstance()
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
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "stations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "searchTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "hasSearched", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "isLoadingMore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "unsubscribers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        // Pagination state
        Object.defineProperty(this, "currentOffset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "hasMore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lastQuery", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "esc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (text) => {
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }
        });
    }
    render() {
        return `
      <div class="search-view animate-fade-in">
        <div class="search-hero">
          <h1 class="search-hero-title" id="search-title">Search</h1>
          <p class="search-hero-sub">Find stations by name, country, or genre</p>
          <div class="search-bar search-bar--hero">
            <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" class="search-bar-input" placeholder="Search by name, country, or genre…" id="search-input" autocomplete="off">
            <button class="search-bar-clear" id="search-clear" title="Clear">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="search-results"></div>
      </div>
    `;
    }
    async afterMount() {
        this.unsubscribers.push(this.eventBus.on('player:play', () => this.syncPlayingState()), this.eventBus.on('player:pause', () => this.syncPlayingState()), this.eventBus.on('player:stop', () => this.syncPlayingState()));
        const input = this.querySelector('#search-input');
        const clearBtn = this.querySelector('#search-clear');
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const country = urlParams.get('country');
        const genre = urlParams.get('genre');
        if (country) {
            if (input)
                input.value = country;
            clearBtn?.classList.add('visible');
            await this.loadByCountry(country);
            this.updateTitle(`Stations from ${country}`);
        }
        else if (genre) {
            if (input)
                input.value = genre;
            clearBtn?.classList.add('visible');
            await this.loadByGenre(genre);
            this.updateTitle(`${genre} Stations`);
        }
        else {
            this.showIdleState();
        }
        if (input) {
            this.on(input, 'input', () => {
                if (this.searchTimeout)
                    clearTimeout(this.searchTimeout);
                this.searchTimeout = window.setTimeout(() => this.performSearch(input.value), 320);
                clearBtn?.classList.toggle('visible', input.value.length > 0);
            });
        }
        if (clearBtn) {
            this.on(clearBtn, 'click', () => {
                if (input) {
                    input.value = '';
                    input.focus();
                    clearBtn.classList.remove('visible');
                    this.resetState();
                    this.showIdleState();
                    this.updateTitle('Search');
                }
            });
        }
    }
    resetState() {
        this.stations = [];
        this.hasSearched = false;
        this.currentOffset = 0;
        this.hasMore = false;
        this.lastQuery = null;
    }
    beforeUnmount() {
        this.unsubscribers.forEach(u => u());
        this.unsubscribers = [];
    }
    updateTitle(title) {
        const el = this.querySelector('#search-title');
        if (el)
            el.textContent = title;
        // Compact the hero when showing results
        const hero = this.querySelector('.search-hero');
        const sub = this.querySelector('.search-hero-sub');
        if (hero)
            hero.classList.toggle('search-hero--compact', title !== 'Search');
        if (sub)
            sub.style.display = title === 'Search' ? '' : 'none';
    }
    showLoading() {
        const results = this.querySelector('#search-results');
        if (results)
            results.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Searching…</div></div>`;
    }
    showIdleState() {
        const results = this.querySelector('#search-results');
        if (!results)
            return;
        results.innerHTML = `
      <div class="search-idle">
        <div class="search-idle-icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <div class="search-idle-title">Find your station</div>
        <div class="search-idle-subtitle">Search across thousands of radio stations by name, country, or genre.</div>
        <div class="search-suggestions">
          <div class="search-suggestion-label">Try searching for</div>
          ${SUGGESTION_CHIPS.map(chip => `
            <button class="search-chip" data-chip="${this.esc(chip)}">${this.esc(chip)}</button>
          `).join('')}
        </div>
      </div>
    `;
        this.querySelectorAll('.search-chip').forEach(chip => {
            this.on(chip, 'click', () => {
                const term = chip.getAttribute('data-chip') || '';
                const input = this.querySelector('#search-input');
                const clearBtn = this.querySelector('#search-clear');
                if (input) {
                    input.value = term;
                    clearBtn?.classList.add('visible');
                    this.performSearch(term);
                    this.updateTitle(`${term} Stations`);
                    input.focus();
                }
            });
        });
    }
    // ── Loaders ───────────────────────────────────────────────
    async loadByCountry(code, append = false) {
        this.hasSearched = true;
        this.lastQuery = { type: 'country', value: code };
        if (!append) {
            this.showLoading();
            this.stations = [];
            this.currentOffset = 0;
        }
        const result = await this.bridge.radio.getByCountry(code, { limit: PAGE_SIZE, offset: this.currentOffset });
        if (result.success) {
            this.stations = append ? [...this.stations, ...result.data] : result.data;
            this.hasMore = result.data.length === PAGE_SIZE;
            this.currentOffset += result.data.length;
            this.updateResults();
        }
    }
    async loadByGenre(genre, append = false) {
        this.hasSearched = true;
        this.lastQuery = { type: 'genre', value: genre };
        if (!append) {
            this.showLoading();
            this.stations = [];
            this.currentOffset = 0;
        }
        const result = await this.bridge.radio.getByGenre(genre, { limit: PAGE_SIZE, offset: this.currentOffset });
        if (result.success) {
            this.stations = append ? [...this.stations, ...result.data] : result.data;
            this.hasMore = result.data.length === PAGE_SIZE;
            this.currentOffset += result.data.length;
            this.updateResults();
        }
    }
    async performSearch(query, append = false) {
        if (!query.trim()) {
            this.resetState();
            this.showIdleState();
            this.updateTitle('Search');
            return;
        }
        this.hasSearched = true;
        this.lastQuery = { type: 'search', value: query };
        if (!append) {
            this.showLoading();
            this.stations = [];
            this.currentOffset = 0;
        }
        this.updateTitle(`Results for "${query}"`);
        const result = await this.bridge.radio.search({ name: query }, { limit: PAGE_SIZE, offset: this.currentOffset });
        if (result.success) {
            this.stations = append ? [...this.stations, ...result.data] : result.data;
            this.hasMore = result.data.length === PAGE_SIZE;
            this.currentOffset += result.data.length;
            this.updateResults();
        }
    }
    async loadMore() {
        if (this.isLoadingMore || !this.lastQuery)
            return;
        this.isLoadingMore = true;
        // Show spinner in the load-more button
        const btn = this.querySelector('#load-more-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="loading-spinner loading-spinner--sm"></span> Loading…`;
        }
        const { type, value } = this.lastQuery;
        if (type === 'country')
            await this.loadByCountry(value, true);
        if (type === 'genre')
            await this.loadByGenre(value, true);
        if (type === 'search')
            await this.performSearch(value, true);
        this.isLoadingMore = false;
    }
    // ── Render results ────────────────────────────────────────
    updateResults() {
        const results = this.querySelector('#search-results');
        if (!results)
            return;
        if (this.stations.length === 0) {
            const input = this.querySelector('#search-input');
            const query = input?.value?.trim() || '';
            results.innerHTML = `
        <div class="search-no-results">
          <div class="search-no-results-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>
          <div class="search-no-results-title">No stations found</div>
          <div class="search-no-results-message">
            ${query ? `No results for <strong>"${this.esc(query)}"</strong>. Try a different term or browse by genre.` : 'Try a different search term or browse by country and genre.'}
          </div>
          <div class="search-no-results-chips">
            ${SUGGESTION_CHIPS.slice(0, 5).map(chip => `
              <button class="search-chip" data-chip="${this.esc(chip)}">${this.esc(chip)}</button>
            `).join('')}
          </div>
        </div>`;
            this.querySelectorAll('.search-chip').forEach(chip => {
                this.on(chip, 'click', () => {
                    const term = chip.getAttribute('data-chip') || '';
                    const input = this.querySelector('#search-input');
                    const clearBtn = this.querySelector('#search-clear');
                    if (input) {
                        input.value = term;
                        clearBtn?.classList.add('visible');
                        this.performSearch(term);
                        this.updateTitle(`${term} Stations`);
                        input.focus();
                    }
                });
            });
            return;
        }
        results.innerHTML = `
      <div class="results-count">${this.stations.length.toLocaleString()} station${this.stations.length !== 1 ? 's' : ''} found</div>
      <div class="grid grid-cols-auto">
        ${this.stations.map(s => renderStationCard({
            station: s,
            isPlaying: this.playerStore.currentStation?.id === s.id && this.playerStore.isPlaying,
            isFavorite: this.favoritesStore.isFavorite(s.id)
        })).join('')}
      </div>
      ${this.hasMore ? `
        <div class="load-more-wrap">
          <button class="load-more-btn" id="load-more-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            Load more stations
          </button>
        </div>
      ` : ''}
    `;
        this.attachListeners();
    }
    syncPlayingState() {
        const currentId = this.playerStore.currentStation?.id ?? null;
        const isPlaying = this.playerStore.isPlaying;
        this.querySelectorAll('.station-card').forEach(card => {
            const active = isPlaying && card.getAttribute('data-station-id') === currentId;
            card.classList.toggle('playing', active);
        });
    }
    attachListeners() {
        this.querySelectorAll('.station-card').forEach(card => {
            this.on(card, 'click', (e) => {
                const target = e.target;
                if (target.closest('[data-action="favorite"]')) {
                    e.stopPropagation();
                    this.handleFavorite(target.closest('[data-action="favorite"]'));
                    return;
                }
                const id = card.getAttribute('data-station-id');
                const station = this.stations.find(s => s.id === id);
                if (station)
                    this.playerStore.play(station);
            });
        });
        const loadMoreBtn = this.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            this.on(loadMoreBtn, 'click', () => this.loadMore());
        }
    }
    async handleFavorite(btn) {
        const id = btn.getAttribute('data-station-id');
        const station = this.stations.find(s => s.id === id);
        if (!station)
            return;
        if (this.favoritesStore.isFavorite(station.id)) {
            await this.bridge.favorites.remove(station.id);
        }
        else {
            await this.bridge.favorites.add(station);
        }
        const result = await this.bridge.favorites.getAll();
        if (result.success) {
            this.favoritesStore.setFavorites(result.data);
            this.updateResults();
        }
    }
}
