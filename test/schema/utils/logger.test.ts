import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from '../../../packages/schema/src/utils/logger'

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not throw when the console sink fails', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('console sink failure')
    })

    const logger = createLogger('test', { minLevel: 'debug' })

    expect(() => logger.warn('Could not write log message')).not.toThrow()
  })

  it('forwards namespaced messages and metadata when the console sink succeeds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const metadata = { source: 'logger-test' }
    const logger = createLogger('test', { minLevel: 'debug' })

    logger.warn('Writing log message', metadata)

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith('[test] Writing log message', metadata)
  })
})
