<template>
  <Tooltip v-if="tooltip && showTooltip" :delay="200">
    <button
      data-slot="tiptap-button"
      :class="['tiptap-button', $attrs.class]"
      :data-style="variant"
      :data-size="size"
      v-bind="attrsWithoutClass"
    >
      <slot />
    </button>
    <template #content>
      {{ tooltip }}
      <div v-if="shortcuts.length">
        <template v-for="(shortcut, index) in shortcuts" :key="index">
          <kbd v-if="index > 0">+</kbd>
          <kbd>{{ shortcut }}</kbd>
        </template>
      </div>
    </template>
  </Tooltip>
  <button
    v-else
    data-slot="tiptap-button"
    :class="['tiptap-button', $attrs.class]"
    :data-style="variant"
    :data-size="size"
    v-bind="attrsWithoutClass"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
/**
 * Кнопка tiptap-ui: data-style/data-size, опциональный tooltip
 * с отображением шортката.
 */
import { computed, useAttrs } from 'vue'
import { parseShortcutKeys } from '../../../utils/tiptap-utils'
import { Tooltip } from '../tooltip'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  variant?: string
  size?: string
  tooltip?: string
  showTooltip?: boolean
  shortcutKeys?: string
}>()

const showTooltip = computed(() => props.showTooltip !== false)
const shortcuts = computed(() => parseShortcutKeys({ shortcutKeys: props.shortcutKeys }))

const attrs = useAttrs()
const attrsWithoutClass = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
