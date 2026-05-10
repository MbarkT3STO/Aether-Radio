import { EventBus } from '../store/EventBus'
import type { EqualizerBands, EqualizerPreset } from '../../domain/entities/AppSettings'
import { EQUALIZER_PRESETS } from '../../domain/entities/AppSettings'

/**
 * EqualizerService — 5-band parametric EQ using Web Audio BiquadFilterNodes.
 * Bands: 60Hz (bass), 250Hz (low-mid), 1kHz (mid), 4kHz (high-mid), 12kHz (treble)
 *
 * Must be initialized AFTER the AudioContext is created (by VisualizerService).
 * Inserts itself into the audio chain: source → EQ filters → analyser → destination
 */
export class EqualizerService {
  private static instance: EqualizerService
  private eventBus = EventBus.getInstance()

  private filters: BiquadFilterNode[] = []
  private audioContext: AudioContext | null = null
  private _preset: EqualizerPreset = 'flat'
  private _bands: EqualizerBands = { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 }
  private _enabled = true

  private static readonly FREQUENCIES = [60, 250, 1000, 4000, 12000]
  private static readonly FILTER_TYPES: BiquadFilterType[] = [
    'lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'
  ]
  private static readonly Q_VALUES = [0.7, 1.2, 1.0, 1.2, 0.7]

  private constructor() {}

  static getInstance(): EqualizerService {
    if (!EqualizerService.instance) {
      EqualizerService.instance = new EqualizerService()
    }
    return EqualizerService.instance
  }

  get preset(): EqualizerPreset { return this._preset }
  get bands(): EqualizerBands { return { ...this._bands } }
  get enabled(): boolean { return this._enabled }

  /**
   * Initialize the EQ filter chain. Call after AudioContext is available.
   * Reconnects the audio graph: source → filters → nextNode
   */
  initialize(
    audioContext: AudioContext,
    sourceNode: AudioNode,
    destinationNode: AudioNode
  ): void {
    this.audioContext = audioContext

    // Disconnect source from its current destination
    try { sourceNode.disconnect() } catch { /* may not be connected */ }

    // Create 5-band filter chain
    this.filters = EqualizerService.FREQUENCIES.map((freq, i) => {
      const filter = audioContext.createBiquadFilter()
      filter.type = EqualizerService.FILTER_TYPES[i]!
      filter.frequency.value = freq
      filter.gain.value = 0
      if (filter.type === 'peaking') {
        filter.Q.value = EqualizerService.Q_VALUES[i]!
      }
      return filter
    })

    // Chain: source → filter[0] → filter[1] → ... → filter[4] → destinationNode
    sourceNode.connect(this.filters[0]!)
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i]!.connect(this.filters[i + 1]!)
    }
    this.filters[this.filters.length - 1]!.connect(destinationNode)

    // Apply current bands
    this.applyBands()
  }

  /**
   * Set a named preset and apply its band values.
   */
  setPreset(preset: EqualizerPreset): void {
    this._preset = preset
    if (preset !== 'custom') {
      this._bands = { ...EQUALIZER_PRESETS[preset] }
    }
    this.applyBands()
    this.eventBus.emit('player:equalizer-changed', {
      preset: this._preset,
      bands: this.bandsArray(),
    })
  }

  /**
   * Set individual band gain (dB). Switches preset to 'custom'.
   */
  setBand(band: keyof EqualizerBands, gain: number): void {
    const clamped = Math.max(-12, Math.min(12, gain))
    this._bands[band] = clamped
    this._preset = 'custom'
    this.applyBands()
    this.eventBus.emit('player:equalizer-changed', {
      preset: 'custom',
      bands: this.bandsArray(),
    })
  }

  /**
   * Set all bands at once (e.g., restoring from settings).
   */
  setBands(bands: EqualizerBands, preset?: EqualizerPreset): void {
    this._bands = { ...bands }
    this._preset = preset ?? 'custom'
    this.applyBands()
    this.eventBus.emit('player:equalizer-changed', {
      preset: this._preset,
      bands: this.bandsArray(),
    })
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled
    this.applyBands()
  }

  private applyBands(): void {
    if (this.filters.length === 0) return
    const values = this.bandsArray()
    this.filters.forEach((filter, i) => {
      filter.gain.value = this._enabled ? values[i]! : 0
    })
  }

  private bandsArray(): number[] {
    return [
      this._bands.bass,
      this._bands.lowMid,
      this._bands.mid,
      this._bands.highMid,
      this._bands.treble,
    ]
  }
}
