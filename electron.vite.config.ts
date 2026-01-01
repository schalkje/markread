import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      externalizeDeps: true
    },
    resolve: {
      alias: [
        { find: '@shared', replacement: resolve(__dirname, 'src/shared') }
      ]
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      externalizeDeps: true,
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    resolve: {
      alias: [
        { find: '@shared', replacement: resolve(__dirname, 'src/shared') }
      ]
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: [
        { find: '@', replacement: resolve(__dirname, 'src/renderer') },
        { find: '@shared', replacement: resolve(__dirname, 'src/shared') }
      ]
    }
  }
})
