import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FloatingElement from '../../../../src/editor/components/ui/suggestion/FloatingElement.vue'

const selectionMocks = vi.hoisted(() => ({
  near: vi.fn(() => ({ type: 'reset-selection' })),
}))

vi.mock('@tiptap/pm/state', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tiptap/pm/state')>()
  return { ...original, Selection: { near: selectionMocks.near } }
})

vi.mock('../../../../src/editor/utils/selection-utils', () => ({
  getSelectionBoundingRect: () => new DOMRect(20, 20, 80, 24),
}))

function createEditor() {
  const dom = document.createElement('div')
  const callbacks = new Map<string, Set<() => void>>()
  const transaction = {
    setSelection: vi.fn(() => transaction),
  }
  const editor = {
    off: vi.fn((event: string, callback: () => void) => {
      callbacks.get(event)?.delete(callback)
      return editor
    }),
    on: vi.fn((event: string, callback: () => void) => {
      const eventCallbacks = callbacks.get(event) ?? new Set<() => void>()
      eventCallbacks.add(callback)
      callbacks.set(event, eventCallbacks)
      return editor
    }),
    state: {
      doc: { resolve: vi.fn(() => ({ pos: 0 })) },
      tr: transaction,
    },
    view: { dispatch: vi.fn(), dom },
  }
  document.body.append(dom)

  return {
    editor,
    emit(event: string) {
      for (const callback of callbacks.get(event) ?? []) callback()
    },
    transaction,
  }
}

function floatingRoot(): HTMLElement {
  const root = document.body.querySelector<HTMLElement>('[data-floating-element="test"]')
  if (!root) throw new Error('Expected the floating element to be open')
  return root
}

describe('FloatingElement branch behavior', () => {
  const wrappers: Array<{ unmount: () => void }> = []

  afterEach(() => {
    while (wrappers.length) wrappers.pop()?.unmount()
    document.body.replaceChildren()
    selectionMocks.near.mockClear()
  })

  it('closes for Escape, dragging, and outside dismissal while preserving guarded targets', async () => {
    const fixture = createEditor()
    const wrapper = mount(FloatingElement, {
      attrs: { 'data-floating-element': 'test' },
      props: { editor: fixture.editor as never, shouldShow: true },
      slots: { default: 'Floating controls' },
    })
    wrappers.push(wrapper)
    await nextTick()
    await nextTick()

    expect(floatingRoot().textContent).toContain('Floating controls')
    fixture.emit('selectionUpdate')

    floatingRoot().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    fixture.editor.view.dom.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    const menuLayer = document.createElement('div')
    menuLayer.className = 'tiptap-menu-content'
    document.body.append(menuLayer)
    menuLayer.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    expect(floatingRoot()).toBeInstanceOf(HTMLElement)

    fixture.editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await nextTick()
    expect(document.body.querySelector('[data-floating-element="test"]')).toBeNull()

    await wrapper.setProps({ shouldShow: false })
    await wrapper.setProps({ shouldShow: true })
    fixture.editor.view.dom.dispatchEvent(new Event('dragstart'))
    await nextTick()
    expect(document.body.querySelector('[data-floating-element="test"]')).toBeNull()

    await wrapper.setProps({ shouldShow: false })
    await wrapper.setProps({ shouldShow: true })
    const outside = document.createElement('button')
    document.body.append(outside)
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()

    expect(selectionMocks.near).toHaveBeenCalled()
    expect(fixture.transaction.setSelection).toHaveBeenCalledWith({ type: 'reset-selection' })
    expect(fixture.editor.view.dispatch).toHaveBeenCalledWith(fixture.transaction)
    expect(document.body.querySelector('[data-floating-element="test"]')).toBeNull()
  })

  it('honors disabled Escape handling and skips selection reset when configured', async () => {
    const fixture = createEditor()
    const wrapper = mount(FloatingElement, {
      attrs: { 'data-floating-element': 'test' },
      props: {
        closeOnEscape: false,
        editor: fixture.editor as never,
        resetTextSelectionOnClose: false,
        shouldShow: true,
      },
    })
    wrappers.push(wrapper)
    await nextTick()

    fixture.editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(floatingRoot()).toBeInstanceOf(HTMLElement)

    const outside = document.createElement('div')
    document.body.append(outside)
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()

    expect(fixture.editor.view.dispatch).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-floating-element="test"]')).toBeNull()
  })
})
