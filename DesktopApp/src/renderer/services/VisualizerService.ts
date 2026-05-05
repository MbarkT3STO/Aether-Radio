export class VisualizerService {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private source: MediaElementAudioSourceNode | null = null
  private animationId: number | null = null

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82

    const bufferLength = this.analyser.frequencyBinCount
    this.dataArray = new Uint8Array(bufferLength)

    this.source = this.audioContext.createMediaElementSource(audioElement)
    this.source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
  }

  startVisualization(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.dataArray) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Read accent color from CSS variable (Keyra hsl(258, 85%, 65%) in dark)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const accentColor = isDark
      ? 'hsl(258, 85%, 65%)'   // Keyra dark accent
      : 'hsl(258, 85%, 55%)'   // Keyra light accent
    const accentColorFaded = isDark
      ? 'hsla(258, 85%, 65%, 0.4)'
      : 'hsla(258, 85%, 55%, 0.4)'

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
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.source   = null
    this.dataArray = null
  }
}
