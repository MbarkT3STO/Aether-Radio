/// <reference types="vite/client" />

// Allow dynamic imports of CSS files (used to lazy-load flag-icons)
declare module '*.css'

// Stations of shazamio-core are loaded dynamically; give it a minimal shape
declare module 'shazamio-core/web' {
  const init: () => Promise<void>
  export default init
  export class DecodedSignature {
    static new(samples: Float32Array, sampleRate: number, channels: number): DecodedSignature
    uri: string
    samplems: number
    free(): void
  }
}
