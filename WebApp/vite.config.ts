import { defineConfig } from 'vite'
import { devApiProxy } from './vite-dev-proxy'

/**
 * In production, `/api/stream` and `/api/shazam` are served by Netlify Edge
 * Functions (see netlify/edge-functions/). In development, the devApiProxy
 * plugin implements the same two endpoints natively in the Vite dev server,
 * so `npm run dev` alone is enough — no need to run `netlify dev` in a
 * second terminal.
 */
export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  plugins: [devApiProxy()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    modulePreload: { polyfill: true },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    exclude: ['shazamio-core'],
  },
})
