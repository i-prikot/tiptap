export type DevelopmentDiagnosticMetadata = Record<string, unknown>

export interface DevelopmentDiagnostics {
  debug(event: string, metadata?: DevelopmentDiagnosticMetadata): void
}

export interface DevelopmentDiagnosticsOptions {
  isEnabled?: () => boolean
}

const isDevelopment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true

export function createDevelopmentDiagnostics(
  namespace: string,
  options: DevelopmentDiagnosticsOptions = {},
): DevelopmentDiagnostics {
  return {
    debug(event, metadata) {
      if (!isDevelopment || (options.isEnabled && !options.isEnabled())) return
      globalThis.console.debug(`[${namespace}] ${event}`, metadata)
    },
  }
}
