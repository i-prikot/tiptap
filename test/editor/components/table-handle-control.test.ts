import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TableHandleControl from '../../../src/editor/components/table/table-handle/TableHandleControl.vue'

const stubs = vi.hoisted(() => ({
  Menu: {
    name: 'Menu',
    props: {
      open: { required: true, type: Boolean },
      placement: { required: true, type: String },
    },
    emits: ['update:open'],
    template: `
      <div data-testid="menu" :data-open="open" :data-placement="placement">
        <slot name="trigger" />
        <slot />
      </div>
    `,
  },
  MenuContent: {
    name: 'MenuContent',
    emits: ['close'],
    template: '<div data-testid="menu-content"><slot /></div>',
  },
  TableHandleMenuContent: {
    name: 'TableHandleMenuContent',
    props: {
      index: { required: true, type: Number },
      orientation: { required: true, type: String },
      tablePos: { required: true, type: Number },
    },
    template: `
      <div
        data-testid="table-handle-menu-content"
        :data-index="index"
        :data-orientation="orientation"
        :data-table-pos="tablePos"
      />
    `,
  },
}))

vi.mock('../../../src/editor/components/primitives', () => ({
  Menu: stubs.Menu,
  MenuContent: stubs.MenuContent,
}))

vi.mock('../../../src/editor/components/table/table-handle/TableHandleMenuContent.vue', () => ({
  default: stubs.TableHandleMenuContent,
}))

function mountControl(
  orientation: 'row' | 'column',
  open = false,
  attrs: Record<string, unknown> = {},
) {
  return mount(TableHandleControl, {
    attrs,
    props: {
      orientation,
      open,
      dragging: true,
      floatingRef: ref(null),
      floatingStyle: { left: '12px' },
      index: 2,
      tablePos: 9,
    },
  })
}

describe('TableHandleControl', () => {
  it('renders row-specific placement, ARIA state, and menu inputs', () => {
    const wrapper = mountControl('row', true)

    expect(wrapper.get('[data-testid="menu"]').attributes()).toMatchObject({
      'data-open': 'true',
      'data-placement': 'top-start',
    })
    expect(wrapper.get('button').attributes()).toMatchObject({
      'aria-label': 'Row actions',
      'aria-expanded': 'true',
      draggable: 'true',
    })
    expect(wrapper.get('button').classes()).toEqual(
      expect.arrayContaining(['row', 'menu-opened', 'is-dragging']),
    )
    expect(wrapper.get('[data-testid="table-handle-menu-content"]').attributes()).toMatchObject({
      'data-index': '2',
      'data-orientation': 'row',
      'data-table-pos': '9',
    })
  })

  it('uses column placement and forwards menu and drag events', async () => {
    const onDragEnd = vi.fn()
    const onDragStart = vi.fn()
    const onOpenChange = vi.fn()
    const wrapper = mountControl('column', false, { onDragEnd, onDragStart, onOpenChange })

    expect(wrapper.get('[data-testid="menu"]').attributes('data-placement')).toBe('bottom-start')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Column actions')

    wrapper.get('button').element.dispatchEvent(new Event('dragstart', { bubbles: true }))
    wrapper.get('button').element.dispatchEvent(new Event('dragend', { bubbles: true }))
    wrapper.getComponent(stubs.Menu).vm.$emit('update:open', true)
    wrapper.getComponent(stubs.MenuContent).vm.$emit('close')
    await nextTick()

    expect(onDragStart).toHaveBeenCalledOnce()
    expect(onDragEnd).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })
})
