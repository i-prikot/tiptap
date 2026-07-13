import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import DropdownMenu from '../../../../src/editor/components/primitives/dropdown-menu/DropdownMenu.vue'
import DropdownMenuContent from '../../../../src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue'
import DropdownMenuItem from '../../../../src/editor/components/primitives/dropdown-menu/DropdownMenuItem.vue'
import DropdownMenuTrigger from '../../../../src/editor/components/primitives/dropdown-menu/DropdownMenuTrigger.vue'
import {
  dispatchDocumentKeydown,
  dispatchDocumentPointerDown,
  mountInDocument,
  settleTeleportUpdates,
} from './test-utils'

const DropdownFixture = defineComponent({
  components: {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  },
  props: {
    closeOnSelect: { default: true, type: Boolean },
    onOpenChange: { required: true, type: Function },
    onSelect: { required: true, type: Function },
  },
  template: `
    <DropdownMenu @update:open="onOpenChange">
      <DropdownMenuTrigger>
        <button id="dropdown-trigger" type="button">Open dropdown</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent :close-on-select="closeOnSelect" side="left">
        <DropdownMenuItem id="dropdown-item" @click="onSelect">Action</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  `,
})

function requireDocumentElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)

  expect(element, `Expected ${selector} to be rendered`).not.toBeNull()
  if (!element) throw new Error(`Expected ${selector} to be rendered`)

  return element
}

async function openDropdown(closeOnSelect = true) {
  const onOpenChange = vi.fn()
  const onSelect = vi.fn()
  const wrapper = mountInDocument(DropdownFixture, {
    props: { closeOnSelect, onOpenChange, onSelect },
  })
  await wrapper.get('#dropdown-trigger').trigger('click')
  await settleTeleportUpdates()

  return { onOpenChange, onSelect, wrapper }
}

describe('DropdownMenu', () => {
  it('toggles from its trigger, emits state, and exposes a teleported menu', async () => {
    const { onOpenChange, wrapper } = await openDropdown()
    const menu = requireDocumentElement('[role="menu"]')

    expect(menu.dataset.state).toBe('open')
    expect(menu.dataset.side).toBe('left')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

    await wrapper.get('#dropdown-trigger').trigger('click')
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes an open menu on Escape', async () => {
    const { onOpenChange } = await openDropdown()

    dispatchDocumentKeydown('Escape')
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes an open menu on outside document pointerdown', async () => {
    const { onOpenChange } = await openDropdown()

    dispatchDocumentPointerDown()
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes by default when a descendant menu item is selected', async () => {
    const { onOpenChange, onSelect } = await openDropdown()
    const item = requireDocumentElement('#dropdown-item')

    item.click()
    await settleTeleportUpdates()

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.any(MouseEvent))
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('keeps the menu open when closeOnSelect is disabled', async () => {
    const { onOpenChange, onSelect } = await openDropdown(false)
    const item = requireDocumentElement('#dropdown-item')

    item.click()
    await settleTeleportUpdates()

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.any(MouseEvent))
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
  })
})
