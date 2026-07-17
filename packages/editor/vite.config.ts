import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@tinyfy/editor-schema': fileURLToPath(new URL('../schema/src/index.ts', import.meta.url)),
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: [
        'vue',
        '@tinyfy/editor-schema',
        /^@floating-ui\//,
        /^@hocuspocus\//,
        /^@tiptap\//,
        'katex',
        'y-prosemirror',
        'y-protocols',
        'yjs',
      ],
    },
  },
})
