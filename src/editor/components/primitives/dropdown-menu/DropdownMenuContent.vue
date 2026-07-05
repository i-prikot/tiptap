<template>
  <Teleport to="body">
    <!-- Обёртка-позиционер (аналог [data-radix-popper-content-wrapper]):
         transform floating-ui здесь, CSS-анимация контента — внутри -->
    <div
      v-if="context.open.value"
      ref="floatingRef"
      data-radix-popper-content-wrapper=""
      :style="{ ...floatingStyles, minWidth: 'max-content', zIndex: 50 }"
    >
      <div
        class="tiptap-dropdown-menu-content"
        role="menu"
        data-state="open"
        :data-side="side"
        @click="handleContentClick"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Контент выпадающего меню: floating-ui позиционирование, закрытие по
 * Escape/клику снаружи/выбору пункта. Порт Radix DropdownMenuContent:
 * позиционируется обёртка-поппер, а контенту через CSS-переменные
 * передаются available-height и transform-origin (их использует
 * dropdown-menu.css, перенесённый дословно).
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

const props = withDefaults(
  defineProps<{
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom' | 'left' | 'right'
    sideOffset?: number
    closeOnSelect?: boolean
  }>(),
  { align: 'center', side: 'bottom', sideOffset: 4, closeOnSelect: true },
)

const injected = inject(dropdownMenuInjectionKey)
if (!injected) throw new Error('DropdownMenuContent must be used within DropdownMenu')
const context = injected

const floatingRef = ref<HTMLElement | null>(null)

const placement = computed(() => {
  if (props.align === 'center') return props.side
  return `${props.side}-${props.align}` as const
})

// transform-origin у края, прилегающего к триггеру (как в Radix)
function transformOrigin(resolved: string): string {
  const [resolvedSide, resolvedAlign] = resolved.split('-')
  if (resolvedSide === 'top' || resolvedSide === 'bottom') {
    const x = resolvedAlign === 'start' ? 'left' : resolvedAlign === 'end' ? 'right' : 'center'
    return `${x} ${resolvedSide === 'top' ? 'bottom' : 'top'}`
  }
  const y = resolvedAlign === 'start' ? 'top' : resolvedAlign === 'end' ? 'bottom' : 'center'
  return `${resolvedSide === 'left' ? 'right' : 'left'} ${y}`
}

const { floatingStyles, placement: resolvedPlacement } = useFloating(context.reference, floatingRef, {
  placement,
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(props.sideOffset),
    flip({ padding: 8 }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ elements, availableHeight, availableWidth }) {
        const wrapper = elements.floating
        wrapper.style.setProperty('--radix-dropdown-menu-content-available-height', `${Math.floor(availableHeight)}px`)
        wrapper.style.setProperty('--radix-dropdown-menu-content-available-width', `${Math.floor(availableWidth)}px`)
      },
    }),
  ],
})

const side = computed(() => resolvedPlacement.value.split('-')[0])

// origin зависит от итогового placement (после flip)
watchEffect(() => {
  floatingRef.value?.style.setProperty(
    '--radix-dropdown-menu-content-transform-origin',
    transformOrigin(resolvedPlacement.value),
  )
})

function handleOutsidePointerDown(event: PointerEvent) {
  if (!context) return
  const target = event.target as Node | null
  if (!target) return
  if (floatingRef.value?.contains(target)) return
  if (context.reference.value?.contains(target)) return
  context.setOpen(false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') context.setOpen(false)
}

function handleContentClick(event: MouseEvent) {
  if (!props.closeOnSelect) return
  const target = event.target as HTMLElement | null
  if (target?.closest('[role="menuitem"]')) context.setOpen(false)
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
