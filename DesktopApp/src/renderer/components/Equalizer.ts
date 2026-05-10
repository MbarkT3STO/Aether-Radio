import { BaseComponent } from './base/BaseComponent'
import { EqualizerService } from '../services/EqualizerService'
import { BridgeService } from '../services/BridgeService'
import type { EqualizerBands, EqualizerPreset } from '../../domain/entities/AppSettings'
import { EQUALIZER_PRESETS } from '../../domain/entities/AppSettings'

/**
 * Equalizer — 5-band EQ with preset selector.
 * Renders as a modal overlay (like the About modal pattern).
 */
export class Equalizer {
  private static overlay: HTMLElement | null = null
  private static eq = EqualizerService.getInstance()
  private static bridge = BridgeService.getInstance()

  static show(): void {
    if (Equalizer.overlay) return
    Equalizer.render()
  }

  static hide(): void {
    if (!Equalizer.overlay) return
    Equalizer.overlay.classList.add('eq-modal--closing')
    setTimeout(() => {
      Equalizer.overlay?.remove()
      Equalizer.overlay = null
    }, 200)
  }

  private static render(): void {
    const overlay = document.createElement('div')
    overlay.className = 'eq-modal-overlay'
    overlay.innerHTML = Equalizer.template()
    document.body.appendChild(overlay)
    Equalizer.overlay = overlay

    requestAnimationFrame(() => overlay.classList.add('eq-modal--open'))

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Equalizer.hide()
    })

    // Close button
    overlay.querySelector('#eq-close')?.addEventListener('click', () => Equalizer.hide())

    // Preset buttons
    overlay.querySelectorAll<HTMLElement>('[data-eq-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.eqPreset as EqualizerPreset
        Equalizer.eq.setPreset(preset)
        Equalizer.updateUI()
        Equalizer.persistSettings()
      })
    })

    // Band sliders
    overlay.querySelectorAll<HTMLInputElement>('[data-eq-band]').forEach(slider => {
      slider.addEventListener('input', () => {
        const band = slider.dataset.eqBand as keyof EqualizerBands
        const value = parseFloat(slider.value)
        Equalizer.eq.setBand(band, value)
        Equalizer.updateUI()
        Equalizer.persistSettings()
      })
    })

    // Reset button
    overlay.querySelector('#eq-reset')?.addEventListener('click', () => {
      Equalizer.eq.setPreset('flat')
      Equalizer.updateUI()
      Equalizer.persistSettings()
    })
  }

  private static updateUI(): void {
    if (!Equalizer.overlay) return
    const bands = Equalizer.eq.bands
    const preset = Equalizer.eq.preset

    // Update preset buttons
    Equalizer.overlay.querySelectorAll<HTMLElement>('[data-eq-preset]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.eqPreset === preset)
    })

    // Update sliders
    const bandKeys: (keyof EqualizerBands)[] = ['bass', 'lowMid', 'mid', 'highMid', 'treble']
    bandKeys.forEach(key => {
      const slider = Equalizer.overlay?.querySelector<HTMLInputElement>(`[data-eq-band="${key}"]`)
      const label = Equalizer.overlay?.querySelector<HTMLElement>(`[data-eq-value="${key}"]`)
      if (slider) slider.value = String(bands[key])
      if (label) label.textContent = `${bands[key] > 0 ? '+' : ''}${bands[key]} dB`
    })
  }

  private static async persistSettings(): Promise<void> {
    await Equalizer.bridge.settings.update({
      equalizerPreset: Equalizer.eq.preset,
      equalizerBands: Equalizer.eq.bands,
    })
  }

  private static template(): string {
    const bands = Equalizer.eq.bands
    const preset = Equalizer.eq.preset

    const presets: { id: EqualizerPreset; label: string }[] = [
      { id: 'flat', label: 'Flat' },
      { id: 'rock', label: 'Rock' },
      { id: 'jazz', label: 'Jazz' },
      { id: 'vocal', label: 'Vocal' },
      { id: 'bass-boost', label: 'Bass+' },
      { id: 'treble-boost', label: 'Treble+' },
      { id: 'electronic', label: 'Electronic' },
    ]

    const bandDefs: { key: keyof EqualizerBands; label: string; freq: string }[] = [
      { key: 'bass', label: 'Bass', freq: '60 Hz' },
      { key: 'lowMid', label: 'Low Mid', freq: '250 Hz' },
      { key: 'mid', label: 'Mid', freq: '1 kHz' },
      { key: 'highMid', label: 'High Mid', freq: '4 kHz' },
      { key: 'treble', label: 'Treble', freq: '12 kHz' },
    ]

    return `
      <div class="eq-modal">
        <div class="eq-modal-header">
          <h2 class="eq-modal-title">Equalizer</h2>
          <button class="eq-modal-close" id="eq-close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M1 1L13 13M13 1L1 13"/>
            </svg>
          </button>
        </div>

        <div class="eq-presets">
          ${presets.map(p => `
            <button class="eq-preset-btn ${p.id === preset ? 'active' : ''}" data-eq-preset="${p.id}">
              ${p.label}
            </button>
          `).join('')}
        </div>

        <div class="eq-bands">
          ${bandDefs.map(b => `
            <div class="eq-band">
              <span class="eq-band-value" data-eq-value="${b.key}">${bands[b.key] > 0 ? '+' : ''}${bands[b.key]} dB</span>
              <input type="range" class="eq-band-slider" data-eq-band="${b.key}"
                min="-12" max="12" step="1" value="${bands[b.key]}"
                aria-label="${b.label}">
              <span class="eq-band-label">${b.freq}</span>
            </div>
          `).join('')}
        </div>

        <button class="eq-reset-btn" id="eq-reset">Reset to Flat</button>
      </div>
    `
  }
}
