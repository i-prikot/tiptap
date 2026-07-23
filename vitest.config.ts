import { statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const legacySourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = ['.ts', '.tsx', '.vue', '.js', '.mjs', '.cjs']

function resolveExistingSourceModule(sourcePath: string) {
  const candidatePaths = [
    ...sourceExtensions.map((extension) => `${sourcePath}${extension}`),
    ...sourceExtensions.map((extension) => resolve(sourcePath, `index${extension}`)),
    sourcePath,
  ]

  return candidatePaths.find((candidatePath) =>
    statSync(candidatePath, { throwIfNoEntry: false })?.isFile(),
  )
}

function resolveLegacySourcePath(source: string, importer?: string) {
  if (!importer || !source.startsWith('.')) return undefined

  const requestedPath = resolve(dirname(importer), source)
  const legacyPath = relative(legacySourceRoot, requestedPath)
  if (legacyPath.startsWith('..') || legacyPath === '') return undefined

  let workspaceSourcePath: string | undefined

  if (legacyPath.startsWith('editor/extensions/')) {
    workspaceSourcePath = resolve(
      projectRoot,
      'packages/schema/src',
      legacyPath.slice('editor/'.length),
    )
  }

  if (
    !workspaceSourcePath &&
    (legacyPath.startsWith('editor/utils/table-utils') ||
      legacyPath.startsWith('editor/utils/tiptap-utils') ||
      legacyPath.startsWith('editor/types/image-upload') ||
      legacyPath.startsWith('editor/types/user') ||
      legacyPath.startsWith('editor/types/toc') ||
      legacyPath.startsWith('editor/types/tiptap-augmentations'))
  ) {
    workspaceSourcePath = resolve(
      projectRoot,
      'packages/schema/src',
      legacyPath.slice('editor/'.length),
    )
  }

  if (!workspaceSourcePath && legacyPath.startsWith('editor/')) {
    workspaceSourcePath = resolve(
      projectRoot,
      'packages/editor/src',
      legacyPath.slice('editor/'.length),
    )
  }

  if (!workspaceSourcePath && legacyPath.startsWith('playground/')) {
    workspaceSourcePath = resolve(
      projectRoot,
      'apps/playground/src',
      legacyPath.slice('playground/'.length),
    )
  }

  if (
    !workspaceSourcePath &&
    (legacyPath === 'App.vue' || legacyPath === 'main.ts' || legacyPath === 'env.d.ts')
  ) {
    workspaceSourcePath = resolve(projectRoot, 'apps/playground/src', legacyPath)
  }

  return workspaceSourcePath ? resolveExistingSourceModule(workspaceSourcePath) : undefined
}

export default defineConfig({
  plugins: [
    {
      name: 'tinyfy/legacy-test-source-resolution',
      resolveId(source, importer) {
        return resolveLegacySourcePath(source, importer)
      },
    },
    vue(),
  ],
  resolve: {
    alias: {
      '@i-prikot/editor-schema/renderer': resolve(projectRoot, 'packages/schema/src/renderer.ts'),
      '@i-prikot/editor-schema': resolve(projectRoot, 'packages/schema/src/index.ts'),
      '@i-prikot/editor': resolve(projectRoot, 'packages/editor/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 4,
    testTimeout: 10_000,
    isolate: true,
    setupFiles: ['./test/setup.ts'],
    exclude: ['e2e/**', '**/node_modules/**', '**/.git/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
      include: ['packages/**/*.{ts,vue}', 'apps/playground/src/**/*.{ts,vue}'],
      exclude: [
        'apps/playground/src/main.ts',
        'apps/playground/src/env.d.ts',
        '**/*.d.ts',
        '**/*.test.{ts,vue}',
        '**/*.spec.{ts,vue}',
        'test/**',
      ],
    },
  },
})
