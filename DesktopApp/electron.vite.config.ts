import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

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
