import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import prefixSelector from 'postcss-prefix-selector'

const editorRootSelector = '.tinyfy-editor'
const rootSelectorPattern = /^(?::root|html|body)(?=$|[\s>+~.#[:])/

function scopeEditorSelector(prefix: string, selector: string) {
  const trimmedSelector = selector.trim()

  if (
    trimmedSelector === prefix ||
    trimmedSelector.startsWith(`${prefix} `) ||
    trimmedSelector.startsWith(`${prefix}:`) ||
    trimmedSelector.startsWith(`${prefix}.`) ||
    trimmedSelector.startsWith(`${prefix}[`) ||
    trimmedSelector.startsWith(`${prefix}>`) ||
    trimmedSelector.startsWith(`${prefix}+`) ||
    trimmedSelector.startsWith(`${prefix}~`)
  ) {
    return selector
  }

  if (rootSelectorPattern.test(trimmedSelector)) {
    return trimmedSelector.replace(rootSelectorPattern, prefix)
  }

  return `${prefix} ${trimmedSelector}`
}

const isHostRuntimeDependency = (id: string) => id === 'vue' || id.startsWith('@tiptap/')

const isExternalDependency = (id: string) =>
  isHostRuntimeDependency(id) ||
  id === '@i-prikot/editor-schema' ||
  id.startsWith('@floating-ui/') ||
  id.startsWith('@hocuspocus/') ||
  id === 'katex' ||
  id === 'y-prosemirror' ||
  id === 'y-protocols' ||
  id === 'yjs'

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        prefixSelector({
          prefix: editorRootSelector,
          transform: scopeEditorSelector,
        }),
      ],
    },
  },
  resolve: {
    alias: {
      '@i-prikot/editor-schema': fileURLToPath(new URL('../schema/src/index.ts', import.meta.url)),
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
      external: isExternalDependency,
    },
  },
})
