<template>
  <span ref="triggerWrapperRef" style="display: contents" @click="toggle">
    <slot name="trigger" />
  </span>
  <Teleport to="body">
    <!-- Обёртка-позиционер (аналог [data-radix-popper-content-wrapper]):
         transform floating-ui не конфликтует с CSS-анимацией контента -->
    <div
      v-if="open"
      ref="floatingRef"
      data-radix-popper-content-wrapper=""
      :style="{ ...floatingStyles, minWidth: 'max-content', zIndex: 50 }"
    >
      <div class="tiptap-popover" data-state="open" :data-side="resolvedPlacement">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Поповер (порт Popover из чанка 3q2p49kc-ifgd): триггер + floating
 * контент, закрытие по Escape/клику снаружи.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { autoUpdate, flip, offset as offsetMiddleware, shift, size, useFloating } from '@floating-ui/vue'
import type { Placement } from '@floating-ui/vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    alignOffset?: number
  }>(),
  { open: undefined, side: 'bottom', align: 'center', sideOffset: 4, alignOffset: 0 },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const open = ref(props.open ?? false)
watch(
  () => props.open,
  value => {
    if (value !== undefined) open.value = value
  },
)

function setOpen(value: boolean) {
  open.value = value
  emit('update:open', value)
}

function toggle() {
  setOpen(!open.value)
}

const triggerWrapperRef = ref<HTMLElement | null>(null)
const reference = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

onMounted(() => {
  reference.value = (triggerWrapperRef.value?.firstElementChild as HTMLElement | null) ?? null
})

const placement = computed<Placement>(() =>
  props.align === 'center' ? props.side : (`${props.side}-${props.align}` as Placement),
)

const { floatingStyles, placement: resolvedPlacement } = useFloating(reference, floatingRef, {
  placement,
  whileElementsMounted: autoUpdate,
  middleware: [
    offsetMiddleware({ mainAxis: props.sideOffset, crossAxis: props.alignOffset }),
    flip({ padding: 4 }),
    shift({ padding: 4 }),
    size({
      padding: 8,
      apply({ elements, availableHeight, availableWidth }) {
        const wrapper = elements.floating
        wrapper.style.setProperty('--radix-popover-content-available-height', `${Math.floor(availableHeight)}px`)
        wrapper.style.setProperty('--radix-popover-content-available-width', `${Math.floor(availableWidth)}px`)
      },
    }),
  ],
})

// transform-origin у края, прилегающего к триггеру (как в Radix)
watchEffect(() => {
  const [resolvedSide, resolvedAlign] = resolvedPlacement.value.split('-')
  let origin: string
  if (resolvedSide === 'top' || resolvedSide === 'bottom') {
    const x = resolvedAlign === 'start' ? 'left' : resolvedAlign === 'end' ? 'right' : 'center'
    origin = `${x} ${resolvedSide === 'top' ? 'bottom' : 'top'}`
  } else {
    const y = resolvedAlign === 'start' ? 'top' : resolvedAlign === 'end' ? 'bottom' : 'center'
    origin = `${resolvedSide === 'left' ? 'right' : 'left'} ${y}`
  }
  floatingRef.value?.style.setProperty('--radix-popover-content-transform-origin', origin)
})

function handleOutsidePointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (!target) return
  if (floatingRef.value?.contains(target)) return
  if (reference.value?.contains(target)) return
  setOpen(false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) setOpen(false)
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
