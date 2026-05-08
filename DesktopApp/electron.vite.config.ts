import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

/**
 * Copies tray icons into out/renderer/assets so the main process can
 * load them from disk in production. Renderer-side UI assets (logo,
 * fonts, flags) are bundled automatically via ESM imports or CSS url().
 */
const copyTrayAssets = {
  name: 'copy-tray-assets',
  writeBundle(): void {
    const outDir = resolve(__dirname, 'out/renderer/assets')
    mkdirSync(outDir, { recursive: true })
    for (const f of ['tray-icon.png', 'tray-icon@2x.png']) {
      copyFileSync(
        resolve(__dirname, 'src/renderer/assets', f),
        resolve(outDir, f)
      )
    }
  },
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@domain': resolve('src/domain'),
        '@application': resolve('src/application'),
        '@infrastructure': resolve('src/infrastructure')
      }
    },
    build: {
      sourcemap: true
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@domain': resolve('src/domain'),
        '@application': resolve('src/application'),
        '@renderer': resolve('src/renderer')
      }
    },
    plugins: [copyTrayAssets],
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html')
        }
      }
    }
  }
})
