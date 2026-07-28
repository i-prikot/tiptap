<script lang="ts">
import { cloneVNode, defineComponent, inject, type ComponentPublicInstance, type VNode } from 'vue'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

function firstElementVNode(children: VNode[]): VNode | undefined {
  return children.find((child) => typeof child.type === 'string' || typeof child.type === 'object')
}

function resolveElement(element: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (!element) return null
  if (element instanceof HTMLElement) return element
  const instance = element as ComponentPublicInstance
  return instance.$el instanceof HTMLElement ? instance.$el : null
}

export default defineComponent({
  name: 'DropdownMenuTrigger',
  setup(_, { slots }) {
    const context = inject(dropdownMenuInjectionKey)
    if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu')
    const menuContext = context

    function handlePointerDown(event: PointerEvent) {
      menuContext.recordOpenEvent(event)
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        menuContext.openFromKeyboard(event, 'first')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        menuContext.openFromKeyboard(event, 'last')
      } else if (event.key === 'Enter' || event.key === ' ') {
        menuContext.recordOpenEvent(event)
      }
    }

    function handleClick() {
      menuContext.setOpen(!menuContext.open.value)
    }

    return () => {
      const trigger = firstElementVNode(slots.default?.() ?? [])
      if (!trigger) return null

      return cloneVNode(trigger, {
        ref: (element: Element | ComponentPublicInstance | null) => {
          const triggerElement = resolveElement(element)
          menuContext.reference.value = triggerElement
          menuContext.setTrigger(triggerElement)
        },
        'aria-haspopup': 'menu',
        'aria-expanded': menuContext.open.value,
        'aria-controls': menuContext.contentId,
        onPointerdown: handlePointerDown,
        onKeydown: handleKeydown,
        onClick: handleClick,
      })
    }
  },
})
</script>
