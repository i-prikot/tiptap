import { config, enableAutoUnmount } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'

config.global.renderStubDefaultSlot = true

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})
