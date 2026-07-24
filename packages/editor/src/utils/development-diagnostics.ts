import { createLogger } from '@i-prikot/editor-schema'

export type DevelopmentDiagnosticMetadata = Record<string, unknown>

export interface DevelopmentDiagnostics {
  debug(event: string, metadata?: DevelopmentDiagnosticMetadata): void
  error(event: string, metadata?: DevelopmentDiagnosticMetadata): void
}

export interface DevelopmentDiagnosticsOptions {
  isEnabled?: () => boolean
}

const isDevelopment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true

export function createDevelopmentDiagnostics(
  namespace: string,
  options: DevelopmentDiagnosticsOptions = {},
): DevelopmentDiagnostics {
  const logger = createLogger(namespace, {
    minLevel: 'debug',
    isEnabled: () => isDevelopment && (options.isEnabled?.() ?? true),
  })

  return {
    debug(event, metadata) {
      logger.debug(event, metadata)
    },
    error(event, metadata) {
      logger.error(event, metadata)
    },
  }
}
