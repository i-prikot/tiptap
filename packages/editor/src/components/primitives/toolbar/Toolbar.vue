<template>
  <div
    ref="toolbarRef"
    role="toolbar"
    aria-label="toolbar"
    :data-variant="variant"
    class="tiptap-toolbar"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Тулбар (порт Toolbar из чанка 1mpndbcfk3lik): горизонтальная навигация
 * стрелками по кнопкам, data-focus-visible для фокуса с клавиатуры.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useMenuNavigation } from '../../../composables'

withDefaults(defineProps<{ variant?: 'floating' | 'fixed' }>(), { variant: 'fixed' })

const toolbarRef = shallowRef<HTMLElement | null>(null)
const focusableItems = shallowRef<HTMLElement[]>([])
const query = ref('')

function collectItems() {
  const root = toolbarRef.value
  if (!root) return
  focusableItems.value = Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [role="button"]:not([disabled]), [tabindex="0"]:not([disabled])',
    ),
  )
}

let observer: MutationObserver | null = null

const { selectedIndex } = useMenuNavigation<HTMLElement>({
  editor: shallowRef(null),
  containerRef: toolbarRef,
  query,
  items: focusableItems,
  orientation: 'horizontal',
  onSelect: (item) => item.click(),
  autoSelectFirstItem: false,
})

function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (toolbarRef.value?.contains(target)) target.setAttribute('data-focus-visible', 'true')
}

function handleFocusOut(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (toolbarRef.value?.contains(target)) target.removeAttribute('data-focus-visible')
}

onMounted(() => {
  collectItems()
  observer = new MutationObserver(collectItems)
  if (toolbarRef.value) {
    observer.observe(toolbarRef.value, { childList: true, subtree: true })
    toolbarRef.value.addEventListener('focus', handleFocusIn, true)
    toolbarRef.value.addEventListener('blur', handleFocusOut, true)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  toolbarRef.value?.removeEventListener('focus', handleFocusIn, true)
  toolbarRef.value?.removeEventListener('blur', handleFocusOut, true)
})

// фокус на выбранном стрелками элементе
import { watch } from 'vue'
watch(selectedIndex, (index) => {
  const item = focusableItems.value[index]
  if (item) item.focus()
})
</script>
