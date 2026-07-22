import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useUndoRedo } from '../../../packages/editor/src/composables/useUndoRedo'

describe('useUndoRedo', () => {
  it('keeps unavailable controls visible when hiding is disabled', () => {
    const hideWhenUnavailable = ref(false)
    let undoRedo: ReturnType<typeof useUndoRedo> | undefined

    const Host = defineComponent({
      setup() {
        undoRedo = useUndoRedo(
          computed(() => null),
          computed(() => 'undo' as const),
          computed(() => hideWhenUnavailable.value),
        )
        return () => h('div')
      },
    })
    const wrapper = mount(Host)

    if (!undoRedo) throw new Error('Expected undo/redo composable')

    expect(undoRedo.isVisible.value).toBe(true)
    expect(undoRedo.canExecute.value).toBe(false)

    wrapper.unmount()
  })
})
