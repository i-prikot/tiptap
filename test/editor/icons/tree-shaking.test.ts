// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup, type Plugin } from 'rollup'
import { transformWithEsbuild } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const editorDirectory = resolve(projectRoot, 'packages/editor')
const iconSourceDirectory = join(editorDirectory, 'src/icons')
const iconBarrelPath = join(iconSourceDirectory, 'index.ts')
const consumerDirectories: string[] = []

function transpileIconSource(): Plugin {
  return {
    name: 'transpile-editor-icon-source',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) {
        return null
      }

      const modulePath = resolve(dirname(importer), source)
      return extname(modulePath) ? modulePath : `${modulePath}.ts`
    },
    async load(id) {
      if (!id.startsWith(`${iconSourceDirectory}/`) || extname(id) !== '.ts') {
        return null
      }

      return transformWithEsbuild(readFileSync(id, 'utf8'), id, {
        loader: 'ts',
        target: 'esnext',
      })
    },
  }
}

function bundleBoldIconConsumer() {
  const temporaryDirectory = mkdtempSync(join(editorDirectory, '.tree-shaking-test-'))
  consumerDirectories.push(temporaryDirectory)

  const entryPath = join(temporaryDirectory, 'consumer.js')
  writeFileSync(
    entryPath,
    `import { BoldIcon } from ${JSON.stringify(iconBarrelPath)}\nexport { BoldIcon }\n`,
  )

  return rollup({
    input: entryPath,
    external: ['vue'],
    plugins: [transpileIconSource()],
  })
}

afterEach(() => {
  for (const temporaryDirectory of consumerDirectories.splice(0)) {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
})

describe('editor icon barrel tree-shaking', () => {
  it('excludes unused icon leaf modules from a consumer bundle', async () => {
    expect(existsSync(iconBarrelPath)).toBe(true)

    const bundle = await bundleBoldIconConsumer()

    try {
      const { output } = await bundle.generate({ format: 'es' })
      const bundledCode = output.map((chunk) => ('code' in chunk ? chunk.code : '')).join('\n')

      expect(bundledCode).toContain('BoldIcon')
      expect(bundledCode).not.toContain('ItalicIcon')
    } finally {
      await bundle.close()
    }
  })
})
