import { BaseComponent } from '../components/base/BaseComponent'
import type { CustomStation } from '../domain/entities/CustomStation'
import { BridgeService } from '../services/BridgeService'
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'
import { stationLogoHtml } from '../utils/stationLogo'

function toast(message: string, type = 'info'): void {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
}

export class CustomStationsView extends BaseComponent {
  private bridge      = BridgeService.getInstance()
  private playerStore = PlayerStore.getInstance()
  private eventBus    = EventBus.getInstance()
  private stations: CustomStation[] = []
  private showAddForm = false
  private editingId: string | null = null
  private unsubscribers: Array<() => void> = []

  private async loadStations(): Promise<void> {
    const result = await this.bridge.customStations.getAll()
    if (result.success) { this.stations = result.data; this.renderList() }
    else toast('Failed to load custom stations', 'error')
  }

  render(): string {
    return `
      <div class="custom-stations-view animate-fade-in">
        <div class="cs-header">
          <div>
            <div class="view-header-row">
              <div class="view-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>
              </div>
              <h1>My Stations</h1>
            </div>
            <p class="view-subtitle">Manage your custom radio streams</p>
          </div>
          <div id="header-btn-slot"></div>
        </div>
        <div id="form-slot"></div>
        <div id="stations-list"></div>
      </div>`
  }

  protected afterMount(): void {
    void this.loadStations()
    this.bindHeaderBtn()
    this.unsubscribers.push(
      this.eventBus.on('player:play',  () => this.syncPlayingState()),
      this.eventBus.on('player:pause', () => this.syncPlayingState()),
      this.eventBus.on('player:stop',  () => this.syncPlayingState())
    )
  }

  protected beforeUnmount(): void {
    this.unsubscribers.forEach(u => u())
    this.unsubscribers = []
  }

  private syncPlayingState(): void {
    const isPlaying = this.playerStore.isPlaying
    const currentId = this.playerStore.currentStation?.id ?? null
    this.querySelectorAll<HTMLElement>('.cs-card').forEach(card => {
      const id = card.getAttribute('data-id')
      const active = isPlaying && id === currentId
      card.classList.toggle('cs-card--playing', active)
      const playBtn = card.querySelector<HTMLElement>('.cs-play-btn')
      if (playBtn) {
        playBtn.innerHTML = active
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Playing`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`
      }
    })
  }

  private bindHeaderBtn(): void {
    this.renderHeaderBtn()
    const slot = this.querySelector('#header-btn-slot')
    if (slot) this.on(slot, 'click', (e) => {
      if ((e.target as HTMLElement).closest('#add-station-btn')) this.openForm()
    })
  }

  private renderHeaderBtn(): void {
    const slot = this.querySelector('#header-btn-slot')
    if (!slot) return
    slot.innerHTML = this.showAddForm ? '' : `
      <button id="add-station-btn" class="cs-add-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Station
      </button>`
  }

  private openForm(): void { this.showAddForm = true; this.editingId = null; this.renderHeaderBtn(); this.renderForm() }
  private closeForm(): void {
    this.showAddForm = false; this.editingId = null; this.renderHeaderBtn()
    const slot = this.querySelector('#form-slot'); if (slot) slot.innerHTML = ''
  }
  private openEditForm(s: CustomStation): void { this.showAddForm = true; this.editingId = s.id; this.renderHeaderBtn(); this.renderForm(s) }

  private renderForm(prefill?: CustomStation): void {
    const slot = this.querySelector('#form-slot')
    if (!slot) return
    const isEdit = !!prefill
    slot.innerHTML = `
      <div class="cs-form-card">
        <div class="cs-form-title">${isEdit ? `Edit "${this.esc(prefill!.name)}"` : 'Add New Station'}</div>
        <form id="add-station-form" class="cs-form" autocomplete="off">
          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-name">Name <span class="cs-required">*</span></label>
              <input type="text" id="cs-name" name="name" required placeholder="My Radio Station" value="${prefill ? this.esc(prefill.name) : ''}">
            </div>
            <div class="cs-form-group">
              <label for="cs-genre">Genre <span class="cs-required">*</span></label>
              <input type="text" id="cs-genre" name="genre" required placeholder="Pop, Rock…" value="${prefill ? this.esc(prefill.genre) : ''}">
            </div>
          </div>
          <div class="cs-form-group">
            <label for="cs-url">Stream URL <span class="cs-required">*</span></label>
            <input type="url" id="cs-url" name="url" required placeholder="https://example.com/stream" value="${prefill ? this.esc(prefill.url) : ''}">
          </div>
          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-country">Country <span class="cs-required">*</span></label>
              <input type="text" id="cs-country" name="country" required placeholder="Morocco" value="${prefill ? this.esc(prefill.country) : ''}">
            </div>
            <div class="cs-form-group">
              <label for="cs-code">Code <span class="cs-required">*</span></label>
              <input type="text" id="cs-code" name="countryCode" required placeholder="MA" maxlength="2" style="text-transform:uppercase" value="${prefill ? this.esc(prefill.countryCode) : ''}">
            </div>
          </div>
          <div class="cs-form-group">
            <label for="cs-favicon">Logo URL <span class="cs-optional">(optional)</span></label>
            <input type="url" id="cs-favicon" name="favicon" placeholder="https://example.com/logo.png" value="${prefill?.favicon ? this.esc(prefill.favicon) : ''}">
          </div>
          <div class="cs-form-actions">
            <button type="submit" class="cs-btn-submit">${isEdit ? 'Save Changes' : 'Add Station'}</button>
            <button type="button" id="cs-cancel-btn" class="cs-btn-cancel">Cancel</button>
          </div>
        </form>
      </div>`
    const form = this.querySelector<HTMLFormElement>('#add-station-form')
    const cancelBtn = this.querySelector('#cs-cancel-btn')
    if (form) this.on(form, 'submit', async (e) => {
      e.preventDefault()
      if (isEdit && this.editingId) await this.handleEdit(form, this.editingId)
      else await this.handleAdd(form)
    })
    if (cancelBtn) this.on(cancelBtn, 'click', () => this.closeForm())
  }

  private renderList(): void {
    const listEl = this.querySelector('#stations-list')
    if (!listEl) return
    if (this.stations.length === 0) {
      listEl.innerHTML = `
        <div class="cs-empty">
          <div class="cs-empty-title">No custom stations yet</div>
          <div class="cs-empty-subtitle">Add your own radio streams</div>
          <button class="cs-empty-cta" id="cs-empty-add-btn">Add Your First Station</button>
        </div>`
      const btn = this.querySelector('#cs-empty-add-btn')
      if (btn) this.on(btn, 'click', () => this.openForm())
      return
    }
    listEl.innerHTML = `
      <div class="cs-count">${this.stations.length} station${this.stations.length !== 1 ? 's' : ''}</div>
      <div class="cs-grid">${this.stations.map(s => this.renderCard(s)).join('')}</div>`
    this.querySelectorAll('.cs-play-btn').forEach(btn => {
      this.on(btn, 'click', (e) => { e.stopPropagation(); const s = this.stations.find(x => x.id === (btn as HTMLElement).getAttribute('data-id')); if (s) this.playStation(s) })
    })
    this.querySelectorAll('.cs-edit-btn').forEach(btn => {
      this.on(btn, 'click', (e) => { e.stopPropagation(); const s = this.stations.find(x => x.id === (btn as HTMLElement).getAttribute('data-id')); if (s) this.openEditForm(s) })
    })
    this.querySelectorAll('.cs-delete-btn').forEach(btn => {
      this.on(btn, 'click', async (e) => { e.stopPropagation(); const id = (btn as HTMLElement).getAttribute('data-id'); if (id) await this.handleDelete(id) })
    })
    this.querySelectorAll('.cs-card').forEach(card => {
      this.on(card, 'click', (e) => {
        if ((e.target as HTMLElement).closest('.cs-play-btn,.cs-edit-btn,.cs-delete-btn')) return
        const s = this.stations.find(x => x.id === (card as HTMLElement).getAttribute('data-id'))
        if (s) this.playStation(s)
      })
    })
  }

  private renderCard(s: CustomStation): string {
    const playing = this.playerStore.currentStation?.id === s.id && this.playerStore.isPlaying
    return `
      <div class="cs-card${playing ? ' cs-card--playing' : ''}" data-id="${s.id}">
        <div class="cs-card-header">
          ${stationLogoHtml(s.favicon, s.name, 'card')}
          <div class="cs-card-info">
            <div class="cs-card-name">${this.esc(s.name)}</div>
            <div class="cs-card-meta">${this.esc(s.country)} · ${this.esc(s.genre)}</div>
          </div>
        </div>
        <div class="cs-card-url">${this.esc(s.url)}</div>
        <div class="cs-card-actions">
          <button class="cs-play-btn" data-id="${s.id}">${playing ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Playing` : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`}</button>
          <button class="cs-edit-btn" data-id="${s.id}" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="cs-delete-btn" data-id="${s.id}" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>`
  }

  private playStation(s: CustomStation): void {
    if (this.playerStore.currentStation?.id === s.id && this.playerStore.isPlaying) { this.playerStore.pause(); return }
    this.playerStore.play({ id: s.id, name: s.name, url: s.url, urlResolved: s.url, homepage: '', favicon: s.favicon ?? '', country: s.country, countryCode: s.countryCode, state: '', language: '', tags: s.genre ? [s.genre] : [], codec: '', bitrate: 0, votes: 0, clickCount: 0, clickTrend: 0, lastCheckOk: true, lastChangeTime: '', hls: false })
  }

  private async handleAdd(form: HTMLFormElement): Promise<void> {
    const d = new FormData(form)
    const station = { id: `custom-${Date.now()}`, name: (d.get('name') as string).trim(), url: (d.get('url') as string).trim(), country: (d.get('country') as string).trim(), countryCode: (d.get('countryCode') as string).trim().toUpperCase(), genre: (d.get('genre') as string).trim(), favicon: (d.get('favicon') as string)?.trim() || undefined }
    if (!station.name || !station.url || !station.country || !station.countryCode || !station.genre) { toast('Please fill in all required fields', 'error'); return }
    const result = await this.bridge.customStations.add(station)
    if (result.success) { toast(`"${station.name}" added`, 'success'); this.closeForm(); await this.loadStations() }
    else toast('Failed to add station', 'error')
  }

  private async handleEdit(form: HTMLFormElement, id: string): Promise<void> {
    const d = new FormData(form)
    const updates = { name: (d.get('name') as string).trim(), url: (d.get('url') as string).trim(), country: (d.get('country') as string).trim(), countryCode: (d.get('countryCode') as string).trim().toUpperCase(), genre: (d.get('genre') as string).trim(), favicon: (d.get('favicon') as string)?.trim() || undefined }
    if (!updates.name || !updates.url || !updates.country || !updates.countryCode || !updates.genre) { toast('Please fill in all required fields', 'error'); return }
    const result = await this.bridge.customStations.update(id, updates)
    if (result.success) { toast(`"${updates.name}" updated`, 'success'); this.closeForm(); await this.loadStations() }
    else toast('Failed to update station', 'error')
  }

  private async handleDelete(id: string): Promise<void> {
    const s = this.stations.find(x => x.id === id)
    if (!s) return
    if (!confirm(`Delete "${s.name}"?`)) return
    const result = await this.bridge.customStations.remove(id)
    if (result.success) { toast(`"${s.name}" deleted`, 'success'); await this.loadStations() }
    else toast('Failed to delete station', 'error')
  }

  private esc(t: string): string {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
}
