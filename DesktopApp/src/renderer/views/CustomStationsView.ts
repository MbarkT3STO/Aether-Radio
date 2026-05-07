import { BaseComponent } from '../components/base/BaseComponent'
import type { CustomStation } from '../../domain/entities/CustomStation'
import { Toast } from '../components/Toast'
import { ConfirmModal } from '../components/ConfirmModal'
import { PlayerStore } from '../store/PlayerStore'
import { EventBus } from '../store/EventBus'
import { stationLogoHtml } from '../utils/stationLogo'

export class CustomStationsView extends BaseComponent {
  private stations: CustomStation[] = []
  private showAddForm = false
  private editingId: string | null = null
  private playerStore = PlayerStore.getInstance()
  private eventBus = EventBus.getInstance()
  private unsubscribers: Array<() => void> = []

  // ── Data ──────────────────────────────────────────────────

  private async loadStations(): Promise<void> {
    try {
      const result = await window.electronAPI.getCustomStations()
      if (result.success && result.data) {
        this.stations = result.data
        this.renderList()
      }
    } catch {
      Toast.show('Failed to load custom stations', 'error')
    }
  }

  // ── Render ────────────────────────────────────────────────

  render(): string {
    return `
      <div class="custom-stations-view animate-fade-in">

        <!-- Header -->
        <div class="cs-header">
          <div>
            <div class="view-header-row">
              <div class="view-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.75"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
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
    `
  }

  protected afterMount(): void {
    this.loadStations()
    this.bindHeaderBtn()

    // Keep cards in sync with player bar state changes — store unsubscribers
    this.unsubscribers.push(
      this.eventBus.on('player:play',  () => this.syncPlayingState()),
      this.eventBus.on('player:pause', () => this.syncPlayingState()),
      this.eventBus.on('player:stop',  () => this.syncPlayingState())
    )
  }

  protected beforeUnmount(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
  }

  // ── Sync playing state without full re-render ─────────────

  private syncPlayingState(): void {
    const isPlaying  = this.playerStore.isPlaying
    const currentId  = this.playerStore.currentStation?.id ?? null

    this.querySelectorAll<HTMLElement>('.cs-card').forEach(card => {
      const id = card.getAttribute('data-id')
      const isThisPlaying = isPlaying && id === currentId

      // Toggle playing border class on the card
      card.classList.toggle('cs-card--playing', isThisPlaying)

      // Update the play button label + icon
      const playBtn = card.querySelector<HTMLElement>('.cs-play-btn')
      if (playBtn) {
        playBtn.title = isThisPlaying ? 'Now playing' : 'Play'
        playBtn.innerHTML = isThisPlaying
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Playing`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`
      }

      // Show/hide the live badge
      const header = card.querySelector<HTMLElement>('.cs-card-header')
      if (header) {
        const existingBadge = header.querySelector('.cs-playing-badge')
        if (isThisPlaying && !existingBadge) {
          header.insertAdjacentHTML('beforeend', `
            <div class="cs-playing-badge">
              <span class="cs-playing-dot"></span>
              Live
            </div>`)
        } else if (!isThisPlaying && existingBadge) {
          existingBadge.remove()
        }
      }
    })
  }

  // ── Header button ─────────────────────────────────────────

  private bindHeaderBtn(): void {
    this.renderHeaderBtn()
    const slot = this.querySelector('#header-btn-slot')
    if (!slot) return
    this.on(slot, 'click', (e) => {
      const btn = (e.target as HTMLElement).closest('#add-station-btn')
      if (btn) this.openForm()
    })
  }

  private renderHeaderBtn(): void {
    const slot = this.querySelector('#header-btn-slot')
    if (!slot) return
    slot.innerHTML = this.showAddForm ? '' : `
      <button id="add-station-btn" class="cs-add-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
        Add Station
      </button>
    `
  }

  // ── Form ──────────────────────────────────────────────────

  private openForm(): void {
    this.showAddForm = true
    this.editingId = null
    this.renderHeaderBtn()
    this.renderForm()
  }

  private closeForm(): void {
    this.showAddForm = false
    this.editingId = null
    this.renderHeaderBtn()
    const slot = this.querySelector('#form-slot')
    if (slot) slot.innerHTML = ''
  }

  private openEditForm(station: CustomStation): void {
    this.showAddForm = true
    this.editingId = station.id
    this.renderHeaderBtn()
    this.renderForm(station)
  }

  private renderForm(prefill?: CustomStation): void {
    const slot = this.querySelector('#form-slot')
    if (!slot) return

    const isEdit = !!prefill

    slot.innerHTML = `
      <div class="cs-form-card">
        <div class="cs-form-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isEdit
              ? `<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                 <path d="m15 5 4 4"/>`
              : `<path d="M5 12h14"/><path d="M12 5v14"/>`
            }
          </svg>
          ${isEdit ? `Edit "${this.esc(prefill!.name)}"` : 'Add New Station'}
        </div>

        <form id="add-station-form" class="cs-form" autocomplete="off" novalidate>

          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-name">Station Name <span class="cs-required">*</span></label>
              <input type="text" id="cs-name" name="name" placeholder="e.g., My Radio Station"
                value="${prefill ? this.esc(prefill.name) : ''}">
              <span class="cs-field-error" id="err-name"></span>
            </div>
            <div class="cs-form-group">
              <label for="cs-genre">Genre <span class="cs-required">*</span></label>
              <input type="text" id="cs-genre" name="genre" placeholder="e.g., Pop, Rock, News"
                value="${prefill ? this.esc(prefill.genre) : ''}">
              <span class="cs-field-error" id="err-genre"></span>
            </div>
          </div>

          <div class="cs-form-group">
            <label for="cs-url">Stream URL <span class="cs-required">*</span></label>
            <input type="text" id="cs-url" name="url" placeholder="https://example.com/stream"
              value="${prefill ? this.esc(prefill.url) : ''}">
            <span class="cs-field-error" id="err-url"></span>
          </div>

          <div class="cs-form-row">
            <div class="cs-form-group">
              <label for="cs-country">Country <span class="cs-required">*</span></label>
              <input type="text" id="cs-country" name="country" placeholder="e.g., Morocco"
                value="${prefill ? this.esc(prefill.country) : ''}">
              <span class="cs-field-error" id="err-country"></span>
            </div>
            <div class="cs-form-group">
              <label for="cs-code">Country Code <span class="cs-required">*</span></label>
              <input type="text" id="cs-code" name="countryCode" placeholder="MA" maxlength="2"
                style="text-transform:uppercase"
                value="${prefill ? this.esc(prefill.countryCode) : ''}">
              <span class="cs-field-error" id="err-code"></span>
            </div>
          </div>

          <div class="cs-form-group">
            <label for="cs-favicon">Logo URL <span class="cs-optional">(optional)</span></label>
            <input type="text" id="cs-favicon" name="favicon" placeholder="https://example.com/logo.png"
              value="${prefill?.favicon ? this.esc(prefill.favicon) : ''}">
            <span class="cs-field-error" id="err-favicon"></span>
          </div>

          <div class="cs-form-group">
            <label for="cs-desc">Description <span class="cs-optional">(optional)</span></label>
            <textarea id="cs-desc" name="description" rows="2" placeholder="Short description…">${prefill?.description ? this.esc(prefill.description) : ''}</textarea>
          </div>

          <div class="cs-form-actions">
            <button type="submit" class="cs-btn-submit">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              ${isEdit ? 'Save Changes' : 'Add Station'}
            </button>
            <button type="button" id="cs-cancel-btn" class="cs-btn-cancel">Cancel</button>
          </div>

        </form>
      </div>
    `

    const form = this.querySelector<HTMLFormElement>('#add-station-form')
    const cancelBtn = this.querySelector('#cs-cancel-btn')

    // Clear error on input so feedback is immediate
    form?.querySelectorAll('input').forEach(input => {
      this.on(input, 'input', () => this.clearFieldError(input.name))
    })

    if (form) {
      this.on(form, 'submit', async (e) => {
        e.preventDefault()
        if (isEdit && this.editingId) {
          await this.handleEditStation(form, this.editingId)
        } else {
          await this.handleAddStation(form)
        }
      })
    }
    if (cancelBtn) {
      this.on(cancelBtn, 'click', () => this.closeForm())
    }
  }

  // ── List ──────────────────────────────────────────────────

  private renderList(): void {
    const listEl = this.querySelector('#stations-list')
    if (!listEl) return

    if (this.stations.length === 0) {
      listEl.innerHTML = `
        <div class="cs-empty">
          <div class="cs-empty-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
            </svg>
          </div>
          <div class="cs-empty-title">No custom stations yet</div>
          <div class="cs-empty-subtitle">Add your own radio streams to listen alongside stations from Radio Browser</div>
          <button class="cs-empty-cta" id="cs-empty-add-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Add Your First Station
          </button>
        </div>
      `
      // Wire up empty state CTA
      const emptyBtn = this.querySelector('#cs-empty-add-btn')
      if (emptyBtn) this.on(emptyBtn, 'click', () => this.openForm())
      return
    }

    listEl.innerHTML = `
      <div class="cs-count">${this.stations.length} station${this.stations.length !== 1 ? 's' : ''}</div>
      <div class="cs-grid">
        ${this.stations.map(s => this.renderCard(s)).join('')}
      </div>
    `

    // Bind card buttons
    this.querySelectorAll('.cs-play-btn').forEach(btn => {
      this.on(btn, 'click', (e) => {
        e.stopPropagation()
        const id = (btn as HTMLElement).getAttribute('data-id')
        const station = this.stations.find(s => s.id === id)
        if (station) this.playStation(station)
      })
    })

    this.querySelectorAll('.cs-edit-btn').forEach(btn => {
      this.on(btn, 'click', (e) => {
        e.stopPropagation()
        const id = (btn as HTMLElement).getAttribute('data-id')
        const station = this.stations.find(s => s.id === id)
        if (station) this.openEditForm(station)
      })
    })

    this.querySelectorAll('.cs-delete-btn').forEach(btn => {
      this.on(btn, 'click', async (e) => {
        e.stopPropagation()
        const id = (btn as HTMLElement).getAttribute('data-id')
        if (id) await this.handleDeleteStation(id)
      })
    })

    // Click card to play
    this.querySelectorAll('.cs-card').forEach(card => {
      this.on(card, 'click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('.cs-play-btn') || target.closest('.cs-edit-btn') || target.closest('.cs-delete-btn')) return
        const id = (card as HTMLElement).getAttribute('data-id')
        const station = this.stations.find(s => s.id === id)
        if (station) this.playStation(station)
      })
    })
  }

  private renderCard(station: CustomStation): string {
    const isPlaying = this.playerStore.currentStation?.id === station.id && this.playerStore.isPlaying

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
              : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`
            }
          </button>
          <button class="cs-edit-btn" data-id="${station.id}" title="Edit station">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
          <button class="cs-delete-btn" data-id="${station.id}" title="Delete station">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>

      </div>
    `
  }

  // ── Validation ────────────────────────────────────────────

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  private setFieldError(fieldName: string, message: string): void {
    const errEl = this.querySelector(`#err-${fieldName}`)
    const input = this.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)
    if (errEl) {
      errEl.textContent = message
      errEl.classList.add('visible')
    }
    if (input) input.classList.add('cs-input--error')
  }

  private clearFieldError(fieldName: string): void {
    const errEl = this.querySelector(`#err-${fieldName}`)
    const input = this.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)
    if (errEl) {
      errEl.textContent = ''
      errEl.classList.remove('visible')
    }
    if (input) input.classList.remove('cs-input--error')
  }

  private clearAllErrors(): void {
    this.querySelectorAll('.cs-field-error').forEach(el => {
      el.textContent = ''
      el.classList.remove('visible')
    })
    this.querySelectorAll('.cs-input--error').forEach(el => {
      el.classList.remove('cs-input--error')
    })
  }

  private validateForm(data: FormData): boolean {
    this.clearAllErrors()
    let valid = true

    const name        = (data.get('name') as string).trim()
    const genre       = (data.get('genre') as string).trim()
    const url         = (data.get('url') as string).trim()
    const country     = (data.get('country') as string).trim()
    const countryCode = (data.get('countryCode') as string).trim()
    const favicon     = (data.get('favicon') as string).trim()

    if (!name) {
      this.setFieldError('name', 'Station name is required')
      valid = false
    } else if (name.length < 2) {
      this.setFieldError('name', 'Name must be at least 2 characters')
      valid = false
    }

    if (!genre) {
      this.setFieldError('genre', 'Genre is required')
      valid = false
    }

    if (!url) {
      this.setFieldError('url', 'Stream URL is required')
      valid = false
    } else if (!this.isValidUrl(url)) {
      this.setFieldError('url', 'Must be a valid URL starting with http:// or https://')
      valid = false
    }

    if (!country) {
      this.setFieldError('country', 'Country is required')
      valid = false
    }

    if (!countryCode) {
      this.setFieldError('code', 'Country code is required')
      valid = false
    } else if (countryCode.length !== 2 || !/^[A-Za-z]{2}$/.test(countryCode)) {
      this.setFieldError('code', 'Must be a 2-letter code (e.g. US)')
      valid = false
    }

    if (favicon && !this.isValidUrl(favicon)) {
      this.setFieldError('favicon', 'Must be a valid URL or leave empty')
      valid = false
    }

    // Focus the first invalid field
    if (!valid) {
      const firstError = this.querySelector<HTMLInputElement>('.cs-input--error')
      firstError?.focus()
    }

    return valid
  }

  // ── Actions ───────────────────────────────────────────────

  private playStation(station: CustomStation): void {
    // If this station is already playing, pause it instead of restarting
    if (this.playerStore.currentStation?.id === station.id && this.playerStore.isPlaying) {
      this.playerStore.pause()
      return
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
    })
  }

  private async handleAddStation(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)

    if (!this.validateForm(data)) return

    const station: Omit<CustomStation, 'addedAt' | 'source'> = {
      id:          `custom-${Date.now()}`,
      name:        (data.get('name') as string).trim(),
      url:         (data.get('url') as string).trim(),
      country:     (data.get('country') as string).trim(),
      countryCode: (data.get('countryCode') as string).trim().toUpperCase(),
      genre:       (data.get('genre') as string).trim(),
      description: (data.get('description') as string)?.trim() || undefined,
      favicon:     (data.get('favicon') as string)?.trim() || undefined
    }

    const submitBtn = this.querySelector<HTMLButtonElement>('.cs-btn-submit')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Adding…' }

    try {
      const result = await window.electronAPI.addCustomStation(station)
      if (result.success) {
        Toast.show(`"${station.name}" added successfully`, 'success')
        this.closeForm()
        await this.loadStations()
      } else {
        Toast.show(result.error?.message || 'Failed to add station', 'error')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Add Station`
        }
      }
    } catch {
      Toast.show('Failed to add station', 'error')
      if (submitBtn) { submitBtn.disabled = false }
    }
  }

  private async handleEditStation(form: HTMLFormElement, stationId: string): Promise<void> {
    const data = new FormData(form)

    if (!this.validateForm(data)) return

    const updates: Partial<CustomStation> = {
      name:        (data.get('name') as string).trim(),
      url:         (data.get('url') as string).trim(),
      country:     (data.get('country') as string).trim(),
      countryCode: (data.get('countryCode') as string).trim().toUpperCase(),
      genre:       (data.get('genre') as string).trim(),
      description: (data.get('description') as string)?.trim() || undefined,
      favicon:     (data.get('favicon') as string)?.trim() || undefined
    }

    const submitBtn = this.querySelector<HTMLButtonElement>('.cs-btn-submit')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…' }

    try {
      const result = await window.electronAPI.updateCustomStation(stationId, updates)
      if (result.success) {
        Toast.show(`"${updates.name}" updated successfully`, 'success')
        this.closeForm()
        await this.loadStations()
      } else {
        Toast.show(result.error?.message || 'Failed to update station', 'error')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save Changes`
        }
      }
    } catch {
      Toast.show('Failed to update station', 'error')
      if (submitBtn) { submitBtn.disabled = false }
    }
  }

  private async handleDeleteStation(id: string): Promise<void> {
    const station = this.stations.find(s => s.id === id)
    if (!station) return

    const confirmed = await ConfirmModal.show({
      title: 'Delete Station',
      message: `"${station.name}" will be permanently removed from your stations.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
      danger: true,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.75"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
      </svg>`
    })

    if (!confirmed) return

    try {
      const result = await window.electronAPI.removeCustomStation(id)
      if (result.success) {
        Toast.show(`"${station.name}" deleted`, 'success')
        await this.loadStations()
      } else {
        Toast.show(result.error?.message || 'Failed to delete station', 'error')
      }
    } catch {
      Toast.show('Failed to delete station', 'error')
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
