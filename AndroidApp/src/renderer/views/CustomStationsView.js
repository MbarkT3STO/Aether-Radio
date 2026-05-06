import { BaseComponent } from '../components/base/BaseComponent';
import { Toast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { PlayerStore } from '../store/PlayerStore';
import { EventBus } from '../store/EventBus';
import { stationLogoHtml } from '../utils/stationLogo';
import { BridgeService } from '../services/BridgeService';
export class CustomStationsView extends BaseComponent {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "stations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "showAddForm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "editingId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "playerStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: PlayerStore.getInstance()
        });
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "bridge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: BridgeService.getInstance()
        });
        Object.defineProperty(this, "unsubscribers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    // ── Data ──────────────────────────────────────────────────
    async loadStations() {
        try {
            const result = await this.bridge.customStations.getAll();
            if (result.success && result.data) {
                this.stations = result.data;
                this.renderList();
            }
        }
        catch {
            Toast.show('Failed to load custom stations', 'error');
        }
    }
    // ── Render ────────────────────────────────────────────────
    render() {
        return `
      <div class="custom-stations-view animate-fade-in">

        <!-- Header -->
        <div class="cs-header">
          <div>
            <div class="view-header-row">
              <div class="view-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
                  <path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
                </svg>
              </div>
              <h1>My Stations</h1>
            </div>
            <p class="view-subtitle">Manage your custom radio streams</p>
          </div>
          <div id="header-btn-slot"></div>
        </div>

        <!-- Add Form (injected dynamically) -->
        <div id="form-slot"></div>

        <!-- Stations List -->
        <div id="stations-list"></div>

      </div>
    `;
    }
    afterMount() {
        this.loadStations();
        this.bindHeaderBtn();
        // Keep cards in sync with player bar state changes — store unsubscribers
        this.unsubscribers.push(this.eventBus.on('player:play', () => this.syncPlayingState()), this.eventBus.on('player:pause', () => this.syncPlayingState()), this.eventBus.on('player:stop', () => this.syncPlayingState()));
    }
    beforeUnmount() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    // ── Sync playing state without full re-render ─────────────
    syncPlayingState() {
        const isPlaying = this.playerStore.isPlaying;
        const currentId = this.playerStore.currentStation?.id ?? null;
        this.querySelectorAll('.cs-card').forEach(card => {
            const id = card.getAttribute('data-id');
            const isThisPlaying = isPlaying && id === currentId;
            // Toggle playing border class on the card
            card.classList.toggle('cs-card--playing', isThisPlaying);
            // Update the play button label + icon
            const playBtn = card.querySelector('.cs-play-btn');
            if (playBtn) {
                playBtn.title = isThisPlaying ? 'Now playing' : 'Play';
                playBtn.innerHTML = isThisPlaying
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Playing`
                    : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`;
            }
            // Show/hide the live badge
            const header = card.querySelector('.cs-card-header');
            if (header) {
                const existingBadge = header.querySelector('.cs-playing-badge');
                if (isThisPlaying && !existingBadge) {
                    header.insertAdjacentHTML('beforeend', `
            <div class="cs-playing-badge">
              <span class="cs-playing-dot"></span>
              Live
            </div>`);
                }
                else if (!isThisPlaying && existingBadge) {
                    existingBadge.remove();
                }
            }
        });
    }
    // ── Header button ─────────────────────────────────────────
    bindHeaderBtn() {
        this.renderHeaderBtn();
        const slot = this.querySelector('#header-btn-slot');
        if (!slot)
            return;
        this.on(slot, 'click', (e) => {
            const btn = e.target.closest('#add-station-btn');
            if (btn)
                this.openForm();
        });
    }
    renderHeaderBtn() {
        const slot = this.querySelector('#header-btn-slot');
        if (!slot)
            return;
        slot.innerHTML = this.showAddForm ? '' : `
      <button id="add-station-btn" class="cs-add-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Station
      </button>
    `;
    }
    // ── Form ──────────────────────────────────────────────────
    openForm() {
        this.showAddForm = true;
        this.editingId = null;
        this.renderHeaderBtn();
        this.renderForm();
    }
    closeForm() {
        this.showAddForm = false;
        this.editingId = null;
        this.renderHeaderBtn();
        const slot = this.querySelector('#form-slot');
        if (slot)
            slot.innerHTML = '';
    }
    openEditForm(station) {
        this.showAddForm = true;
        this.editingId = station.id;
        this.renderHeaderBtn();
        this.renderForm(station);
    }
    renderForm(prefill) {
        const slot = this.querySelector('#form-slot');
        if (!slot)
            return;
        const isEdit = !!prefill;
        slot.innerHTML = `
      <div class="cs-form-card">
        <div class="cs-form-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isEdit
            ? `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`
            : `<line x1="12" y1="5" x2="12" y2="19"/>
                 <line x1="5" y1="12" x2="19" y2="12"/>`}
          </svg>
          ${isEdit ? `Edit "${this.esc(prefill.name)}"` : 'Add New Station'}
        </div>

        <form id="add-station-form" class="cs-form" autocomplete="off">

          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-name">Station Name <span class="cs-required">*</span></label>
              <input type="text" id="cs-name" name="name" required placeholder="e.g., My Radio Station"
                value="${prefill ? this.esc(prefill.name) : ''}">
            </div>
            <div class="cs-form-group">
              <label for="cs-genre">Genre <span class="cs-required">*</span></label>
              <input type="text" id="cs-genre" name="genre" required placeholder="e.g., Pop, Rock, News"
                value="${prefill ? this.esc(prefill.genre) : ''}">
            </div>
          </div>

          <div class="cs-form-group">
            <label for="cs-url">Stream URL <span class="cs-required">*</span></label>
            <input type="url" id="cs-url" name="url" required placeholder="https://example.com/stream"
              value="${prefill ? this.esc(prefill.url) : ''}">
          </div>

          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-country">Country <span class="cs-required">*</span></label>
              <input type="text" id="cs-country" name="country" required placeholder="e.g., Morocco"
                value="${prefill ? this.esc(prefill.country) : ''}">
            </div>
            <div class="cs-form-group">
              <label for="cs-code">Country Code <span class="cs-required">*</span></label>
              <input type="text" id="cs-code" name="countryCode" required placeholder="MA" maxlength="2"
                style="text-transform:uppercase"
                value="${prefill ? this.esc(prefill.countryCode) : ''}">
            </div>
          </div>

          <div class="cs-form-group">
            <label for="cs-favicon">Logo URL <span class="cs-optional">(optional)</span></label>
            <input type="url" id="cs-favicon" name="favicon" placeholder="https://example.com/logo.png"
              value="${prefill?.favicon ? this.esc(prefill.favicon) : ''}">
          </div>

          <div class="cs-form-group">
            <label for="cs-desc">Description <span class="cs-optional">(optional)</span></label>
            <textarea id="cs-desc" name="description" rows="2" placeholder="Short description…">${prefill?.description ? this.esc(prefill.description) : ''}</textarea>
          </div>

          <div class="cs-form-actions">
            <button type="submit" class="cs-btn-submit">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ${isEdit ? 'Save Changes' : 'Add Station'}
            </button>
            <button type="button" id="cs-cancel-btn" class="cs-btn-cancel">Cancel</button>
          </div>

        </form>
      </div>
    `;
        const form = this.querySelector('#add-station-form');
        const cancelBtn = this.querySelector('#cs-cancel-btn');
        if (form) {
            this.on(form, 'submit', async (e) => {
                e.preventDefault();
                if (isEdit && this.editingId) {
                    await this.handleEditStation(form, this.editingId);
                }
                else {
                    await this.handleAddStation(form);
                }
            });
        }
        if (cancelBtn) {
            this.on(cancelBtn, 'click', () => this.closeForm());
        }
    }
    // ── List ──────────────────────────────────────────────────
    renderList() {
        const listEl = this.querySelector('#stations-list');
        if (!listEl)
            return;
        if (this.stations.length === 0) {
            listEl.innerHTML = `
        <div class="cs-empty">
          <div class="cs-empty-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="2"/>
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
              <path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
            </svg>
          </div>
          <div class="cs-empty-title">No custom stations yet</div>
          <div class="cs-empty-subtitle">Add your own radio streams to listen alongside stations from Radio Browser</div>
          <button class="cs-empty-cta" id="cs-empty-add-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Your First Station
          </button>
        </div>
      `;
            // Wire up empty state CTA
            const emptyBtn = this.querySelector('#cs-empty-add-btn');
            if (emptyBtn)
                this.on(emptyBtn, 'click', () => this.openForm());
            return;
        }
        listEl.innerHTML = `
      <div class="cs-count">${this.stations.length} station${this.stations.length !== 1 ? 's' : ''}</div>
      <div class="cs-grid">
        ${this.stations.map(s => this.renderCard(s)).join('')}
      </div>
    `;
        // Bind card buttons
        this.querySelectorAll('.cs-play-btn').forEach(btn => {
            this.on(btn, 'click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const station = this.stations.find(s => s.id === id);
                if (station)
                    this.playStation(station);
            });
        });
        this.querySelectorAll('.cs-edit-btn').forEach(btn => {
            this.on(btn, 'click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const station = this.stations.find(s => s.id === id);
                if (station)
                    this.openEditForm(station);
            });
        });
        this.querySelectorAll('.cs-delete-btn').forEach(btn => {
            this.on(btn, 'click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (id)
                    await this.handleDeleteStation(id);
            });
        });
        // Click card to play
        this.querySelectorAll('.cs-card').forEach(card => {
            this.on(card, 'click', (e) => {
                const target = e.target;
                if (target.closest('.cs-play-btn') || target.closest('.cs-edit-btn') || target.closest('.cs-delete-btn'))
                    return;
                const id = card.getAttribute('data-id');
                const station = this.stations.find(s => s.id === id);
                if (station)
                    this.playStation(station);
            });
        });
    }
    renderCard(station) {
        const isPlaying = this.playerStore.currentStation?.id === station.id && this.playerStore.isPlaying;
        return `
      <div class="cs-card${isPlaying ? ' cs-card--playing' : ''}" data-id="${station.id}">

        <!-- Logo + Info -->
        <div class="cs-card-header">
          ${stationLogoHtml(station.favicon, station.name, 'card')}
          <div class="cs-card-info">
            <div class="cs-card-name">${this.esc(station.name)}</div>
            <div class="cs-card-meta">${this.esc(station.country)} · ${this.esc(station.genre)}</div>
          </div>
          ${isPlaying ? `
            <div class="cs-playing-badge">
              <span class="cs-playing-dot"></span>
              Live
            </div>
          ` : ''}
        </div>

        <!-- Description -->
        ${station.description ? `<p class="cs-card-desc">${this.esc(station.description)}</p>` : ''}

        <!-- URL -->
        <div class="cs-card-url">${this.esc(station.url)}</div>

        <!-- Actions -->
        <div class="cs-card-actions">
          <button class="cs-play-btn" data-id="${station.id}" title="${isPlaying ? 'Now playing' : 'Play'}">
            ${isPlaying
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Playing`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`}
          </button>
          <button class="cs-edit-btn" data-id="${station.id}" title="Edit station">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="cs-delete-btn" data-id="${station.id}" title="Delete station">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>

      </div>
    `;
    }
    // ── Actions ───────────────────────────────────────────────
    playStation(station) {
        // If this station is already playing, pause it instead of restarting
        if (this.playerStore.currentStation?.id === station.id && this.playerStore.isPlaying) {
            this.playerStore.pause();
            return;
        }
        this.playerStore.play({
            id: station.id,
            name: station.name,
            url: station.url,
            urlResolved: station.url,
            homepage: '',
            favicon: station.favicon || '',
            country: station.country,
            countryCode: station.countryCode,
            state: '',
            language: '',
            tags: station.genre ? [station.genre] : [],
            codec: '',
            bitrate: 0,
            votes: 0,
            clickCount: 0,
            clickTrend: 0,
            lastCheckOk: true,
            lastChangeTime: '',
            hls: false
        });
    }
    async handleAddStation(form) {
        const data = new FormData(form);
        const station = {
            id: `custom-${Date.now()}`,
            name: data.get('name').trim(),
            url: data.get('url').trim(),
            country: data.get('country').trim(),
            countryCode: data.get('countryCode').trim().toUpperCase(),
            genre: data.get('genre').trim(),
            description: data.get('description')?.trim() || undefined,
            favicon: data.get('favicon')?.trim() || undefined
        };
        // Basic validation
        if (!station.name || !station.url || !station.country || !station.countryCode || !station.genre) {
            Toast.show('Please fill in all required fields', 'error');
            return;
        }
        const submitBtn = this.querySelector('.cs-btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding…';
        }
        try {
            const result = await this.bridge.customStations.add(station);
            if (result.success) {
                Toast.show(`"${station.name}" added successfully`, 'success');
                this.closeForm();
                await this.loadStations();
            }
            else {
                Toast.show(result.error?.message || 'Failed to add station', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Add Station`;
                }
            }
        }
        catch {
            Toast.show('Failed to add station', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    }
    async handleEditStation(form, stationId) {
        const data = new FormData(form);
        const updates = {
            name: data.get('name').trim(),
            url: data.get('url').trim(),
            country: data.get('country').trim(),
            countryCode: data.get('countryCode').trim().toUpperCase(),
            genre: data.get('genre').trim(),
            description: data.get('description')?.trim() || undefined,
            favicon: data.get('favicon')?.trim() || undefined
        };
        // Basic validation
        if (!updates.name || !updates.url || !updates.country || !updates.countryCode || !updates.genre) {
            Toast.show('Please fill in all required fields', 'error');
            return;
        }
        const submitBtn = this.querySelector('.cs-btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving…';
        }
        try {
            const result = await this.bridge.customStations.update(stationId, updates);
            if (result.success) {
                Toast.show(`"${updates.name}" updated successfully`, 'success');
                this.closeForm();
                await this.loadStations();
            }
            else {
                Toast.show(result.error?.message || 'Failed to update station', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save Changes`;
                }
            }
        }
        catch {
            Toast.show('Failed to update station', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    }
    async handleDeleteStation(id) {
        const station = this.stations.find(s => s.id === id);
        if (!station)
            return;
        const confirmed = await ConfirmModal.show({
            title: 'Delete Station',
            message: `"${station.name}" will be permanently removed from your stations.`,
            confirmLabel: 'Delete',
            cancelLabel: 'Keep it',
            danger: true,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.75"
        stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>`
        });
        if (!confirmed)
            return;
        try {
            const result = await this.bridge.customStations.remove(id);
            if (result.success) {
                Toast.show(`"${station.name}" deleted`, 'success');
                await this.loadStations();
            }
            else {
                Toast.show(result.error?.message || 'Failed to delete station', 'error');
            }
        }
        catch {
            Toast.show('Failed to delete station', 'error');
        }
    }
    // ── Helpers ───────────────────────────────────────────────
    esc(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
