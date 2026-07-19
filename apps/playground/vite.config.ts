import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import prefixSelector from 'postcss-prefix-selector'

const editorRootSelector = '.tinyfy-editor'
const rootSelectorPattern = /^(?::root|html|body)(?=$|[\s>+~.#[:])/
const editorCssPathPattern =
  /(?:packages[/\\]editor[/\\]src[/\\]styles(?:[/\\].*)?\.css|node_modules[/\\]katex[/\\]dist[/\\]katex\.min\.css)$/

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

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        prefixSelector({
          prefix: editorRootSelector,
          includeFiles: [editorCssPathPattern],
          transform: scopeEditorSelector,
        }),
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: '@i-prikot/editor/styles.css',
        replacement: fileURLToPath(
          new URL('../../packages/editor/src/styles.css', import.meta.url),
        ),
      },
      {
        find: '@i-prikot/editor-schema',
        replacement: fileURLToPath(new URL('../../packages/schema/src/index.ts', import.meta.url)),
      },
      {
        find: '@i-prikot/editor',
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
