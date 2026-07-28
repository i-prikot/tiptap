<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <div
      v-if="context.open.value"
      ref="floatingRef"
      data-radix-popper-content-wrapper=""
      :style="{ ...floatingStyles, minWidth: 'max-content', zIndex: 50 }"
    >
      <div
        :id="context.contentId"
        ref="contentRef"
        class="tiptap-dropdown-menu-content"
        role="menu"
        data-state="open"
        :data-side="resolvedSide"
        @keydown="handleKeydown"
        @focusin="handleFocusIn"
        @click="handleContentClick"
      >
        <slot />
      </div>
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  watchEffect,
} from 'vue'
import { flip, offset, shift, size, useFloating } from '@floating-ui/vue'
import { getNextRovingIndex, getRovingItems, useEditorOverlayTarget } from '../../../composables'
import { throttledAutoUpdate } from '../../../utils/throttle'
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
const contentRef = shallowRef<HTMLElement | null>(null)

const placement = computed(() => {
  if (props.align === 'center') return props.side
  return `${props.side}-${props.align}` as const
})

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
    whileElementsMounted: throttledAutoUpdate,
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

watchEffect(
  () => {
    floatingRef.value?.style.setProperty(
      '--radix-dropdown-menu-content-transform-origin',
      transformOrigin(resolvedPlacement.value),
    )
  },
  { flush: 'post' },
)

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
    case 'Enter':
    case ' ':
      if (event.isComposing) return
      event.preventDefault()
      ;(document.activeElement as HTMLElement | null)?.click()
      break
    case 'Escape':
      event.preventDefault()
      context.setOpen(false)
      break
  }
}

function closeMenu() {
  context.setOpen(false)
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!context.open.value) return
  const target = event.target as Node | null
  if (!target || floatingRef.value?.contains(target) || context.reference.value?.contains(target))
    return
  closeMenu()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && context.open.value) {
    event.preventDefault()
    closeMenu()
  }
}

function handleContentClick(event: MouseEvent) {
  if (!props.closeOnSelect) return
  const target = event.target as HTMLElement | null
  const item = target?.closest<HTMLElement>('[data-menu-item]')
  if (!item || item.matches(':disabled, [aria-disabled="true"]')) return
  closeMenu()
}

watch(
  () => context.open.value,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      await nextTick()
      updateRovingTabstop()
      const focusTarget = context.consumeFocusTarget()
      if (focusTarget) await context.focusContent(contentRef.value, focusTarget)
    } else if (wasOpen) {
      await context.restoreTriggerFocus(contentRef.value)
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>
