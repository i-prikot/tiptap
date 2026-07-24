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
import { useEditorOverlayTarget } from '../../../composables'
import { EditorOverlayTeleport } from '../editor-overlay-teleport'

/**
 * Presentation-only bridge для уже рассчитанного positioning.
 *
 * Компонент телепортирует разметку в overlay-цель, объединяет внешние и
 * computed floating-стили и возвращает реальный HTMLElement через
 * `v-model:floatingElement`. Он не создаёт virtual reference, не вызывает
 * floating-ui и не владеет auto-update/cleanup позиционирования.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  open: boolean
  floatingStyles: StyleValue
  wrapperStyle?: StyleValue
}>()

const floatingElement = defineModel<HTMLElement | null>('floatingElement', { default: null })

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)

/**
 * Отбрасывает component instance, но передаёт реальный `HTMLElement` или `null`
 * через `v-model:floatingElement`. Это позволяет владельцу positioning управлять
 * reference и lifecycle, не раскрывая teleport-детали.
 */
function setFloatingElement(element: Element | ComponentPublicInstance | null) {
  floatingElement.value = element instanceof HTMLElement ? element : null
}
</script>
