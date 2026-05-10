import { EventBus } from '../store/EventBus'

/**
 * RecordingService — captures audio output using MediaRecorder API.
 * Records the stream destination node and saves as WebM/Opus (browser-native).
 * The file is offered as a download when recording stops.
 */
export class RecordingService {
  private static instance: RecordingService
  private eventBus = EventBus.getInstance()

  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private _isRecording = false
  private _duration = 0
  private durationInterval: ReturnType<typeof setInterval> | null = null
  private audioContext: AudioContext | null = null
  private streamDestination: MediaStreamAudioDestinationNode | null = null
  private stationName = 'recording'

  private constructor() {}

  static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService()
    }
    return RecordingService.instance
  }

  get isRecording(): boolean { return this._isRecording }
  get duration(): number { return this._duration }

  /**
   * Initialize with AudioContext. Creates a MediaStreamDestination
   * that taps the audio chain for recording.
   */
  initialize(audioContext: AudioContext): MediaStreamAudioDestinationNode {
    this.audioContext = audioContext
    this.streamDestination = audioContext.createMediaStreamDestination()
    return this.streamDestination
  }

  getStreamDestination(): MediaStreamAudioDestinationNode | null {
    return this.streamDestination
  }

  /**
   * Start recording. The stationName is used for the filename.
   */
  start(stationName?: string): void {
    if (this._isRecording || !this.streamDestination) return

    this.stationName = stationName || 'recording'
    this.chunks = []
    this._duration = 0

    // Prefer webm/opus, fall back to whatever is available
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

    this.mediaRecorder = new MediaRecorder(this.streamDestination.stream, {
      mimeType,
      audioBitsPerSecond: 192000,
    })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    this.mediaRecorder.onstop = () => {
      this.saveRecording()
    }

    this.mediaRecorder.start(1000) // Collect data every second
    this._isRecording = true

    this.durationInterval = setInterval(() => {
      this._duration++
      this.eventBus.emit('player:recording', { active: true, duration: this._duration })
    }, 1000)

    this.eventBus.emit('player:recording', { active: true, duration: 0 })
  }

  /**
   * Stop recording and trigger file save.
   */
  stop(): void {
    if (!this._isRecording || !this.mediaRecorder) return

    this.mediaRecorder.stop()
    this._isRecording = false

    if (this.durationInterval) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }

    this.eventBus.emit('player:recording', { active: false, duration: this._duration })
  }

  private saveRecording(): void {
    if (this.chunks.length === 0) return

    const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
    const url = URL.createObjectURL(blob)

    // Sanitize station name for filename
    const safeName = this.stationName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'recording'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const ext = (this.mediaRecorder?.mimeType || '').includes('ogg') ? 'ogg' : 'webm'
    const filename = `${safeName}_${timestamp}.${ext}`

    // Trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    this.chunks = []
    this._duration = 0
  }

  /**
   * Format duration as MM:SS
   */
  static formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
}
