import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '..')

function buildFreshPackageArtifacts() {
  for (const workspace of ['schema', 'editor']) {
    rmSync(resolve(repositoryRoot, 'packages', workspace, 'dist'), { recursive: true, force: true })
    rmSync(resolve(repositoryRoot, 'packages', workspace, 'tsconfig.tsbuildinfo'), {
      force: true,
    })
  }

  for (const workspace of ['@i-prikot/editor-schema', '@i-prikot/editor']) {
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

function installConsumerPackages(consumerDirectory, packages) {
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--prefer-offline',
      ...packages,
    ],
    {
      cwd: consumerDirectory,
      stdio: 'inherit',
      timeout: 120_000,
    },
  )
}

test('packed schema and editor entrypoints expose the BlockRole contract to a clean consumer', () => {
  buildFreshPackageArtifacts()

  const schemaFiles = packedFiles('@i-prikot/editor-schema')
  const editorFiles = packedFiles('@i-prikot/editor')

  assert(schemaFiles.has('dist/extensions/block-id.js'))
  assert(schemaFiles.has('dist/extensions/block-role.js'))
  assert(schemaFiles.has('dist/extensions/block-id.d.ts'))
  assert(schemaFiles.has('dist/extensions/block-role.d.ts'))
  assert(editorFiles.has('dist/index.js'))
  assert(editorFiles.has('dist/index.d.ts'))
  assert.equal(
    [...editorFiles].some((path) => path.includes('.build-deps')),
    false,
  )

  const consumerDirectory = mkdtempSync(resolve(repositoryRoot, '.package-public-api-'))
  try {
    writeFileSync(
      resolve(consumerDirectory, 'package.json'),
      JSON.stringify({ name: 'block-role-package-consumer', private: true, type: 'module' }),
    )
    writeFileSync(
      resolve(consumerDirectory, 'block-role-consumer-fixture.mjs'),
      `import assert from 'node:assert/strict'
import { Window } from 'happy-dom'

const window = new Window()
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
})

Object.defineProperty(globalThis, 'navigator', { configurable: true, value: window.navigator })

const { Editor } = await import('@tiptap/core')
const { default: StarterKit } = await import('@tiptap/starter-kit')
const {
  BLOCK_ID_ATTRIBUTE,
  BLOCK_ROLE_ATTRIBUTE,
  BlockId,
  BlockRole,
  TOP_LEVEL_BLOCK_ID_NODE_TYPES,
} = await import('@i-prikot/editor-schema')

function createHostEditor(content) {
  const element = document.createElement('div')
  document.body.append(element)
  return new Editor({ extensions: [StarterKit, BlockId, BlockRole.configure({ roles: ['pricing', 'cta', 'cases'] })], content, element })
}

function resolveLocalPricingContract(documentJson) {
  return documentJson.content?.find(
    (node) =>
      TOP_LEVEL_BLOCK_ID_NODE_TYPES.includes(node.type) &&
      typeof node.attrs?.[BLOCK_ID_ATTRIBUTE] === 'string' &&
      node.attrs[BLOCK_ROLE_ATTRIBUTE] === 'pricing',
  )
}

const content = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { [BLOCK_ID_ATTRIBUTE]: 'pricing-block', [BLOCK_ROLE_ATTRIBUTE]: 'pricing' },
      content: [{ type: 'text', text: 'Pricing' }],
    },
    {
      type: 'paragraph',
      attrs: { [BLOCK_ID_ATTRIBUTE]: 'cta-block', [BLOCK_ROLE_ATTRIBUTE]: 'cta' },
      content: [{ type: 'text', text: 'Call to action' }],
    },
    {
      type: 'paragraph',
      attrs: { [BLOCK_ID_ATTRIBUTE]: 'cases-block', [BLOCK_ROLE_ATTRIBUTE]: 'cases' },
      content: [{ type: 'text', text: 'Cases' }],
    },
    {
      type: 'bulletList',
      attrs: { [BLOCK_ID_ATTRIBUTE]: 'nested-wrapper' },
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'pricing' },
              content: [{ type: 'text', text: 'Nested pricing' }],
            },
          ],
        },
      ],
    },
  ],
}

const initialEditor = createHostEditor(content)
await Promise.resolve()
const saved = initialEditor.getJSON()
initialEditor.destroy()

assert.equal(resolveLocalPricingContract(saved)?.attrs?.[BLOCK_ID_ATTRIBUTE], 'pricing-block')
assert.equal(saved.content?.[3]?.content?.[0]?.content?.[0]?.attrs?.[BLOCK_ROLE_ATTRIBUTE], null)

const reloadedEditor = createHostEditor(saved)
await Promise.resolve()
assert.deepEqual(reloadedEditor.getJSON(), saved)
assert.equal(resolveLocalPricingContract(reloadedEditor.getJSON())?.attrs?.[BLOCK_ID_ATTRIBUTE], 'pricing-block')
reloadedEditor.destroy()
`,
    )

    const schemaArchive = packWorkspace('@i-prikot/editor-schema', consumerDirectory)
    const editorArchive = packWorkspace('@i-prikot/editor', consumerDirectory)
    installConsumerPackages(consumerDirectory, [
      '@tiptap/starter-kit@^3.27.1',
      'happy-dom@20.10.6',
      `./${basename(schemaArchive)}`,
    ])
    installConsumerPackages(consumerDirectory, [`./${basename(editorArchive)}`])

    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "import assert from 'node:assert/strict'; import { existsSync } from 'node:fs'; import { dirname, resolve } from 'node:path'; import { fileURLToPath } from 'node:url'; const schema = await import('@i-prikot/editor-schema'); const editor = await import('@i-prikot/editor'); for (const api of [schema, editor]) { for (const symbol of ['BLOCK_ID_ATTRIBUTE', 'BlockId', 'BlockRole', 'setBlockRoleAtPos']) { if (!(symbol in api)) throw new Error(`Missing ${symbol}`) } } const extensions = await schema.createExtensionKit({ provider: null, ydoc: null, placeholder: '', user: { id: 'consumer', name: 'Consumer', color: '#000000' }, features: { tocSidebar: false, floatingMenus: false, mobileToolbar: false, tableControls: false }, imageUpload: async () => '', onImageUploadError: () => {}, onTableOfContentsUpdate: () => {} }); assert(extensions.some((extension) => extension.name === 'blockRole')); const schemaRoot = dirname(dirname(fileURLToPath(import.meta.resolve('@i-prikot/editor-schema')))); for (const dependency of ['@tiptap/core', '@tiptap/pm']) { assert.equal(existsSync(resolve(schemaRoot, 'node_modules', dependency)), false, `${dependency} must not be nested below the schema package`); } await import('./block-role-consumer-fixture.mjs'); process.exit(0);",
      ],
      { cwd: consumerDirectory, encoding: 'utf8' },
    )

    assert.equal(
      output,
      '[BlockRole] normalize document { clearedInvalid: 0, strippedNested: 1, topLevelBlocks: 4 }\n',
    )
  } finally {
    rmSync(consumerDirectory, { recursive: true, force: true })
  }
})
