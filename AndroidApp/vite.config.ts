import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    // Ensure .wasm files are treated as assets and copied to dist
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
