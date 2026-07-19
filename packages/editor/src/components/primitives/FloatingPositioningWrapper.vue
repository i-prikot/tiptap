<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <div
      v-if="open"
      :ref="setFloatingElement"
      v-bind="$attrs"
      :style="[wrapperStyle, $attrs.style, floatingStyles]"
    >
      <slot />
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentPublicInstance, StyleValue } from 'vue'
import { useEditorOverlayTarget } from '../../composables'
import EditorOverlayTeleport from './EditorOverlayTeleport.vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  open: boolean
  floatingStyles: StyleValue
  wrapperStyle?: StyleValue
}>()

const floatingElement = defineModel<HTMLElement | null>('floatingElement', { default: null })

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)

function setFloatingElement(element: Element | ComponentPublicInstance | null) {
  floatingElement.value = element instanceof HTMLElement ? element : null
}
</script>
