<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <div
      v-if="context.open.value"
      ref="floatingRef"
      role="presentation"
      :style="{ ...floatingStyles, zIndex: 50 }"
      @pointerdown.stop
      @pointerenter="context.isSubmenu && context.cancelClose()"
      @pointerleave="context.isSubmenu && context.scheduleClose()"
    >
      <div
        :id="context.contentId"
        ref="contentRef"
        class="tiptap-menu-content"
        role="menu"
        data-state="open"
        :data-side="side"
        @click="handleContentClick"
        @focusin="handleFocusIn"
        @keydown="handleKeydown"
      >
        <slot />
      </div>
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { getNextRovingIndex, getRovingItems, useEditorOverlayTarget } from '../../../composables'
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
const contentRef = shallowRef<HTMLElement | null>(null)

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

function updateRovingTabstop(activeItem: Element | null = document.activeElement) {
  const items = getRovingItems(contentRef.value)
  const selectedItem =
    activeItem instanceof HTMLElement && items.includes(activeItem) ? activeItem : items[0]
  items.forEach((item) => item.setAttribute('tabindex', item === selectedItem ? '0' : '-1'))
}

function handleFocusIn(event: FocusEvent) {
  updateRovingTabstop(event.target instanceof Element ? event.target : null)
}

function focusItem(direction: 'next' | 'previous' | 'first' | 'last') {
  const items = getRovingItems(contentRef.value)
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const nextItem = items[getNextRovingIndex(currentIndex, items.length, direction)]
  if (!nextItem) return

  updateRovingTabstop(nextItem)
  nextItem.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItem('next')
      break
    case 'ArrowUp':
      event.preventDefault()
      focusItem('previous')
      break
    case 'Home':
      event.preventDefault()
      focusItem('first')
      break
    case 'End':
      event.preventDefault()
      focusItem('last')
      break
    case 'ArrowLeft':
      if (!context.isSubmenu) return
      event.preventDefault()
      event.stopPropagation()
      context.setOpen(false)
      break
    case 'Enter':
    case ' ':
      if (event.isComposing) return
      event.preventDefault()
      ;(document.activeElement as HTMLElement | null)?.click()
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      context.setOpen(false)
      break
  }
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!context.open.value) return
  const target = event.target as Node | null
  if (!target || floatingRef.value?.contains(target) || context.reference.value?.contains(target))
    return
  if ((target as HTMLElement).closest?.('.tiptap-menu-content')) return
  context.closeAll()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.key !== 'Escape' || !context.open.value || context.isSubmenu)
    return

  event.preventDefault()
  context.closeAll()
}

function handleContentClick(event: MouseEvent) {
  if (!props.closeOnSelect) return
  const target = event.target as HTMLElement | null
  const item = target?.closest<HTMLElement>('[data-menu-item]')
  if (!item || item.matches(':disabled, [aria-disabled="true"], [data-submenu-trigger]')) return
  context.closeAll()
}

watch(
  () => context.open.value,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      await nextTick()
      context.setContent(contentRef.value)
      updateRovingTabstop()
      const target = context.consumeFocusTarget()
      if (target) focusItem(target)
    } else if (wasOpen) {
      await context.restoreTriggerFocus()
      emit('close')
    }
  },
)

watch(contentRef, (element) => context.setContent(element), { flush: 'post' })

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  context.setContent(null)
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>
