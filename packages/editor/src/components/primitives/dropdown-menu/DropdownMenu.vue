<template>
  <slot />
</template>

<script setup lang="ts">
/** A trigger-owned, single-level menu with keyboard focus management. */
import { computed, provide, ref, shallowRef } from 'vue'
import { useOverlayAccessibility, type OverlayFocusTarget } from '../../../composables'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

const props = withDefaults(defineProps<{ open?: boolean }>(), { open: undefined })
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const uncontrolledOpen = ref(props.open ?? false)
const open = computed({
  get: () => props.open ?? uncontrolledOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) uncontrolledOpen.value = value
    emit('update:open', value)
  },
})
const reference = shallowRef<HTMLElement | null>(null)
const overlay = useOverlayAccessibility({ component: 'dropdown-menu' })
let focusTarget: OverlayFocusTarget | null = null

function setOpen(value: boolean) {
  open.value = value
}

function openFromKeyboard(event: KeyboardEvent, target: OverlayFocusTarget) {
  overlay.recordOpenEvent(event)
  focusTarget = target
  setOpen(true)
}

function consumeFocusTarget() {
  const target = focusTarget
  focusTarget = null
  return target
}

provide(dropdownMenuInjectionKey, {
  open,
  setOpen,
  reference,
  setTrigger: overlay.setTrigger,
  contentId: overlay.contentId,
  openFromKeyboard,
  recordOpenEvent: overlay.recordOpenEvent,
  focusContent: overlay.focusContent,
  restoreTriggerFocus: overlay.restoreTriggerFocus,
  consumeFocusTarget,
})
</script>
