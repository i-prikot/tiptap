<template>
  <EditorOverlayTeleport :target="teleportTarget">
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
        :data-side="resolvedSide"
        @click="handleContentClick"
      >
        <slot />
      </div>
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
/**
 * Контент одноуровневого trigger-owned DropdownMenu. side/align/sideOffset
 * задают top-level placement, а клик по menuitem закрывает только это меню
 * при closeOnSelect. Здесь нет submenu-цепочки, placement, задаваемого
 * владеющим Menu, или closeAll: для таких контекстных действий используйте
 * MenuContent.
 */
import { computed, inject, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { useEditorOverlayTarget } from '../../../composables'
import { EditorOverlayTeleport } from '../editor-overlay-teleport'
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

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)

const floatingRef = shallowRef<HTMLElement | null>(null)

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

const { floatingStyles, placement: resolvedPlacement } = useFloating(
  context.reference,
  floatingRef,
  {
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
          wrapper.style.setProperty(
            '--radix-dropdown-menu-content-available-height',
            `${Math.floor(availableHeight)}px`,
          )
          wrapper.style.setProperty(
            '--radix-dropdown-menu-content-available-width',
            `${Math.floor(availableWidth)}px`,
          )
        },
      }),
    ],
  },
)

const resolvedSide = computed(() => resolvedPlacement.value.split('-')[0])

// origin зависит от итогового placement (после flip)
watchEffect(
  () => {
    floatingRef.value?.style.setProperty(
      '--radix-dropdown-menu-content-transform-origin',
      transformOrigin(resolvedPlacement.value),
    )
  },
  { flush: 'post' },
)

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
