<template>
  <span
    ref="referenceRef"
    class="tiptap-tooltip-trigger"
    :data-tooltip-state="open ? 'open' : 'closed'"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </span>
  <EditorOverlayTeleport :target="teleportTarget">
    <div
      v-if="open"
      ref="floatingRef"
      class="tiptap-tooltip"
      role="tooltip"
      :style="floatingStyles"
    >
      <slot name="content" />
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
/**
 * Tooltip на floating-ui: hover (только мышь) и focus, задержка открытия,
 * placement top c offset 4 / flip / shift — как в оригинальном примитиве
 * из чанка 3q2p49kc-ifgd.
 */
import { computed, ref, shallowRef } from 'vue'
import { flip, offset, shift, useFloating, autoUpdate } from '@floating-ui/vue'
import { useEditorOverlayTarget } from '../../../composables'
import { EditorOverlayTeleport } from '../editor-overlay-teleport'

const props = withDefaults(
  defineProps<{
    delay?: number
    closeDelay?: number
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  { delay: 200, closeDelay: 0, placement: 'top' },
)

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)
const open = ref(false)
const referenceRef = shallowRef<HTMLElement | null>(null)
const floatingRef = shallowRef<HTMLElement | null>(null)

const { floatingStyles } = useFloating(referenceRef, floatingRef, {
  placement: props.placement,
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(4),
    flip({ fallbackAxisSideDirection: 'start', padding: 4 }),
    shift({ padding: 4 }),
  ],
})

let openTimer: number | undefined
let closeTimer: number | undefined

function show() {
  window.clearTimeout(closeTimer)
  open.value = true
}

function hide() {
  window.clearTimeout(openTimer)
  if (props.closeDelay > 0) {
    closeTimer = window.setTimeout(() => {
      open.value = false
    }, props.closeDelay)
  } else {
    open.value = false
  }
}

function handleMouseEnter() {
  window.clearTimeout(closeTimer)
  openTimer = window.setTimeout(show, props.delay)
}

function handleMouseLeave() {
  window.clearTimeout(openTimer)
  hide()
}
</script>
