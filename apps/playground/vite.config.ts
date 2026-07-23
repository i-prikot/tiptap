import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import prefixSelector from 'postcss-prefix-selector'
import { visualizer } from 'rollup-plugin-visualizer'

const editorRootSelector = '.tinyfy-editor'
const rootSelectorPattern = /^(?::root|html|body)(?=$|[\s>+~.#[:])/
const editorCssPathPattern =
  /(?:packages[/\\]editor[/\\]src[/\\]styles(?:[/\\].*)?\.css|node_modules[/\\]katex[/\\]dist[/\\]katex\.min\.css)(?:\?.*)?$/
const bundleAnalysisDirectory = fileURLToPath(new URL('./.bundle-analysis', import.meta.url))
const bundleAnalysisReportPaths = {
  treemap: join(bundleAnalysisDirectory, 'treemap.html'),
  rawData: join(bundleAnalysisDirectory, 'raw-data.json'),
}

type VendorChunkName = 'vendor-tiptap' | 'vendor-emoji' | 'vendor-collaboration' | 'vendor-katex'
type BundleAnalysisLogLevel = 'INFO' | 'ERROR'

function logBundleAnalysis(level: BundleAnalysisLogLevel, message: string) {
  const output = `[${level}] [bundle-analysis] ${message}\n`

  if (level === 'ERROR') {
    process.stderr.write(output)
    return
  }

  process.stdout.write(output)
}

function prepareBundleAnalysisOutput() {
  try {
    mkdirSync(bundleAnalysisDirectory, { recursive: true })
    rmSync(bundleAnalysisReportPaths.treemap, { force: true })
    rmSync(bundleAnalysisReportPaths.rawData, { force: true })
    logBundleAnalysis(
      'INFO',
      `mode=analyze treemap=${bundleAnalysisReportPaths.treemap} raw-data=${bundleAnalysisReportPaths.rawData}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logBundleAnalysis('ERROR', `Unable to prepare reports: ${message}`)
    throw new Error(`Unable to prepare bundle analysis reports: ${message}`)
  }
}

function verifyBundleAnalysisReports(): Plugin {
  return {
    name: 'verify-bundle-analysis-reports',
    closeBundle() {
      const missingReports = Object.values(bundleAnalysisReportPaths).filter(
        (reportPath) => !existsSync(reportPath),
      )

      if (missingReports.length === 0) return

      const message = `Report generation failed; missing=${missingReports.join(', ')}`
      logBundleAnalysis('ERROR', message)
      throw new Error(message)
    },
  }
}

function isPackageModule(moduleId: string, packageName: string) {
  return (
    moduleId === packageName ||
    moduleId.startsWith(`${packageName}/`) ||
    moduleId.includes(`/node_modules/${packageName}/`)
  )
}

function getVendorChunkName(moduleId: string): VendorChunkName | undefined {
  const normalizedModuleId = moduleId.replace(/\\/g, '/')

  if (isPackageModule(normalizedModuleId, '@tiptap/extension-emoji')) {
    return 'vendor-emoji'
  }

  if (isPackageModule(normalizedModuleId, '@tiptap')) {
    return 'vendor-tiptap'
  }

  if (
    isPackageModule(normalizedModuleId, '@hocuspocus') ||
    isPackageModule(normalizedModuleId, 'yjs') ||
    isPackageModule(normalizedModuleId, 'y-prosemirror') ||
    isPackageModule(normalizedModuleId, 'y-protocols')
  ) {
    return 'vendor-collaboration'
  }

  if (isPackageModule(normalizedModuleId, 'katex')) {
    return 'vendor-katex'
  }
}

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

export default defineConfig(({ mode }) => {
  const isBundleAnalysis = mode === 'analyze'

  if (isBundleAnalysis) prepareBundleAnalysisOutput()

  return {
    plugins: [
      vue(),
      ...(isBundleAnalysis
        ? [
            visualizer({
              filename: bundleAnalysisReportPaths.treemap,
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
            visualizer({
              filename: bundleAnalysisReportPaths.rawData,
              template: 'raw-data',
              gzipSize: true,
              brotliSize: true,
            }),
            verifyBundleAnalysisReports(),
          ]
        : []),
    ],
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
          find: '@i-prikot/editor-schema/renderer',
          replacement: fileURLToPath(
            new URL('../../packages/schema/src/renderer.ts', import.meta.url),
          ),
        },
        {
          find: '@i-prikot/editor-schema',
          replacement: fileURLToPath(
            new URL('../../packages/schema/src/index.ts', import.meta.url),
          ),
        },
        {
          find: '@i-prikot/editor',
          replacement: fileURLToPath(
            new URL('../../packages/editor/src/index.ts', import.meta.url),
          ),
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
      rollupOptions: {
        output: {
          manualChunks: getVendorChunkName,
        },
      },
    },
  }
})
