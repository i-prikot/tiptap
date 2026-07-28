<template>
  <span ref="triggerWrapperRef" style="display: contents" @click="handleTriggerClick">
    <slot name="trigger" />
  </span>
  <slot />
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import type { Placement } from '@floating-ui/vue'
import { useOverlayAccessibility, type OverlayFocusTarget } from '../../../composables'
import { menuInjectionKey } from './menu-context'

const props = withDefaults(
  defineProps<{
    open?: boolean
    placement?: Placement
  }>(),
  { open: undefined, placement: 'bottom-start' },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const parentMenu = inject(menuInjectionKey, null)
const isSubmenu = parentMenu !== null
const uncontrolledOpen = ref(props.open ?? false)
const open = computed({
  get: () => props.open ?? uncontrolledOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) uncontrolledOpen.value = value
    emit('update:open', value)
  },
})
const reference = shallowRef<HTMLElement | null>(null)
const content = shallowRef<HTMLElement | null>(null)
const triggerWrapperRef = shallowRef<HTMLElement | null>(null)
const overlay = useOverlayAccessibility({ component: 'menu' })
let focusTarget: OverlayFocusTarget | null = null
let closeTimer: ReturnType<typeof setTimeout> | undefined

function setOpen(value: boolean) {
  open.value = value
}

function closeAll() {
  setOpen(false)
  parentMenu?.closeAll()
}

function setContent(element: HTMLElement | null) {
  content.value = element
}

function syncTriggerAttributes() {
  const trigger = reference.value
  if (!trigger) return

  overlay.setTrigger(trigger)
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', String(open.value))
  trigger.setAttribute('aria-controls', overlay.contentId)
}

function restoreTriggerFocus() {
  return overlay.restoreTriggerFocus(content.value)
}

function openFromKeyboard(event: KeyboardEvent, target: OverlayFocusTarget) {
  event.preventDefault()
  event.stopPropagation()
  overlay.recordOpenEvent(event)
  if (open.value) {
    void overlay.focusContent(content.value, target)
    return
  }

  focusTarget = target
  setOpen(true)
}

function consumeFocusTarget() {
  const target = focusTarget
  focusTarget = null
  return target
}

function cancelClose() {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => setOpen(false), 120)
}

function openHover() {
  cancelClose()
  setOpen(true)
}

function handleTriggerClick() {
  if (isSubmenu) setOpen(true)
  else setOpen(!open.value)
}

function handleTriggerKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      openFromKeyboard(event, 'first')
      break
    case 'ArrowUp':
      openFromKeyboard(event, 'last')
      break
    case 'ArrowRight':
      if (isSubmenu) openFromKeyboard(event, 'first')
      break
    case 'ArrowLeft':
      if (!isSubmenu || !open.value) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      break
    case 'Enter':
    case ' ':
      if (event.isComposing) return
      openFromKeyboard(event, 'first')
      break
    case 'Escape':
      if (!open.value) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      break
  }
}

function setReference(element: HTMLElement | null) {
  if (reference.value === element) return

  if (reference.value) {
    reference.value.removeEventListener('keydown', handleTriggerKeydown)
    if (isSubmenu) {
      reference.value.removeEventListener('pointerenter', openHover)
      reference.value.removeEventListener('pointerleave', scheduleClose)
    }
  }

  reference.value = element
  if (!element) return

  element.addEventListener('keydown', handleTriggerKeydown)
  if (isSubmenu) {
    element.addEventListener('pointerenter', openHover)
    element.addEventListener('pointerleave', scheduleClose)
  }
  syncTriggerAttributes()
}

onMounted(() => {
  setReference((triggerWrapperRef.value?.firstElementChild as HTMLElement | null) ?? null)
})

onBeforeUnmount(() => {
  cancelClose()
  setReference(null)
})

watch([reference, open], syncTriggerAttributes, { flush: 'post' })

provide(menuInjectionKey, {
  open,
  setOpen,
  reference,
  content,
  setContent,
  contentId: overlay.contentId,
  placement: props.placement,
  closeAll,
  isSubmenu,
  cancelClose,
  scheduleClose,
  openFromKeyboard,
  consumeFocusTarget,
  restoreTriggerFocus,
})
</script>
