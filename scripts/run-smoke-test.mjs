import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info
const require = createRequire(import.meta.url)
const smokeTarget = 'e2e/smoke.spec.ts'
const redactedValue = '[REDACTED]'
const sensitiveValue =
  /(?:^|[^a-z0-9_-])(?:access[-_]?token|api[-_]?key|authorization|auth(?:entication)?|credentials?|password|passwd|secret|token|set[-_]?cookie|cookie)(?=\s*["']?\s*[:=]|\s+(?:bearer|basic)\b)/i

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) return

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const writer = level === 'error' ? console.error : console.log
  writer(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

function isSensitiveArgumentName(argumentName) {
  const normalizedArgumentName = argumentName.replace(/^-+/, '')
  return /(?:^|[-_])(?:access[-_]?token|api[-_]?key|authorization|auth(?:entication)?|credentials?|password|passwd|secret|token|set[-_]?cookie|cookie)(?:$|[-_])/i.test(
    normalizedArgumentName,
  )
}

function isForwardedHeaderArgument(argumentName) {
  const normalizedArgumentName = argumentName.replace(/^-+/, '')
  return /^headers?$/i.test(normalizedArgumentName)
}

function containsSensitiveUrlParts(argument) {
  try {
    const url = new URL(argument)
    return (
      Boolean(url.username || url.password) ||
      [...url.searchParams.keys()].some(isSensitiveArgumentName)
    )
  } catch {
    return false
  }
}

function redactSensitiveHeaderValue(argument) {
  const separatorIndex = argument.indexOf(':')

  if (separatorIndex === -1 || !isSensitiveArgumentName(argument.slice(0, separatorIndex))) {
    return null
  }

  return `${argument.slice(0, separatorIndex + 1)} ${redactedValue}`
}

function redactArgumentValue(argument) {
  const redactedHeaderValue = redactSensitiveHeaderValue(argument)

  if (redactedHeaderValue) {
    return redactedHeaderValue
  }

  return containsSensitiveUrlParts(argument) || sensitiveValue.test(argument)
    ? redactedValue
    : argument
}

function redactForwardedArguments(forwardedArguments) {
  let redactNextArgument = false

  return forwardedArguments.map((argument) => {
    if (redactNextArgument) {
      redactNextArgument = false
      return redactedValue
    }

    const equalsIndex = argument.indexOf('=')
    const argumentName = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex)

    if (argument.startsWith('-') && isForwardedHeaderArgument(argumentName)) {
      if (equalsIndex === -1) {
        redactNextArgument = true
        return argument
      }

      return `${argumentName}=${redactedValue}`
    }

    if (argument.startsWith('-') && isSensitiveArgumentName(argumentName)) {
      if (equalsIndex === -1) {
        redactNextArgument = true
        return argument
      }

      return `${argumentName}=${redactedValue}`
    }

    if (argument.startsWith('-') && equalsIndex !== -1) {
      return `${argumentName}=${redactArgumentValue(argument.slice(equalsIndex + 1))}`
    }

    return redactArgumentValue(argument)
  })
}

function resolvePlaywrightCli() {
  try {
    return require.resolve('@playwright/test/cli')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to resolve the existing @playwright/test CLI: ${message}`)
  }
}

function runSmokeTest() {
  const playwrightCli = resolvePlaywrightCli()
  const forwardedArguments = process.argv.slice(2)
  const commandArguments = [playwrightCli, 'test', smokeTarget, ...forwardedArguments]

  log('info', 'Launching Playwright smoke test.', {
    command: [process.execPath, playwrightCli, 'test', smokeTarget].join(' '),
    smokeTarget,
  })
  log('debug', 'Forwarding Playwright arguments.', {
    forwardedArguments: redactForwardedArguments(forwardedArguments),
  })

  const child = spawn(process.execPath, commandArguments, { stdio: 'inherit' })

  child.once('error', (error) => {
    log('error', 'Unable to spawn Playwright smoke test.', { message: error.message, smokeTarget })
    process.exitCode = 1
  })

  child.once('exit', (code, signal) => {
    if (signal) {
      log('error', 'Playwright smoke test exited from a signal.', { signal, smokeTarget })
      process.kill(process.pid, signal)
      return
    }

    if (code !== 0) {
      log('error', 'Playwright smoke test exited unsuccessfully.', { code, smokeTarget })
    }

    process.exitCode = code ?? 1
  })
}

try {
  runSmokeTest()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'Unable to start Playwright smoke test.', { message, smokeTarget })
  process.exitCode = 1
}
