'use strict'

const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { dirname, resolve } = require('node:path')

function isDebugLoggingEnabled() {
  const logLevel = process.env.LOG_LEVEL?.toLowerCase()
  const debugNamespaces = new Set((process.env.DEBUG ?? '').split(',').map((value) => value.trim()))

  return (
    logLevel === 'debug' ||
    logLevel === 'trace' ||
    debugNamespaces.has('*') ||
    debugNamespaces.has('prepare') ||
    debugNamespaces.has('prepare-husky')
  )
}

function logDiagnostic(message, context) {
  if (!isDebugLoggingEnabled()) return

  const suffix = context ? ` ${JSON.stringify(context)}` : ''
  process.stderr.write(`[FIX:prepare] ${message}${suffix}\n`)
}

function resolveHuskyExecutable() {
  if (process.env.HUSKY_BIN) {
    return resolve(process.cwd(), process.env.HUSKY_BIN)
  }

  try {
    const huskyEntryPath = require.resolve('husky')
    const huskyExecutablePath = resolve(dirname(huskyEntryPath), 'bin.js')

    return existsSync(huskyExecutablePath) ? huskyExecutablePath : undefined
  } catch {
    return undefined
  }
}

function runPrepare() {
  if (process.env.NODE_ENV === 'production') {
    logDiagnostic('Skipping Husky in production mode')
    return
  }

  const huskyExecutablePath = resolveHuskyExecutable()

  if (!huskyExecutablePath) {
    logDiagnostic('Skipping Husky because the local executable is unavailable')
    return
  }

  const result = spawnSync(process.execPath, [huskyExecutablePath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    logDiagnostic('Failed to launch Husky', {
      error: result.error.message,
      executable: huskyExecutablePath,
    })
    process.exitCode = 1
    return
  }

  if (result.status !== 0) {
    logDiagnostic('Husky exited with a non-zero status', {
      executable: huskyExecutablePath,
      exitCode: result.status,
      signal: result.signal,
    })
    process.exitCode = result.status ?? 1
    return
  }

  logDiagnostic('Husky completed successfully', { executable: huskyExecutablePath })
}

runPrepare()
