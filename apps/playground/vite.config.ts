import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@tinyfy/editor/styles.css',
        replacement: fileURLToPath(
          new URL('../../packages/editor/src/styles.css', import.meta.url),
        ),
      },
      {
        find: '@tinyfy/editor-schema',
        replacement: fileURLToPath(new URL('../../packages/schema/src/index.ts', import.meta.url)),
      },
      {
        find: '@tinyfy/editor',
        replacement: fileURLToPath(new URL('../../packages/editor/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
  },
})
