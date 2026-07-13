import { defineComponent } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TiptapMenu from '../../../../src/editor/components/primitives/menu/Menu.vue'
import MenuContent from '../../../../src/editor/components/primitives/menu/MenuContent.vue'
import MenuItem from '../../../../src/editor/components/primitives/menu/MenuItem.vue'
import {
  dispatchDocumentKeydown,
  dispatchDocumentPointerDown,
  mountInDocument,
  settleTeleportUpdates,
} from './test-utils'

const RootMenuFixture = defineComponent({
  components: { TiptapMenu, MenuContent, MenuItem },
  props: {
    closeOnSelect: { default: true, type: Boolean },
    disabled: { default: false, type: Boolean },
    onOpenChange: { required: true, type: Function },
    onSelect: { required: true, type: Function },
  },
  template: `
    <TiptapMenu @update:open="onOpenChange">
      <template #trigger><button id="menu-trigger" type="button">Open menu</button></template>
      <MenuContent :close-on-select="closeOnSelect">
        <MenuItem id="menu-terminal-item" :disabled="disabled" @select="onSelect">Terminal action</MenuItem>
      </MenuContent>
    </TiptapMenu>
  `,
})

const NestedMenuFixture = defineComponent({
  components: { TiptapMenu, MenuContent, MenuItem },
  props: {
    closeOnSelect: { default: true, type: Boolean },
    onOpenChange: { required: true, type: Function },
    onSelect: { required: true, type: Function },
  },
  template: `
    <TiptapMenu @update:open="onOpenChange">
      <template #trigger><button id="root-menu-trigger" type="button">Open root menu</button></template>
      <MenuContent :close-on-select="closeOnSelect">
        <TiptapMenu>
          <template #trigger><button id="submenu-trigger" type="button">Open submenu</button></template>
          <MenuContent :close-on-select="closeOnSelect">
            <MenuItem id="submenu-terminal-item" @select="onSelect">Nested action</MenuItem>
          </MenuContent>
        </TiptapMenu>
      </MenuContent>
    </TiptapMenu>
  `,
})

function requireDocumentElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)

  expect(element, `Expected ${selector} to be rendered`).not.toBeNull()
  if (!element) throw new Error(`Expected ${selector} to be rendered`)

  return element
}

async function openRootMenu(props: Record<string, unknown> = {}) {
  const onOpenChange = vi.fn()
  const onSelect = vi.fn()
  const wrapper = mountInDocument(RootMenuFixture, {
    props: { onOpenChange, onSelect, ...props },
  })
  await wrapper.get('#menu-trigger').trigger('click')
  await settleTeleportUpdates()

  return { onOpenChange, onSelect, wrapper }
}

async function openNestedMenu(closeOnSelect = true) {
  const onOpenChange = vi.fn()
  const onSelect = vi.fn()
  const wrapper = mountInDocument(NestedMenuFixture, {
    props: { closeOnSelect, onOpenChange, onSelect },
  })
  await wrapper.get('#root-menu-trigger').trigger('click')
  await settleTeleportUpdates()

  return { onOpenChange, onSelect, wrapper }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Menu', () => {
  it('toggles its root teleported menu from the trigger', async () => {
    const { onOpenChange, wrapper } = await openRootMenu()

    expect(requireDocumentElement('[role="menu"]').getAttribute('data-state')).toBe('open')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

    await wrapper.get('#menu-trigger').trigger('click')
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes an open root menu on Escape and outside pointerdown', async () => {
    const escapeCase = await openRootMenu()
    dispatchDocumentKeydown('Escape')
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(escapeCase.onOpenChange).toHaveBeenNthCalledWith(2, false)

    const outsideCase = await openRootMenu()
    dispatchDocumentPointerDown()
    await settleTeleportUpdates()

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(outsideCase.onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('closes the complete parent chain when a nested terminal item is selected', async () => {
    const { onOpenChange, onSelect } = await openNestedMenu()
    const submenuTrigger = requireDocumentElement('#submenu-trigger')
    submenuTrigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    await settleTeleportUpdates()
    const item = requireDocumentElement('#submenu-terminal-item')

    item.click()
    await settleTeleportUpdates()

    expect(onSelect).toHaveBeenCalledExactlyOnceWith()
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
  })

  it('preserves open menus when closeOnSelect is disabled', async () => {
    const { onOpenChange, onSelect } = await openNestedMenu(false)
    const submenuTrigger = requireDocumentElement('#submenu-trigger')
    submenuTrigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    await settleTeleportUpdates()
    const item = requireDocumentElement('#submenu-terminal-item')

    item.click()
    await settleTeleportUpdates()

    expect(onSelect).toHaveBeenCalledExactlyOnceWith()
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2)
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not emit selection or close an open menu for disabled items', async () => {
    const { onOpenChange, onSelect } = await openRootMenu({ disabled: true })
    const item = requireDocumentElement('#menu-terminal-item')
    const clickSpy = vi.fn()

    expect(item.getAttribute('aria-disabled')).toBe('true')
    item.addEventListener('click', clickSpy)
    item.click()
    await settleTeleportUpdates()

    expect(clickSpy).toHaveBeenCalledExactlyOnceWith(expect.any(MouseEvent))
    expect(onSelect).not.toHaveBeenCalled()
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('opens a submenu on pointer enter and delays only its close by 120 ms', async () => {
    vi.useFakeTimers()
    const { onOpenChange } = await openNestedMenu()
    const trigger = requireDocumentElement('#submenu-trigger')

    trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    await settleTeleportUpdates()

    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2)

    trigger.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(119)
    await settleTeleportUpdates()

    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(1)
    await settleTeleportUpdates()

    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1)
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
  })
})
