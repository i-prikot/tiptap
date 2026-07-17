import { config, enableAutoUnmount } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'

config.global.renderStubDefaultSlot = true

const autoUnmountEnabled = Symbol.for('vitest.vue-test-utils.auto-unmount-enabled')

if (!Reflect.get(globalThis, autoUnmountEnabled)) {
  enableAutoUnmount(afterEach)
  Reflect.set(globalThis, autoUnmountEnabled, true)
}

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.document?.body.replaceChildren()
})
