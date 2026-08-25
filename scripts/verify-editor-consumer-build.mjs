import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) return

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const writer = level === 'error' ? console.error : console.log
  writer(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

async function findArchive(artifactDirectory, archivePrefix, excludedArchivePrefixes = []) {
  log('debug', 'Discovering package archive.', { archivePrefix, excludedArchivePrefixes })
  const archiveNames = await readdir(artifactDirectory)
  const archiveName = archiveNames.find(
    (candidate) =>
      candidate.startsWith(archivePrefix) &&
      candidate.endsWith('.tgz') &&
      !excludedArchivePrefixes.some((excludedPrefix) => candidate.startsWith(excludedPrefix)),
  )

  if (!archiveName) {
    throw new Error(`Unable to find ${archivePrefix}*.tgz in ${artifactDirectory}.`)
  }

  log('debug', 'Selected package archive.', { archivePrefix, archiveName })
  return resolve(artifactDirectory, archiveName)
}

async function run(command, arguments_, cwd, timeout = 120_000) {
  log('debug', 'Running consumer verification command.', { command, arguments: arguments_ })
  try {
    await execFileAsync(command, arguments_, { cwd, timeout })
    log('debug', 'Consumer verification command completed.', { command })
  } catch (error) {
    const commandError = error instanceof Error ? error : new Error(String(error))
    const output = [commandError.stdout, commandError.stderr]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
      .slice(-8_000)
    log('error', 'Consumer verification command failed.', {
      command,
      message: commandError.message,
      ...(output ? { output } : {}),
    })
    throw error
  }
}

async function writeConsumerFixture(consumerDirectory) {
  await mkdir(join(consumerDirectory, 'src'))
  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'i-prikot-editor-vite-consumer',
        private: true,
        type: 'module',
        scripts: {
          build: 'vite build',
          'typecheck:schema-contract':
            'tsc --ignoreConfig --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck schema-contract-types.ts',
        },
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(consumerDirectory, 'index.html'),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  )
  await writeFile(
    join(consumerDirectory, 'schema-contract-types.ts'),
    [
      'import {',
      '  getSchemaContract,',
      '  invalidDocuments,',
      '  validDocuments,',
      '  type MarkDefinition,',
      '  type NodeDefinition,',
      '  type SchemaContract,',
      "} from '@i-prikot/editor-schema'",
      '',
      'const contract: SchemaContract = getSchemaContract()',
      'const firstNode: NodeDefinition | undefined = contract.nodes[0]',
      'const firstMark: MarkDefinition | undefined = contract.marks[0]',
      'void [firstNode, firstMark, validDocuments, invalidDocuments]',
      '',
    ].join('\n'),
  )
}

async function installConsumerDependencies(consumerDirectory, schemaArchive, editorArchive) {
  await run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock-only',
      '--prefer-offline',
      'typescript@^6.0.3',
      'vite@^6.0.3',
      'vue@^3.5.13',
      '@tiptap/core@^3.27.1',
      '@tiptap/extension-drag-handle-vue-3@^3.27.1',
      '@tiptap/extension-emoji@^3.27.1',
      '@tiptap/pm@^3.27.1',
      '@tiptap/suggestion@^3.27.1',
      '@tiptap/vue-3@^3.27.1',
      schemaArchive,
      editorArchive,
    ],
    consumerDirectory,
    300_000,
  )
  await run(
    'npm',
    ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'],
    consumerDirectory,
    300_000,
  )
}

async function verifySchemaContractImports(consumerDirectory) {
  await run('npm', ['run', 'typecheck:schema-contract'], consumerDirectory)
  await run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      [
        "import * as root from '@i-prikot/editor-schema'",
        "import * as subpath from '@i-prikot/editor-schema/schema-contract'",
        "if (typeof root.getSchemaContract !== 'function') throw new Error('missing root schema contract export')",
        "if (typeof subpath.getSchemaContract !== 'function') throw new Error('missing schema-contract subpath export')",
        "if (!root.validDocuments?.length || !root.invalidDocuments?.length) throw new Error('missing public schema fixtures')",
      ].join(';'),
    ],
    consumerDirectory,
  )
}

async function verifyStyleCases(consumerDirectory) {
  const styleCases = [
    { name: 'base stylesheet only', imports: ["import '@i-prikot/editor/styles.css'"] },
    {
      name: 'base plus light theme',
      imports: [
        "import '@i-prikot/editor/styles.css'",
        "import '@i-prikot/editor/light-theme.css'",
      ],
    },
    {
      name: 'base plus dark theme',
      imports: ["import '@i-prikot/editor/styles.css'", "import '@i-prikot/editor/dark-theme.css'"],
    },
    {
      name: 'base plus both themes',
      imports: [
        "import '@i-prikot/editor/styles.css'",
        "import '@i-prikot/editor/light-theme.css'",
        "import '@i-prikot/editor/dark-theme.css'",
      ],
    },
  ]

  for (const styleCase of styleCases) {
    log('info', 'Building clean Vite consumer style case.', { styleCase: styleCase.name })
    const consumerEntry = [
      "import { NotionEditor } from '@i-prikot/editor'",
      ...styleCase.imports,
      'void NotionEditor',
      '',
    ].join('\n')
    await writeFile(join(consumerDirectory, 'src/main.ts'), consumerEntry)
    await run('npm', ['run', 'build'], consumerDirectory)
  }
}

async function verifyEditorConsumerBuild(artifactDirectory) {
  const resolvedArtifactDirectory = resolve(artifactDirectory)
  const [editorArchive, schemaArchive] = await Promise.all([
    findArchive(resolvedArtifactDirectory, 'i-prikot-editor-', [
      'i-prikot-editor-schema-',
      'i-prikot-editor-renderer-',
    ]),
    findArchive(resolvedArtifactDirectory, 'i-prikot-editor-schema-'),
  ])
  const consumerDirectory = await mkdtemp(
    join(resolvedArtifactDirectory, '.i-prikot-editor-vite-consumer-'),
  )

  log('info', 'Starting clean Vite consumer build.', { consumerDirectory })
  try {
    await writeConsumerFixture(consumerDirectory)
    await installConsumerDependencies(consumerDirectory, schemaArchive, editorArchive)
    await verifySchemaContractImports(consumerDirectory)
    await run(
      process.execPath,
      ['--input-type=module', '--eval', "import('@i-prikot/editor')"],
      consumerDirectory,
    )
    await verifyStyleCases(consumerDirectory)
  } finally {
    await rm(consumerDirectory, {
      force: true,
      maxRetries: 10,
      recursive: true,
      retryDelay: 200,
    })
  }

  log('info', 'Clean Vite consumer build completed.')
}

const [artifactDirectory, ...extraArguments] = process.argv.slice(2)

if (!artifactDirectory || extraArguments.length > 0) {
  log('error', 'Consumer build verification failed.', {
    reason: 'Expected exactly one argument: <artifact-directory>.',
  })
  process.exitCode = 1
} else {
  verifyEditorConsumerBuild(artifactDirectory).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Consumer build verification failed.', { message })
    process.exitCode = 1
  })
}
