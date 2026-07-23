import { autoUpdate, type AutoUpdateOptions, type ReferenceElement } from '@floating-ui/dom'
import { throttle } from '@i-prikot/editor-schema'

export { throttle, type ThrottledFunction } from '@i-prikot/editor-schema'

export const FLOATING_UPDATE_THROTTLE_MS = 16

export function throttledAutoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
  options?: AutoUpdateOptions,
): () => void {
  const throttledUpdate = throttle(update, FLOATING_UPDATE_THROTTLE_MS, {
    leading: true,
    trailing: true,
  })
  const cleanup = autoUpdate(reference, floating, throttledUpdate, options)

  return () => {
    cleanup()
    throttledUpdate.cancel()
  }
}
