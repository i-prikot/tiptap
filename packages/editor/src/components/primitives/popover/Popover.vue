<template>
  <span ref="triggerWrapperRef" style="display: contents" @click="toggle">
    <slot name="trigger" />
  </span>
  <FloatingPositioningWrapper
    v-model:floating-element="floatingRef"
    :open="open"
    :floating-styles="floatingStyles"
    :wrapper-style="{ minWidth: 'max-content', zIndex: 50 }"
    data-radix-popper-content-wrapper=""
  >
    <div
      :id="overlay.contentId"
      class="tiptap-popover"
      :role="role"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      data-state="open"
      :data-side="resolvedPlacement"
    >
      <slot />
    </div>
  </FloatingPositioningWrapper>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue'
import { flip, offset as offsetMiddleware, shift, size, useFloating } from '@floating-ui/vue'
import type { Placement } from '@floating-ui/vue'
import { useOverlayAccessibility } from '../../../composables'
import { throttledAutoUpdate } from '../../../utils/throttle'
import { FloatingPositioningWrapper } from '../floating-positioning-wrapper'

const props = withDefaults(
  defineProps<{
    open?: boolean
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    alignOffset?: number
    role?: 'dialog' | 'menu' | 'listbox' | 'group'
    ariaLabel?: string
    ariaLabelledby?: string
    initialFocusSelector?: string
    returnFocus?: boolean
  }>(),
  {
    open: undefined,
    side: 'bottom',
    align: 'center',
    sideOffset: 4,
    alignOffset: 0,
    role: 'group',
    returnFocus: true,
  },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const uncontrolledOpen = ref(props.open ?? false)
const open = computed({
  get: () => props.open ?? uncontrolledOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) uncontrolledOpen.value = value
    emit('update:open', value)
  },
})

const triggerWrapperRef = shallowRef<HTMLElement | null>(null)
const reference = shallowRef<HTMLElement | null>(null)
const floatingRef = shallowRef<HTMLElement | null>(null)
const overlay = useOverlayAccessibility({ component: 'popover' })

function setOpen(value: boolean) {
  open.value = value
}

function toggle() {
  setOpen(!open.value)
}

function getPopupType() {
  if (props.role === 'menu' || props.role === 'listbox') return props.role
  return 'dialog'
}

function syncTriggerAttributes() {
  const trigger = reference.value
  if (!trigger) return

  overlay.setTrigger(trigger)
  trigger.setAttribute('aria-haspopup', getPopupType())
  trigger.setAttribute('aria-expanded', String(open.value))
  trigger.setAttribute('aria-controls', overlay.contentId)
}

onMounted(() => {
  reference.value = (triggerWrapperRef.value?.firstElementChild as HTMLElement | null) ?? null
  syncTriggerAttributes()
})

watch([reference, open], syncTriggerAttributes, { flush: 'post' })

const placement = computed<Placement>(() =>
  props.align === 'center' ? props.side : (`${props.side}-${props.align}` as Placement),
)

const { floatingStyles, placement: resolvedPlacement } = useFloating(reference, floatingRef, {
  placement,
  whileElementsMounted: throttledAutoUpdate,
  middleware: [
    offsetMiddleware({ mainAxis: props.sideOffset, crossAxis: props.alignOffset }),
    flip({ padding: 4 }),
    shift({ padding: 4 }),
    size({
      padding: 8,
      apply({ elements, availableHeight, availableWidth }) {
        const wrapper = elements.floating
        wrapper.style.setProperty(
          '--radix-popover-content-available-height',
          `${Math.floor(availableHeight)}px`,
        )
        wrapper.style.setProperty(
          '--radix-popover-content-available-width',
          `${Math.floor(availableWidth)}px`,
        )
      },
    }),
  ],
})

watchEffect(
  () => {
    const [resolvedSide, resolvedAlign] = resolvedPlacement.value.split('-')
    const origin =
      resolvedSide === 'top' || resolvedSide === 'bottom'
        ? `${resolvedAlign === 'start' ? 'left' : resolvedAlign === 'end' ? 'right' : 'center'} ${
            resolvedSide === 'top' ? 'bottom' : 'top'
          }`
        : `${resolvedSide === 'left' ? 'right' : 'left'} ${
            resolvedAlign === 'start' ? 'top' : resolvedAlign === 'end' ? 'bottom' : 'center'
          }`
    floatingRef.value?.style.setProperty('--radix-popover-content-transform-origin', origin)
  },
  { flush: 'post' },
)

function focusInitialElement() {
  const selector = props.initialFocusSelector
  if (!selector) return
  nextTick(() => floatingRef.value?.querySelector<HTMLElement>(selector)?.focus())
}

watch(open, async (isOpen, wasOpen) => {
  if (isOpen) {
    focusInitialElement()
  } else if (wasOpen && props.returnFocus) {
    await overlay.restoreTriggerFocus(floatingRef.value)
  }
})

function handleOutsidePointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (!target || floatingRef.value?.contains(target) || reference.value?.contains(target)) return
  setOpen(false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.preventDefault()
  setOpen(false)
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose({ setOpen })
</script>
