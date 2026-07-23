import { throttle as schemaThrottle } from '@i-prikot/editor-schema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle as editorThrottle } from '../../../src/editor/utils/throttle'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('cleans up Floating UI and cancels queued positioning updates on teardown', async () => {
    const cleanup = vi.fn()
    const update = vi.fn()
    const autoUpdateMock = vi.fn(
      (
        _reference: import('@floating-ui/dom').ReferenceElement,
        _floating: HTMLElement,
        autoUpdateCallback: () => void,
      ) => {
        autoUpdateCallback()
        autoUpdateCallback()

        return cleanup
      },
    )
    const throttleMock = vi.fn(schemaThrottle)

    vi.resetModules()
    vi.doMock('@floating-ui/dom', () => ({
      autoUpdate: autoUpdateMock,
    }))
    vi.doMock('@i-prikot/editor-schema', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@i-prikot/editor-schema')>()

      return {
        ...actual,
        throttle: throttleMock,
      }
    })

    try {
      const { FLOATING_UPDATE_THROTTLE_MS, throttledAutoUpdate } =
        await import('../../../src/editor/utils/throttle')
      const dispose = throttledAutoUpdate(
        document.createElement('button'),
        document.createElement('div'),
        update,
      )
      const throttledUpdate = throttleMock.mock.results[0]?.value

      expect(throttledUpdate).toBeDefined()

      if (!throttledUpdate) {
        throw new Error('throttledAutoUpdate did not create a throttled update callback')
      }

      const cancel = vi.spyOn(throttledUpdate, 'cancel')

      expect(update).toHaveBeenCalledOnce()

      dispose()

      expect(cleanup).toHaveBeenCalledOnce()
      expect(cancel).toHaveBeenCalledOnce()

      vi.advanceTimersByTime(FLOATING_UPDATE_THROTTLE_MS)

      expect(update).toHaveBeenCalledOnce()
    } finally {
      vi.doUnmock('@floating-ui/dom')
      vi.doUnmock('@i-prikot/editor-schema')
      vi.resetModules()
    }
  })

  it('invokes immediately, then coalesces rapid calls with the latest arguments', () => {
    const callback = vi.fn<(value: string) => void>()
    const throttled = schemaThrottle(callback, 100)

    throttled('first')
    vi.advanceTimersByTime(40)
    throttled('second')
    vi.advanceTimersByTime(20)
    throttled('latest')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith('first')

    vi.advanceTimersByTime(39)
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('latest')
  })

  it('defers the initial call when leading is disabled', () => {
    const callback = vi.fn<(value: string) => void>()
    const throttled = schemaThrottle(callback, 100, { leading: false })

    throttled('deferred')
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('deferred')
  })

  it('does not queue trailing calls when trailing is disabled', () => {
    const callback = vi.fn<(value: string) => void>()
    const throttled = schemaThrottle(callback, 100, { trailing: false })

    throttled('leading')
    vi.advanceTimersByTime(20)
    throttled('ignored')
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('leading')
  })

  it('handles a call at the wait boundary once', () => {
    const callback = vi.fn<(value: string) => void>()
    const throttled = schemaThrottle(callback, 100)

    throttled('first')
    vi.advanceTimersByTime(100)
    throttled('boundary')
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls).toEqual([['first'], ['boundary']])
  })

  it('cancels pending trailing work and resets its timer state', () => {
    const callback = vi.fn<(value: string) => void>()
    const throttled = schemaThrottle(callback, 100)

    throttled('leading')
    vi.advanceTimersByTime(20)
    throttled('pending')
    throttled.cancel()
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('leading')

    throttled('after-cancel')
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('after-cancel')
  })

  it('re-exports the canonical schema throttle implementation', () => {
    expect(editorThrottle).toBe(schemaThrottle)
  })
})
