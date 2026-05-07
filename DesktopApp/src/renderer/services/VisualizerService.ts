import { EventBus } from '../store/EventBus'

export class VisualizerService {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private source: MediaElementAudioSourceNode | null = null
  private animationId: number | null = null
  private activeCanvas: HTMLCanvasElement | null = null
  private themeUnsubscribe: (() => void) | null = null

  // Expose for shared-canvas use by a secondary VisualizerService instance
  get sharedAnalyser(): AnalyserNode | null { return this.analyser }
  get sharedDataArray(): Uint8Array | null  { return this.dataArray }

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.audioContext) {
      // Resume if suspended (e.g. browser blocked autoplay before user gesture)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      return
    }

    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82

    const bufferLength = this.analyser.frequencyBinCount
    this.dataArray = new Uint8Array(bufferLength)

    this.source = this.audioContext.createMediaElementSource(audioElement)
    this.source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)

    // Listen for theme changes and re-draw the gradient with the new accent color
    const eventBus = EventBus.getInstance()
    this.themeUnsubscribe = eventBus.on('theme:changed', () => {
      if (this.activeCanvas) {
        this.stopVisualization()
        this.startVisualization(this.activeCanvas)
      }
    })
  }

  startVisualization(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.dataArray) return
    this.stopVisualization()
    this.activeCanvas = canvas
    this.drawLoop(canvas)
  }

  /**
   * Start visualization on a second canvas by borrowing the analyser from
   * another VisualizerService instance that already owns the AudioContext.
   * This avoids the "HTMLMediaElement already connected" DOMException.
   */
  startVisualizationShared(
    canvas: HTMLCanvasElement,
    source: VisualizerService
  ): void {
    this.analyser  = source.sharedAnalyser
    this.dataArray = source.sharedDataArray
    if (!this.analyser || !this.dataArray) return
    this.stopVisualization()
    this.activeCanvas = canvas
    this.drawLoop(canvas)
  }

  /**
   * Ambient gradient visualizer — full-bleed canvas behind the expanded player.
   * Draws slow-moving radial blobs that pulse with audio frequency data.
   */
  startAmbientVisualization(
    canvas: HTMLCanvasElement,
    source: VisualizerService,
    large = false,
    centered = false
  ): void {
    this.analyser  = source.sharedAnalyser
    this.dataArray = source.sharedDataArray
    this.stopVisualization()
    this.activeCanvas = canvas
    this.ambientLoop(canvas, large, centered)
  }

  private ambientLoop(canvas: HTMLCanvasElement, large = false, centered = false): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // CSS accent hue/sat — Apple System Indigo (245°, 78%)
    const style   = getComputedStyle(document.documentElement)
    const h       = parseFloat(style.getPropertyValue('--h').trim()) || 245
    const s       = style.getPropertyValue('--s').trim() || '78%'
    const isDark  = document.documentElement.getAttribute('data-theme') === 'dark'

    // Three blobs: indigo center, blue-shifted right, violet-shifted bottom
    const blobs = [
      { hueOff: 0,   x: centered ? 0.40 : 0.25, y: 0.40, phase: 0,   speed: 0.0007, freqBin: 2  },
      { hueOff: 25,  x: centered ? 0.60 : 0.72, y: 0.35, phase: 2.1, speed: 0.0011, freqBin: 8  },
      { hueOff: -20, x: 0.50,                   y: 0.70, phase: 4.3, speed: 0.0009, freqBin: 14 },
    ]

    let t = 0

    const draw = (): void => {
      this.animationId = requestAnimationFrame(draw)
      t++

      const dpr  = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const pw   = Math.round(rect.width  * dpr)
      const ph   = Math.round(rect.height * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width  = pw
        canvas.height = ph
      }

      const w  = canvas.width
      const hh = canvas.height

      // Apply blur via shadowBlur on each blob instead of CSS filter
      ctx.clearRect(0, 0, w, hh)

      // Pull fresh frequency data every frame
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray)
      }

      const freqData = this.dataArray
      const getEnergy = (bin: number): number =>
        freqData ? (freqData[bin] ?? 0) / 255 : 0.3

      for (const blob of blobs) {
        const energy = getEnergy(blob.freqBin)
        const phase  = blob.phase + t * blob.speed
        const cx     = (blob.x + Math.sin(phase * 1.3) * (centered ? 0.05 : 0.12)) * w
        const cy     = (blob.y + Math.cos(phase * 0.9) * 0.10) * hh
        const baseR  = Math.min(w, hh) * (large ? 1.8 : 0.45)
        const radius = baseR * (0.7 + energy * 0.6 + Math.sin(phase * 2) * 0.08)

        const blobHue = (h + blob.hueOff + 360) % 360
        const alpha   = isDark
          ? (large ? 0.45 + energy * 0.40 : 0.28 + energy * 0.32)
          : (large ? 0.30 + energy * 0.30 : 0.18 + energy * 0.22)

        // Use shadowBlur for the soft glow — no CSS filter needed
        ctx.save()
        ctx.shadowColor = `hsla(${blobHue}, ${s}, ${isDark ? '65%' : '55%'}, ${alpha})`
        ctx.shadowBlur  = Math.min(w, hh) * 0.35

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0,   `hsla(${blobHue}, ${s}, ${isDark ? '65%' : '55%'}, ${alpha})`)
        grad.addColorStop(0.5, `hsla(${blobHue}, ${s}, ${isDark ? '55%' : '50%'}, ${alpha * 0.5})`)
        grad.addColorStop(1,   `hsla(${blobHue}, ${s}, ${isDark ? '45%' : '45%'}, 0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius, radius * 0.85, phase * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    draw()
  }

  private drawLoop(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.dataArray) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Read accent color from CSS variables so it always matches the current theme
    const style = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

    // Apple System Indigo spectrum: deep indigo → violet → blue
    const spectrumColors = isDark
      ? ['#5E5CE6', '#7B79F0', '#0A84FF', '#32ADE6']
      : ['#5856D6', '#7B61FF', '#007AFF', '#32ADE6']

    const width    = canvas.width
    const height   = canvas.height
    const barCount = 24
    const barWidth = width / barCount
    const gap      = 2

    // Spectrum gradient: bottom faded → vivid indigo → violet → blue at top
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0,    isDark ? 'rgba(94, 92, 230, 0.28)' : 'rgba(88, 86, 214, 0.25)')
    gradient.addColorStop(0.35, spectrumColors[0]!)
    gradient.addColorStop(0.65, spectrumColors[1]!)
    gradient.addColorStop(0.85, spectrumColors[2]!)
    gradient.addColorStop(1,    spectrumColors[3]!)
    ctx.fillStyle = gradient

    void style

    const draw = (): void => {
      this.animationId = requestAnimationFrame(draw)
      if (!this.analyser || !this.dataArray) return

      this.analyser.getByteFrequencyData(this.dataArray)

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < barCount; i++) {
        const value     = this.dataArray[i * 4] ?? 0
        const barHeight = (value / 255) * height * 0.85
        const x = i * barWidth
        const y = height - barHeight
        ctx.fillRect(x, y, barWidth - gap, barHeight)
      }
    }

    draw()
  }

  stopVisualization(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  destroy(): void {
    this.stopVisualization()
    this.activeCanvas = null
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe()
      this.themeUnsubscribe = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.source   = null
    this.dataArray = null
  }
}
