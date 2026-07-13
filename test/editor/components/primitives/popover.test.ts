import { describe, expect, it, vi } from 'vitest'
import Popover from '../../../../src/editor/components/primitives/popover/Popover.vue'
import {
  dispatchDocumentKeydown,
  dispatchDocumentPointerDown,
  mountInDocument,
  settleTeleportUpdates,
} from './test-utils'

function mountPopover(props: Record<string, unknown> = {}) {
  return mountInDocument(Popover, {
    props,
    slots: {
      default: '<button id="popover-content-button" type="button">Popover content</button>',
      trigger: '<button id="popover-trigger" type="button">Open popover</button>',
    },
  })
}

function requireDocumentElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)

  expect(element, `Expected ${selector} to be rendered`).not.toBeNull()
  if (!element) throw new Error(`Expected ${selector} to be rendered`)

  return element
}

async function openPopover() {
  const onOpenChange = vi.fn()
  const wrapper = mountPopover({ side: 'right', 'onUpdate:open': onOpenChange })
  await wrapper.get('#popover-trigger').trigger('click')
  await settleTeleportUpdates()

  return { onOpenChange, wrapper }
}

describe('Popover', () => {
  it('opens from its named trigger and emits the open transition', async () => {
    const { onOpenChange } = await openPopover()
    const content = requireDocumentElement('.tiptap-popover')

    expect(content.textContent).toContain('Popover content')
    expect(content.dataset.state).toBe('open')
    expect(content.dataset.side).toBe('right')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('synchronizes its rendered layer when the controlled open prop changes', async () => {
    const wrapper = mountPopover({ open: false })

    expect(document.querySelector('.tiptap-popover')).toBeNull()

    await wrapper.setProps({ open: true })
    await settleTeleportUpdates()

    expect(document.querySelector('.tiptap-popover')).not.toBeNull()

    await wrapper.setProps({ open: false })
    await settleTeleportUpdates()

    expect(document.querySelector('.tiptap-popover')).toBeNull()
  })

  it('keeps the popover open for pointer interactions inside trigger and content', async () => {
    const { wrapper } = await openPopover()
    const content = requireDocumentElement('.tiptap-popover')

    dispatchDocumentPointerDown(wrapper.get('#popover-trigger').element)
    dispatchDocumentPointerDown(content)
    await settleTeleportUpdates()

    expect(document.querySelector('.tiptap-popover')).not.toBeNull()
  })

  it('closes and emits a close transition on Escape', async () => {
    const { onOpenChange } = await openPopover()

    dispatchDocumentKeydown('Escape')
    await settleTeleportUpdates()

    expect(document.querySelector('.tiptap-popover')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes and emits a close transition on document pointerdown outside', async () => {
    const { onOpenChange } = await openPopover()

    dispatchDocumentPointerDown()
    await settleTeleportUpdates()

    expect(document.querySelector('.tiptap-popover')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })
})
