import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useMenuNavigation } from '../../../src/editor/composables/useMenuNavigation'

function createNavigation(orientation: 'vertical' | 'horizontal' | 'both' = 'both') {
  const host = document.createElement('div')
  document.body.append(host)
  const items = ref(['first', 'second', 'third'])
  const query = ref('')
  const selected: string[] = []
  const close = vi.fn()
  let selectedIndex: Ref<number> | undefined
  let setSelectedIndex: ((index: number) => void) | undefined

  const wrapper = mount(
    defineComponent({
      setup() {
        const navigation = useMenuNavigation({
          containerRef: ref(host),
          editor: ref(null),
          items,
          onClose: close,
          onSelect: (item) => selected.push(item),
          orientation,
          query,
        })
        selectedIndex = navigation.selectedIndex
        setSelectedIndex = navigation.setSelectedIndex
        return () => h('div')
      },
    }),
  )

  if (!selectedIndex || !setSelectedIndex)
    throw new Error('Expected navigation composable to initialize')

  const trigger = (key: string, options: KeyboardEventInit = {}) => {
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, ...options }))
  }

  return { close, host, items, query, selected, selectedIndex, setSelectedIndex, trigger, wrapper }
}

describe('useMenuNavigation', () => {
  it('navigates all supported keys and executes selection callbacks', () => {
    const navigation = createNavigation()

    navigation.trigger('ArrowDown')
    expect(navigation.selectedIndex.value).toBe(1)
    navigation.trigger('ArrowUp')
    expect(navigation.selectedIndex.value).toBe(0)
    navigation.trigger('ArrowRight')
    expect(navigation.selectedIndex.value).toBe(1)
    navigation.trigger('ArrowLeft')
    expect(navigation.selectedIndex.value).toBe(0)
    navigation.trigger('Tab')
    expect(navigation.selectedIndex.value).toBe(1)
    navigation.trigger('Tab', { shiftKey: true })
    expect(navigation.selectedIndex.value).toBe(0)
    navigation.trigger('End')
    expect(navigation.selectedIndex.value).toBe(2)
    navigation.trigger('Home')
    expect(navigation.selectedIndex.value).toBe(0)
    navigation.trigger('Enter')
    expect(navigation.selected).toEqual(['first'])
    navigation.trigger('Escape')
    expect(navigation.close).toHaveBeenCalledOnce()
    navigation.trigger('Unknown')
    expect(navigation.selectedIndex.value).toBe(0)

    navigation.wrapper.unmount()
    navigation.host.remove()
  })

  it('respects orientation, composing state, empty lists, and query resets', () => {
    const vertical = createNavigation('vertical')
    vertical.trigger('ArrowLeft')
    expect(vertical.selectedIndex.value).toBe(0)
    vertical.setSelectedIndex(-1)
    vertical.trigger('ArrowDown')
    expect(vertical.selectedIndex.value).toBe(0)
    vertical.trigger('Enter', { isComposing: true })
    expect(vertical.selected).toEqual([])
    vertical.query.value = 'filtered'
    expect(vertical.selectedIndex.value).toBe(0)
    vertical.items.value = []
    vertical.trigger('Escape')
    expect(vertical.close).not.toHaveBeenCalled()
    vertical.wrapper.unmount()
    vertical.host.remove()

    const horizontal = createNavigation('horizontal')
    horizontal.trigger('ArrowDown')
    expect(horizontal.selectedIndex.value).toBe(0)
    horizontal.trigger('ArrowRight')
    expect(horizontal.selectedIndex.value).toBe(1)
    horizontal.wrapper.unmount()
    horizontal.host.remove()
  })
})
