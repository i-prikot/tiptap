<script lang="ts">
import { cloneVNode, defineComponent, h, type VNode } from 'vue'

function firstElementVNode(children: VNode[]): VNode | undefined {
  return children.find((child) => typeof child.type === 'string' || typeof child.type === 'object')
}

export default defineComponent({
  name: 'MenuItem',
  props: {
    disabled: Boolean,
    submenuTrigger: Boolean,
  },
  emits: ['select'],
  setup(props, { attrs, emit, slots }) {
    function handleClick(event: MouseEvent) {
      if (props.disabled) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!props.submenuTrigger) emit('select')
    }

    return () => {
      const children = slots.default?.() ?? []
      const item = firstElementVNode(children)
      const itemAttributes = {
        ...attrs,
        role: 'menuitem',
        'data-menu-item': '',
        'data-submenu-trigger': props.submenuTrigger || undefined,
        'aria-disabled': props.disabled || undefined,
        'aria-haspopup': props.submenuTrigger ? 'menu' : undefined,
        tabindex: -1,
        onClick: handleClick,
      }

      return item
        ? cloneVNode(item, itemAttributes)
        : h('button', { ...itemAttributes, type: 'button' }, children)
    }
  },
})
</script>
