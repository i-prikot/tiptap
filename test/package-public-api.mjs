import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '..')
const consumerVerifierPath = resolve(repositoryRoot, 'scripts/verify-editor-consumer-build.mjs')

test('editor CSS entry points resolve to the independent Vite assets', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'packages/editor/package.json'), 'utf8'),
  )

  assert.equal(manifest.exports['./style.css'], './dist/styles.css')
  assert.equal(manifest.exports['./styles.css'], './dist/styles.css')
  assert.equal(manifest.exports['./light-theme.css'], './dist/light-theme.css')
  assert.equal(manifest.exports['./dark-theme.css'], './dist/dark-theme.css')
})

test('clean consumer verifier covers the base stylesheet without a theme', () => {
  const verifierSource = readFileSync(consumerVerifierPath, 'utf8')

  assert.ok(
    verifierSource.includes(
      `name: 'base stylesheet only',\n        imports: ["import '@i-prikot/editor/styles.css'"],`,
    ),
    'the clean consumer verifier must build a consumer that imports only styles.css',
  )
})

function buildFreshPackageArtifacts() {
  const removeBuildOutput = (path) =>
    rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })

  removeBuildOutput(resolve(repositoryRoot, 'dist'))

  for (const workspace of ['schema', 'editor', 'renderer']) {
    removeBuildOutput(resolve(repositoryRoot, 'packages', workspace, 'dist'))
    removeBuildOutput(resolve(repositoryRoot, 'packages', workspace, 'tsconfig.tsbuildinfo'))
    removeBuildOutput(resolve(repositoryRoot, 'packages', workspace, 'tsconfig.build.tsbuildinfo'))
  }

  for (const workspace of [
    '@i-prikot/editor-schema',
    '@i-prikot/editor',
    '@i-prikot/editor-renderer',
  ]) {
    execFileSync('npm', ['run', 'build', '--workspace', workspace], {
      cwd: repositoryRoot,
      stdio: 'inherit',
    })
  }
}

function packedFiles(workspace) {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', workspace], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })

  return new Set(JSON.parse(output)[0].files.map(({ path }) => path))
}

function packWorkspace(workspace, destination) {
  const output = execFileSync(
    'npm',
    ['pack', '--json', '--workspace', workspace, '--pack-destination', destination],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  )

  return resolve(destination, JSON.parse(output)[0].filename)
}

function unpackArchive(archivePath, destination) {
  execFileSync('tar', ['--extract', '--file', archivePath, '--directory', destination], {
    cwd: repositoryRoot,
  })

  return resolve(destination, 'package')
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)

    if (entry.isDirectory()) return listFiles(path)
    return entry.isFile() ? [path] : []
  })
}

function referencedRuntimePaths(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const references = new Set()
  const patterns = filePath.endsWith('.css')
    ? [/url\((?:['"])?([^'"()]+)(?:['"])?\)/g]
    : [
        /\bfrom\s*['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bexport\s+\*\s+from\s+['"]([^'"]+)['"]/g,
      ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = match[1]
      if (reference.startsWith('.') || reference.startsWith('assets/')) {
        references.add(resolve(dirname(filePath), reference))
      }
    }
  }

  return references
}

function assertPackedEditorRuntime(archivePath, destination) {
  const packageDirectory = unpackArchive(archivePath, destination)
  const exportedPaths = [
    'dist/index.js',
    'dist/styles.css',
    'dist/light-theme.css',
    'dist/dark-theme.css',
    'dist/types/index.d.ts',
  ]

  for (const path of exportedPaths) {
    assert.equal(existsSync(resolve(packageDirectory, path)), true, `${path} must be packed`)
  }

  const runtimeDirectory = resolve(packageDirectory, 'dist')
  const runtimeFiles = listFiles(runtimeDirectory).filter(
    (path) => !path.includes('/types/') && /\.(?:css|js|woff2?|ttf)$/.test(path),
  )

  assert(
    runtimeFiles.some((path) => path.endsWith('.js')),
    'runtime JS must be packed',
  )
  assert(
    runtimeFiles.some((path) => path.endsWith('.css')),
    'runtime CSS must be packed',
  )
  assert.equal(
    listFiles(runtimeDirectory).some((path) => path.endsWith('.tsbuildinfo')),
    false,
    'TypeScript incremental metadata must not be packed',
  )

  for (const filePath of runtimeFiles.filter((path) => /\.(?:css|js)$/.test(path))) {
    for (const referencedPath of referencedRuntimePaths(filePath)) {
      assert.equal(
        existsSync(referencedPath) && statSync(referencedPath).isFile(),
        true,
        `${filePath.slice(packageDirectory.length + 1)} references missing packed asset ${referencedPath.slice(packageDirectory.length + 1)}`,
      )
    }
  }
}

test('packed editor runtime is complete and builds in the shared clean consumer verifier', () => {
  buildFreshPackageArtifacts()

  for (const sourceFile of listFiles(resolve(repositoryRoot, 'packages/editor/src'))) {
    if (!/\.(?:css|ts|vue)$/.test(sourceFile)) continue
    assert.equal(
      readFileSync(sourceFile, 'utf8').includes('tinyfy-editor'),
      false,
      `${sourceFile} must not reference the former consumer editor class`,
    )
  }

  const schemaFiles = packedFiles('@i-prikot/editor-schema')
  const editorFiles = packedFiles('@i-prikot/editor')

  assert(schemaFiles.has('dist/extensions/block-id.js'))
  assert(schemaFiles.has('dist/extensions/block-role.js'))
  assert(editorFiles.has('dist/index.js'))
  assert(editorFiles.has('dist/styles.css'))
  assert(editorFiles.has('dist/light-theme.css'))
  assert(editorFiles.has('dist/dark-theme.css'))
  assert(editorFiles.has('dist/types/index.d.ts'))
  for (const cssPath of listFiles(resolve(repositoryRoot, 'packages/editor/dist')).filter((path) =>
    path.endsWith('.css'),
  )) {
    assert.equal(
      readFileSync(cssPath, 'utf8').includes('tinyfy-editor'),
      false,
      `${cssPath} must not contain the former consumer editor class`,
    )
  }
  assert.equal(
    [...editorFiles].some((path) => path.endsWith('.tsbuildinfo')),
    false,
  )

  const artifactDirectory = mkdtempSync(resolve(repositoryRoot, '.package-public-api-'))
  try {
    packWorkspace('@i-prikot/editor-schema', artifactDirectory)
    // Schema and renderer prefixes overlap with the editor prefix, so pack both first.
    packWorkspace('@i-prikot/editor-renderer', artifactDirectory)
    const editorArchive = packWorkspace('@i-prikot/editor', artifactDirectory)
    assertPackedEditorRuntime(editorArchive, artifactDirectory)
    execFileSync(process.execPath, [consumerVerifierPath, artifactDirectory], {
      cwd: repositoryRoot,
      stdio: 'inherit',
      timeout: 420_000,
    })
  } finally {
    rmSync(artifactDirectory, { recursive: true, force: true })
  }
})
