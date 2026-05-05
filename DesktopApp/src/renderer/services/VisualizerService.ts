import { EventBus } from '../store/EventBus'

export class VisualizerService {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private source: MediaElementAudioSourceNode | null = null
  private animationId: number | null = null
  private activeCanvas: HTMLCanvasElement | null = null
  private themeUnsubscribe: (() => void) | null = null

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

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Store canvas reference so the theme listener can restart visualization
    this.activeCanvas = canvas

    // Read accent color from CSS variables so it always matches the current theme
    const style = getComputedStyle(document.documentElement)
    const h = style.getPropertyValue('--h').trim()
    const s = style.getPropertyValue('--s').trim()
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const l = isDark ? '65%' : '55%'
    const accentColor = `hsl(${h}, ${s}, ${l})`
    const accentColorFaded = `hsla(${h}, ${s}, ${l}, 0.4)`

    const width    = canvas.width
    const height   = canvas.height
    const barCount = 24
    const barWidth = width / barCount
    const gap      = 2

    // Pre-compute a single full-height gradient — reused every frame
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, accentColor)
    gradient.addColorStop(1, accentColorFaded)
    ctx.fillStyle = gradient

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
