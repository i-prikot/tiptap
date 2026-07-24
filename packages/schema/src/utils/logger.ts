export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(message: string, ...arguments_: unknown[]): void
  info(message: string, ...arguments_: unknown[]): void
  warn(message: string, ...arguments_: unknown[]): void
  error(message: string, ...arguments_: unknown[]): void
}

export interface LoggerOptions {
  minLevel?: LogLevel
  isEnabled?: () => boolean
}

const logLevelPriorities: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isDevelopment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true
const defaultMinimumLevel: LogLevel = isDevelopment ? 'debug' : 'warn'

function canLog(level: LogLevel, minimumLevel: LogLevel, isEnabled?: () => boolean): boolean {
  if (logLevelPriorities[level] < logLevelPriorities[minimumLevel]) return false

  try {
    return isEnabled?.() ?? true
  } catch {
    return false
  }
}

function writeLog(
  level: LogLevel,
  namespace: string,
  message: string,
  arguments_: unknown[],
): void {
  try {
    const consoleMethod = globalThis.console?.[level]
    consoleMethod?.call(globalThis.console, `[${namespace}] ${message}`, ...arguments_)
  } catch {
    return
  }
}

export function createLogger(namespace: string, options: LoggerOptions = {}): Logger {
  const minimumLevel = options.minLevel ?? defaultMinimumLevel

  function log(level: LogLevel, message: string, arguments_: unknown[]): void {
    if (!canLog(level, minimumLevel, options.isEnabled)) return
    writeLog(level, namespace, message, arguments_)
  }

  return {
    debug(message, ...arguments_) {
      log('debug', message, arguments_)
    },
    info(message, ...arguments_) {
      log('info', message, arguments_)
    },
    warn(message, ...arguments_) {
      log('warn', message, arguments_)
    },
    error(message, ...arguments_) {
      log('error', message, arguments_)
    },
  }
}
