import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import prefixSelector from 'postcss-prefix-selector'
import { visualizer } from 'rollup-plugin-visualizer'

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

const isLazyRuntimeDependency = (id: string) => id === 'katex'

const isExternalDependency = (id: string) =>
  isHostRuntimeDependency(id) ||
  id === '@i-prikot/editor-schema' ||
  id.startsWith('@floating-ui/') ||
  id.startsWith('@hocuspocus/') ||
  isLazyRuntimeDependency(id) ||
  id === 'y-prosemirror' ||
  id === 'y-protocols' ||
  id === 'yjs'
const editorSourceDirectory = fileURLToPath(new URL('./src/', import.meta.url))

export default defineConfig(({ mode }) => {
  const isBundleAnalysis = mode === 'bundle-analysis'
  const bundleAnalysisDirectory = fileURLToPath(new URL('./.bundle-analysis/', import.meta.url))
  const treemapReportPath = join(bundleAnalysisDirectory, 'treemap.html')
  const rawDataReportPath = join(bundleAnalysisDirectory, 'raw-data.json')

  if (isBundleAnalysis) {
    try {
      mkdirSync(bundleAnalysisDirectory, { recursive: true })
      console.info('[bundle-analysis] INFO analysis mode enabled', {
        mode,
        treemapReportPath,
        rawDataReportPath,
      })
    } catch (error) {
      console.error('[bundle-analysis] ERROR unable to prepare report directory', {
        bundleAnalysisDirectory,
        error,
      })
      throw error
    }
  }

  return {
    plugins: [
      vue(),
      ...(isBundleAnalysis
        ? [
            visualizer({
              filename: treemapReportPath,
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
            visualizer({
              filename: rawDataReportPath,
              template: 'raw-data',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
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
        '@i-prikot/editor-schema': fileURLToPath(
          new URL('../schema/src/index.ts', import.meta.url),
        ),
      },
    },
    build: {
      cssCodeSplit: true,
      emptyOutDir: false,
      lib: {
        entry: {
          index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          'icons/index': fileURLToPath(new URL('./src/icons/index.ts', import.meta.url)),
        },
        formats: ['es'],
        fileName: 'index',
        cssFileName: 'styles',
      },
      rollupOptions: {
        external: isExternalDependency,
        output: {
          entryFileNames: '[name].js',
          preserveModules: true,
          preserveModulesRoot: editorSourceDirectory,
        },
      },
    },
  }
})
