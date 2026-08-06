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
  await execFileAsync(command, arguments_, { cwd, timeout })
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
    await mkdir(join(consumerDirectory, 'src'))
    await writeFile(
      join(consumerDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name: 'i-prikot-editor-vite-consumer',
          private: true,
          type: 'module',
          scripts: { build: 'vite build' },
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
      join(consumerDirectory, 'src/main.ts'),
      [
        "import { NotionEditor } from '@i-prikot/editor'",
        "import '@i-prikot/editor/style.css'",
        "import '@i-prikot/editor/styles.css'",
        'void NotionEditor',
        '',
      ].join('\n'),
    )

    await run(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        '--prefer-offline',
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
      process.execPath,
      ['--input-type=module', '--eval', "import('@i-prikot/editor')"],
      consumerDirectory,
    )
    await run('npm', ['run', 'build'], consumerDirectory)
  } finally {
    await rm(consumerDirectory, { force: true, recursive: true })
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
