<script lang="ts">
import { cloneVNode, defineComponent, h, type VNode } from 'vue'

function firstElementVNode(children: VNode[]): VNode | undefined {
  return children.find((child) => typeof child.type === 'string' || typeof child.type === 'object')
}

export default defineComponent({
  name: 'DropdownMenuItem',
  setup(_, { attrs, slots }) {
    return () => {
      const children = slots.default?.() ?? []
      const item = firstElementVNode(children)
      const itemAttributes = {
        ...attrs,
        role: 'menuitem',
        'data-menu-item': '',
        tabindex: -1,
      }

      return item
        ? cloneVNode(item, itemAttributes)
        : h('button', { ...itemAttributes, type: 'button' }, children)
    }
  },
})
</script>
