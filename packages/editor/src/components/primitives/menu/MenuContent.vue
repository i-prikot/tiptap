<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <!-- Обёртка-позиционер: transform от floating-ui живёт здесь и не конфликтует с CSS-анимацией контента -->
    <div
      v-if="context.open.value"
      ref="floatingRef"
      role="presentation"
      :style="{ ...floatingStyles, zIndex: 50 }"
      @pointerdown.stop
      @pointerenter="context.isSubmenu && context.cancelClose()"
      @pointerleave="context.isSubmenu && context.scheduleClose()"
    >
      <div class="tiptap-menu-content" role="menu" data-state="open" :data-side="side">
        <slot />
      </div>
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
/**
 * Контент контекстного Menu: использует placement родительского Menu и
 * поддерживает вложенную цепочку. При MenuContent.closeOnSelect=true выбор конечного
 * MenuItem после @select вызывает closeAll по всем родителям. При
 * MenuContent.closeOnSelect=false @select всё равно срабатывает, но closeAll
 * не вызывается и цепочка остаётся открытой. submenu-trigger в обоих случаях
 * её не закрывает.
 * Для одноуровневого trigger-owned селектора с side/align/sideOffset и
 * локальным click-to-close используйте DropdownMenuContent.
 */
import { computed, inject, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { useEditorOverlayTarget } from '../../../composables'
import { throttledAutoUpdate } from '../../../utils/throttle'
import { EditorOverlayTeleport } from '../editor-overlay-teleport'
import { menuInjectionKey } from './menu-context'

const props = withDefaults(defineProps<{ closeOnSelect?: boolean }>(), { closeOnSelect: true })

const emit = defineEmits<{ close: [] }>()

const injected = inject(menuInjectionKey)
if (!injected) throw new Error('MenuContent must be used within Menu')
const context = injected

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)

const floatingRef = shallowRef<HTMLElement | null>(null)

const { floatingStyles, placement: resolvedPlacement } = useFloating(
  context.reference,
  floatingRef,
  {
    placement: context.placement,
    whileElementsMounted: throttledAutoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ elements, availableWidth, availableHeight, rects }) {
          const wrapper = elements.floating
          wrapper.style.setProperty(
            '--popover-anchor-width',
            `${Math.round(rects.reference.width)}px`,
          )
          wrapper.style.setProperty('--popover-available-width', `${Math.floor(availableWidth)}px`)
          wrapper.style.setProperty(
            '--popover-available-height',
            `${Math.floor(availableHeight)}px`,
          )
        },
      }),
    ],
  },
)

const side = computed(() => resolvedPlacement.value.split('-')[0])

watch(
  () => context.open.value,
  (isOpen) => {
    if (!isOpen) emit('close')
  },
)

function handleOutsidePointerDown(event: PointerEvent) {
  if (!context.open.value) return
  const target = event.target as Node | null
  if (!target) return
  if (floatingRef.value?.contains(target)) return
  if (context.reference.value?.contains(target)) return
  // клики по вложенным меню (другим floating-слоям) не закрывают
  if ((target as HTMLElement).closest?.('.tiptap-menu-content')) return
  context.setOpen(false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && context.open.value) context.setOpen(false)
}

// клик по конечному пункту меню закрывает всю цепочку
function handleContentClick(event: MouseEvent) {
  if (!props.closeOnSelect) return
  const target = event.target as HTMLElement | null
  const item = target?.closest('[role="menuitem"]')
  if (item && !item.hasAttribute('data-submenu-trigger')) context.closeAll()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleKeydown)
})

watch(
  floatingRef,
  (element, _previousElement, onCleanup) => {
    if (!element) return
    element.addEventListener('click', handleContentClick)
    onCleanup(() => element.removeEventListener('click', handleContentClick))
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
