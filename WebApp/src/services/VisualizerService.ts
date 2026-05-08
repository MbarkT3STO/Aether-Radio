import { EventBus } from '../store/EventBus'

export class VisualizerService {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private source: MediaElementAudioSourceNode | null = null
  private animationId: number | null = null
  private activeCanvas: HTMLCanvasElement | null = null
  private themeUnsubscribe: (() => void) | null = null

  /** Optional per-loop cleanup (e.g. tearing down a ResizeObserver) */
  private _onStopExtraCleanup: (() => void) | null = null

  // Expose for shared-canvas use by a secondary VisualizerService instance
  get sharedAnalyser(): AnalyserNode | null { return this.analyser }
  get sharedDataArray(): Uint8Array<ArrayBuffer> | null  { return this.dataArray }

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

    // Expose the analyser so SongRecognitionService can tap the graph
    // without importing this service (avoids circular deps).
    ;(window as unknown as { __aetherSharedAnalyser?: AnalyserNode }).__aetherSharedAnalyser = this.analyser

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

    // If the canvas is hidden via CSS (e.g. the web build disables the
    // mini player-bar ambient via display:none), skip starting the loop.
    // Running rAF + getByteFrequencyData for an off-screen 0-pixel canvas
    // is pure waste.
    const cs = getComputedStyle(canvas)
    if (cs.display === 'none' || cs.visibility === 'hidden') return

    this.activeCanvas = canvas
    this.ambientLoop(canvas, large, centered)
  }

  private ambientLoop(canvas: HTMLCanvasElement, large = false, centered = false): void {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Three blobs: indigo center, blue-shifted right, violet-shifted bottom
    const blobs = [
      { hueOff: 0,   x: centered ? 0.40 : 0.25, y: 0.40, phase: 0,   speed: 0.0007, freqBin: 2  },
      { hueOff: 25,  x: centered ? 0.60 : 0.72, y: 0.35, phase: 2.1, speed: 0.0011, freqBin: 8  },
      { hueOff: -20, x: 0.50,                   y: 0.70, phase: 4.3, speed: 0.0009, freqBin: 14 },
    ]

    let t = 0

    // ── Size is measured once and re-measured only on resize ──
    // getBoundingClientRect + canvas resize per frame forces a layout
    // flush and a full canvas buffer reallocation. Caching them and
    // listening to a ResizeObserver keeps the hot path doing nothing but
    // drawing.
    //
    // We also cap DPR at 1.5 — the canvas is blurred before it reaches
    // the screen, so rendering at 2× is wasted work.
    const dprCap = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let hh = 0

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const pw = Math.max(1, Math.round(rect.width  * dprCap))
      const ph = Math.max(1, Math.round(rect.height * dprCap))
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width  = pw
        canvas.height = ph
      }
      w  = canvas.width
      hh = canvas.height
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Cache computed style reads — only refresh every 60 frames (~2 s)
    let cachedH = 249
    let cachedS = '90%'
    let cachedIsDark = false
    let styleFrameCount = 0

    // ── 30 fps throttling ──
    // The ambient is a slow bloom; humans can't tell the difference
    // between 30 and 60 fps for it, but the browser can (and so can
    // the compositor sharing a thread with the UI).
    const frameIntervalMs = 1000 / 30
    let lastFrameTs = 0

    // Suspend the loop entirely when the tab is hidden — Chrome throttles
    // rAF to 1 fps in background tabs anyway, but fully skipping the work
    // saves battery on mobile.
    let paused = document.visibilityState === 'hidden'
    const onVisibility = (): void => {
      paused = document.visibilityState === 'hidden'
      // Force a style re-read on resume so theme changes made while hidden
      // are picked up immediately.
      if (!paused) styleFrameCount = 60
    }
    document.addEventListener('visibilitychange', onVisibility)

    const draw = (ts: number): void => {
      this.animationId = requestAnimationFrame(draw)

      if (paused) return

      // Honor the frame budget
      if (ts - lastFrameTs < frameIntervalMs) return
      lastFrameTs = ts
      t++

      // Throttle expensive getComputedStyle reads
      if (styleFrameCount === 0 || styleFrameCount >= 60) {
        const style  = getComputedStyle(document.documentElement)
        cachedH      = parseFloat(style.getPropertyValue('--h').trim()) || 249
        cachedS      = style.getPropertyValue('--s').trim() || '90%'
        cachedIsDark = document.documentElement.getAttribute('data-theme') === 'dark'
        styleFrameCount = 0
      }
      styleFrameCount++

      const h      = cachedH
      const s      = cachedS
      const isDark = cachedIsDark

      if (w === 0 || hh === 0) return

      ctx.clearRect(0, 0, w, hh)

      // Pull fresh frequency data
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

        // Dropped the expensive shadowBlur — the .pex-ambient-canvas
        // has a CSS filter: blur(Xpx) that does the same job on the
        // GPU instead of the 2D canvas software path.
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0,   `hsla(${blobHue}, ${s}, ${isDark ? '65%' : '55%'}, ${alpha})`)
        grad.addColorStop(0.5, `hsla(${blobHue}, ${s}, ${isDark ? '55%' : '50%'}, ${alpha * 0.5})`)
        grad.addColorStop(1,   `hsla(${blobHue}, ${s}, ${isDark ? '45%' : '45%'}, 0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius, radius * 0.85, phase * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Patch stopVisualization so the ResizeObserver gets torn down too
    this._onStopExtraCleanup = (): void => {
      try { ro.disconnect() } catch { /* noop */ }
      document.removeEventListener('visibilitychange', onVisibility)
    }

    this.animationId = requestAnimationFrame(draw)
  }

  private drawLoop(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.dataArray) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const barCount = 24
    const gap      = 2

    // Gradient and dimensions — rebuilt on resize or theme change
    let cachedWidth  = 0
    let cachedHeight = 0
    let gradient: CanvasGradient | null = null

    const buildGradient = (w: number, h: number): CanvasGradient => {
      // Updated to 2024/2025 Apple HIG indigo spectrum values
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      const spectrumColors = isDark
        ? ['#6D7CFF', '#8A97FF', '#0091FF', '#3CD9FE']
        : ['#6155F5', '#8B7FFF', '#0088FF', '#00C0E8']

      const g = ctx.createLinearGradient(0, h, 0, 0)
      g.addColorStop(0,    isDark ? 'rgba(109, 124, 255, 0.28)' : 'rgba(97, 85, 245, 0.25)')
      g.addColorStop(0.35, spectrumColors[0]!)
      g.addColorStop(0.65, spectrumColors[1]!)
      g.addColorStop(0.85, spectrumColors[2]!)
      g.addColorStop(1,    spectrumColors[3]!)
      return g
    }

    const draw = (): void => {
      this.animationId = requestAnimationFrame(draw)
      if (!this.analyser || !this.dataArray) return

      // Resize canvas to match physical pixels (DPR-aware) — fixes blurry bars on Retina
      const dpr  = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const pw   = Math.round(rect.width  * dpr)
      const ph   = Math.round(rect.height * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width  = pw
        canvas.height = ph
        cachedWidth   = 0 // force gradient rebuild
      }

      const w = canvas.width
      const h = canvas.height

      // Rebuild gradient only when dimensions change or theme changes
      if (w !== cachedWidth || h !== cachedHeight || !gradient) {
        gradient     = buildGradient(w, h)
        cachedWidth  = w
        cachedHeight = h
      }

      this.analyser.getByteFrequencyData(this.dataArray)
      ctx.clearRect(0, 0, w, h)

      const barWidth = w / barCount
      ctx.fillStyle = gradient

      for (let i = 0; i < barCount; i++) {
        const value     = this.dataArray[i * 4] ?? 0
        const barHeight = (value / 255) * h * 0.85
        const x = i * barWidth
        const y = h - barHeight
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
    if (this._onStopExtraCleanup) {
      try { this._onStopExtraCleanup() } catch { /* ignore */ }
      this._onStopExtraCleanup = null
    }
    // Clear the canvas so no frozen frame is left visible
    if (this.activeCanvas) {
      const ctx = this.activeCanvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height)
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
