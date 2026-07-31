import { constants } from 'node:fs'
import { lstat, open, readdir, readFile, realpath } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const iconsDirectory = resolve(repositoryRoot, 'packages/editor/src/icons')
const barrelPath = resolve(iconsDirectory, 'index.ts')
const helperModuleName = 'create-icon.ts'
const iconModuleNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*-icon\.ts$/
const namedExportPattern =
  /^\s*export\s+(?:declare\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)\b/gm

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) return

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const writer = level === 'error' ? console.error : console.log
  writer(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

function assertRegularBarrelFile(fileStats, description) {
  if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
    throw new Error(`${description} must be a regular file and must not be a symbolic link.`)
  }
}

function assertSingleLinkedBarrelFile(fileStats, description) {
  if (fileStats.nlink !== 1) {
    throw new Error(`${description} must have exactly one link before it can be written.`)
  }
}

const directoryOpenFlags = [constants.O_DIRECTORY, constants.O_NOFOLLOW, constants.O_RDONLY].every(
  (flag) => typeof flag === 'number',
)
  ? constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  : null

function getDescriptorRelativePath(directoryHandle, fileName = '') {
  return join(
    process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd',
    String(directoryHandle.fd),
    fileName,
  )
}

function hasErrorCode(error, codes) {
  return error && typeof error === 'object' && codes.includes(error.code)
}

async function openDirectory(directoryPath, description) {
  if (directoryOpenFlags === null) {
    throw new Error('This platform cannot safely open icon directories.')
  }

  try {
    return await open(directoryPath, directoryOpenFlags)
  } catch (error) {
    if (hasErrorCode(error, ['ELOOP', 'ENOTDIR'])) {
      throw new Error(`${description} must be a directory and must not be a symbolic link.`)
    }

    throw error
  }
}

async function closeHandles(handles) {
  await Promise.all(handles.reverse().map((handle) => handle.close()))
}

function assertSameDirectory(expectedStats, actualStats, description) {
  if (expectedStats.dev !== actualStats.dev || expectedStats.ino !== actualStats.ino) {
    throw new Error(`${description} changed while the icon generator was opening it.`)
  }
}

async function resolveIconSourceDirectory() {
  const canonicalRepositoryRoot = await realpath(repositoryRoot)
  const repositoryHandle = await openDirectory(canonicalRepositoryRoot, 'Repository root')
  const handles = [repositoryHandle]

  try {
    const [canonicalRepositoryStats, openedRepositoryStats] = await Promise.all([
      lstat(canonicalRepositoryRoot),
      repositoryHandle.stat(),
    ])
    assertSameDirectory(canonicalRepositoryStats, openedRepositoryStats, 'Repository root')

    let parentHandle = repositoryHandle
    for (const [directoryName, description] of [
      ['packages', 'Icon source directory component packages'],
      ['editor', 'Icon source directory component editor'],
      ['src', 'Icon source directory component src'],
      ['icons', 'Icon source directory'],
    ]) {
      const directoryHandle = await openDirectory(
        getDescriptorRelativePath(parentHandle, directoryName),
        description,
      )
      handles.push(directoryHandle)
      parentHandle = directoryHandle
    }

    return { iconDirectoryHandle: parentHandle, handles }
  } catch (error) {
    await closeHandles(handles)
    throw error
  }
}

async function openBarrelOutput(iconDirectoryHandle, check) {
  const outputPath = barrelPath
  const descriptorRelativeOutputPath = getDescriptorRelativePath(iconDirectoryHandle, 'index.ts')
  const outputStats = await lstat(descriptorRelativeOutputPath)
  assertRegularBarrelFile(outputStats, 'Icon barrel output path')

  if (!check) {
    assertSingleLinkedBarrelFile(outputStats, 'Icon barrel output path')
  }

  let barrelHandle

  try {
    barrelHandle = await open(
      descriptorRelativeOutputPath,
      (check ? constants.O_RDONLY : constants.O_RDWR) | constants.O_NOFOLLOW,
    )
  } catch (error) {
    if (hasErrorCode(error, ['ELOOP'])) {
      throw new Error('Icon barrel output path must not be a symbolic link.')
    }

    throw error
  }

  try {
    const openedOutputStats = await barrelHandle.stat()
    assertRegularBarrelFile(openedOutputStats, 'Opened icon barrel output path')

    if (!check) {
      assertSingleLinkedBarrelFile(openedOutputStats, 'Opened icon barrel output path')
    }
  } catch (error) {
    await barrelHandle.close()
    throw error
  }

  return { outputPath, barrelHandle }
}

function extractNamedExports(moduleName, source) {
  if (/^\s*export\s+default\b/m.test(source)) {
    throw new Error(`${moduleName} must not use a default export.`)
  }

  if (/^\s*export\s+\*/m.test(source) || /^\s*export\s*\{/m.test(source)) {
    throw new Error(`${moduleName} must use direct named export declarations.`)
  }

  const exportNames = []
  const seenExportNames = new Set()

  for (const match of source.matchAll(namedExportPattern)) {
    const exportName = match[1]

    if (seenExportNames.has(exportName)) {
      throw new Error(`${moduleName} declares the named export ${exportName} more than once.`)
    }

    seenExportNames.add(exportName)
    exportNames.push(exportName)
  }

  if (exportNames.length === 0) {
    throw new Error(`${moduleName} does not declare a resolvable named export.`)
  }

  return exportNames
}

async function discoverIconExports(iconDirectoryHandle) {
  log('debug', 'Discovering committed icon modules.', { iconsDirectory })

  const entries = await readdir(getDescriptorRelativePath(iconDirectoryHandle), {
    withFileTypes: true,
  })
  const moduleNames = []

  for (const entry of entries) {
    if (!entry.name.endsWith('-icon.ts')) continue

    if (!entry.isFile()) {
      throw new Error(`Icon module ${entry.name} must be a regular file.`)
    }

    if (!iconModuleNamePattern.test(entry.name)) {
      throw new Error(`Unexpected icon module filename: ${entry.name}.`)
    }

    if (entry.name !== helperModuleName) {
      moduleNames.push(entry.name)
    }
  }

  moduleNames.sort((left, right) => left.localeCompare(right))
  const iconExports = []
  const seenExportNames = new Map()

  for (const moduleName of moduleNames) {
    const source = await readFile(
      getDescriptorRelativePath(iconDirectoryHandle, moduleName),
      'utf8',
    )

    for (const exportName of extractNamedExports(moduleName, source)) {
      const previousModuleName = seenExportNames.get(exportName)

      if (previousModuleName) {
        throw new Error(
          `Duplicate named export ${exportName} in ${moduleName} and ${previousModuleName}.`,
        )
      }

      seenExportNames.set(exportName, moduleName)
      iconExports.push({ exportName, moduleName: moduleName.slice(0, -'.ts'.length) })
    }
  }

  iconExports.sort((left, right) => left.exportName.localeCompare(right.exportName))
  return iconExports
}

function renderBarrel(iconExports) {
  return `${iconExports.map(({ exportName, moduleName }) => `export { ${exportName} } from './${moduleName}'`).join('\n')}\n`
}

async function generateIcons({ check }) {
  const { handles, iconDirectoryHandle } = await resolveIconSourceDirectory()

  try {
    const { outputPath, barrelHandle } = await openBarrelOutput(iconDirectoryHandle, check)

    try {
      const iconExports = await discoverIconExports(iconDirectoryHandle)
      const expectedBarrel = renderBarrel(iconExports)
      const existingBarrel = await barrelHandle.readFile('utf8')

      log('debug', 'Prepared icon barrel output.', {
        mode: check ? 'check' : 'write',
        outputPath,
        exports: iconExports.length,
      })

      if (existingBarrel === expectedBarrel) {
        log('info', 'Icon barrel is up to date.', { outputPath, exports: iconExports.length })
        return
      }

      if (check) {
        throw new Error(
          `Icon barrel is out of date at ${outputPath}. Run npm run icons:generate to regenerate it.`,
        )
      }

      await barrelHandle.truncate(0)
      await barrelHandle.write(expectedBarrel, 0, 'utf8')
      log('info', 'Icon barrel regenerated.', { outputPath, exports: iconExports.length })
    } finally {
      await barrelHandle.close()
    }
  } finally {
    await closeHandles(handles)
  }
}

const [command, ...extraArguments] = process.argv.slice(2)

if (extraArguments.length > 0 || (command !== undefined && command !== '--check')) {
  log('error', 'Icon barrel generation failed.', {
    reason: 'Usage: node scripts/generate-icons.mjs [--check]',
  })
  process.exitCode = 1
} else {
  generateIcons({ check: command === '--check' }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Icon barrel generation failed.', { message })
    process.exitCode = 1
  })
}
