import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

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
export default defineConfig(({ mode }) => {
  const isBundleAnalysis = mode === 'bundle-analysis'
  const outputDirectory = fileURLToPath(new URL('./dist/', import.meta.url))
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
    resolve: {
      alias: {
        '@i-prikot/editor-schema': fileURLToPath(
          new URL('../schema/src/index.ts', import.meta.url),
        ),
      },
    },
    build: {
      outDir: outputDirectory,
      cssCodeSplit: true,
      emptyOutDir: false,
      lib: {
        entry: {
          index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          'icons/index': fileURLToPath(new URL('./src/icons/index.ts', import.meta.url)),
          styles: fileURLToPath(new URL('./src/styles-entry.ts', import.meta.url)),
          'light-theme': fileURLToPath(new URL('./src/light-theme-entry.ts', import.meta.url)),
          'dark-theme': fileURLToPath(new URL('./src/dark-theme-entry.ts', import.meta.url)),
        },
        formats: ['es'],
        fileName: 'index',
      },
      rollupOptions: {
        external: isExternalDependency,
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  }
})
