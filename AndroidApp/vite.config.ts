import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    // Required: @unimusic/chromaprint uses top-level await (WASM init)
    // Capacitor's Android WebView fully supports ESNext / top-level await
    target: 'esnext',
    // Ensure .wasm files are emitted as separate assets (never inlined)
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@domain':         resolve(__dirname, 'src/domain'),
      '@application':    resolve(__dirname, 'src/application'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@renderer':       resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
  },
})
