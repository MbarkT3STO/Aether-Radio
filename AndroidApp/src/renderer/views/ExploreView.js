import { BaseComponent } from '../components/base/BaseComponent';
import { BridgeService } from '../services/BridgeService';
import { Router } from '../router/Router';
import { countryFlag } from '../utils/countryFlag';
const GENRES_INITIAL = 36; // show first N genres
const GENRES_MAX = 500; // load up to this many
const COUNTRIES_INITIAL = 60; // show first N countries
export class ExploreView extends BaseComponent {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "bridge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: BridgeService.getInstance()
        });
        Object.defineProperty(this, "router", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Router.getInstance()
        });
        Object.defineProperty(this, "countries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "genres", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "showAllGenres", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "showAllCountries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    async afterMount() {
        await this.loadData();
    }
    async loadData() {
        const [countriesResult, genresResult] = await Promise.all([
            this.bridge.radio.getCountries(),
            this.bridge.radio.getGenres()
        ]);
        if (countriesResult.success) {
            // Keep all countries sorted by station count — no artificial slice
            this.countries = countriesResult.data.filter(c => c.code && c.name);
        }
        if (genresResult.success) {
            // Filter out junk genres (too short, numbers only, etc.)
            this.genres = genresResult.data
                .filter(g => g.name.trim().length > 1 && g.stationCount > 5)
                .slice(0, GENRES_MAX);
        }
        this.renderContent();
    }
    render() {
        return `
      <div class="explore-view animate-fade-in">
        <div class="view-header">
          <div class="view-header-row">
            <div class="view-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
            </div>
            <h1>Explore</h1>
          </div>
          <p class="view-subtitle">Browse stations by country or genre</p>
        </div>
        <div id="explore-content">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading…</div>
          </div>
        </div>
      </div>
    `;
    }
    renderContent() {
        const content = this.querySelector('#explore-content');
        if (!content)
            return;
        const visibleGenres = this.showAllGenres ? this.genres : this.genres.slice(0, GENRES_INITIAL);
        const visibleCountries = this.showAllCountries ? this.countries : this.countries.slice(0, COUNTRIES_INITIAL);
        const hasMoreGenres = this.genres.length > GENRES_INITIAL;
        const hasMoreCountries = this.countries.length > COUNTRIES_INITIAL;
        content.innerHTML = `

      <!-- Countries -->
      <section class="section">
        <div class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Countries
          <span class="section-title-count">${this.countries.length} available</span>
        </div>
        <div class="grid grid-cols-country" id="country-grid">
          ${visibleCountries.map(c => `
            <div class="country-card" data-country="${c.code}">
              <div class="country-card-flag">${countryFlag(c.code)}</div>
              <div class="country-card-name">${this.esc(c.name)}</div>
              <div class="country-card-count">${c.stationCount.toLocaleString()} stations</div>
            </div>
          `).join('')}
        </div>
        ${hasMoreCountries ? `
          <button class="genre-show-more" id="country-toggle">
            ${this.showAllCountries
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Show less`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Show all ${this.countries.length} countries`}
          </button>
        ` : ''}
      </section>

      <!-- Genres -->
      <section class="section">
        <div class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          Genres
          <span class="section-title-count">${this.genres.length} available</span>
        </div>

        <div class="genre-grid" id="genre-grid">
          ${visibleGenres.map(g => `
            <button class="genre-card" data-genre="${this.esc(g.name)}">
              <span class="genre-card-name">${this.esc(g.name)}</span>
              <span class="genre-card-count">${g.stationCount.toLocaleString()}</span>
            </button>
          `).join('')}
        </div>

        ${hasMoreGenres ? `
          <button class="genre-show-more" id="genre-toggle">
            ${this.showAllGenres
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Show less`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Show all ${this.genres.length} genres`}
          </button>
        ` : ''}
      </section>
    `;
        this.attachListeners();
    }
    attachListeners() {
        // Country cards
        this.querySelectorAll('[data-country]').forEach(card => {
            this.on(card, 'click', () => {
                const code = card.getAttribute('data-country');
                if (code)
                    this.router.navigate(`/search?country=${code}`);
            });
        });
        // Genre cards
        this.querySelectorAll('[data-genre]').forEach(btn => {
            this.on(btn, 'click', () => {
                const genre = btn.getAttribute('data-genre');
                if (genre)
                    this.router.navigate(`/search?genre=${encodeURIComponent(genre)}`);
            });
        });
        // Countries show more/less toggle
        const countryToggle = this.querySelector('#country-toggle');
        if (countryToggle) {
            this.on(countryToggle, 'click', () => {
                this.showAllCountries = !this.showAllCountries;
                this.renderContent();
                if (!this.showAllCountries) {
                    this.querySelector('#country-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
        // Genres show more/less toggle
        const toggle = this.querySelector('#genre-toggle');
        if (toggle) {
            this.on(toggle, 'click', () => {
                this.showAllGenres = !this.showAllGenres;
                this.renderContent();
                if (!this.showAllGenres) {
                    this.querySelector('#genre-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }
    esc(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
