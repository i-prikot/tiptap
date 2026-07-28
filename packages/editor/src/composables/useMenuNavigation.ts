/**
 * Клавиатурная навигация по пунктам меню (стрелки/Tab/Home/End/Enter/Escape).
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { getNextRovingIndex } from './useOverlayAccessibility'

export interface UseMenuNavigationOptions<Item> {
  editor: ComputedRef<Editor | null> | Ref<Editor | null>
  containerRef?: Ref<HTMLElement | null>
  query: Ref<string>
  items: Ref<Item[]> | ComputedRef<Item[]>
  onSelect?: (item: Item) => void
  onClose?: () => void
  orientation?: 'vertical' | 'horizontal' | 'both'
  autoSelectFirstItem?: boolean
  handleTab?: boolean
  shouldHandleEvent?: (event: KeyboardEvent) => boolean
}

export function useMenuNavigation<Item>(options: UseMenuNavigationOptions<Item>) {
  const {
    editor,
    containerRef,
    query,
    items,
    onSelect,
    onClose,
    orientation = 'vertical',
    autoSelectFirstItem = true,
    handleTab = true,
    shouldHandleEvent,
  } = options

  const selectedIndex = ref(autoSelectFirstItem ? 0 : -1)

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (shouldHandleEvent && !shouldHandleEvent(event)) return false

    const list = items.value
    if (!list.length) return false

    const moveNext = () => {
      selectedIndex.value = getNextRovingIndex(selectedIndex.value, list.length, 'next')
    }
    const movePrev = () => {
      selectedIndex.value = getNextRovingIndex(selectedIndex.value, list.length, 'previous')
    }

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'horizontal') return false
        event.preventDefault()
        movePrev()
        return true
      case 'ArrowDown':
        if (orientation === 'horizontal') return false
        event.preventDefault()
        moveNext()
        return true
      case 'ArrowLeft':
        if (orientation === 'vertical') return false
        event.preventDefault()
        movePrev()
        return true
      case 'ArrowRight':
        if (orientation === 'vertical') return false
        event.preventDefault()
        moveNext()
        return true
      case 'Tab':
        if (!handleTab) return false
        event.preventDefault()
        if (event.shiftKey) movePrev()
        else moveNext()
        return true
      case 'Home':
        event.preventDefault()
        selectedIndex.value = getNextRovingIndex(selectedIndex.value, list.length, 'first')
        return true
      case 'End':
        event.preventDefault()
        selectedIndex.value = getNextRovingIndex(selectedIndex.value, list.length, 'last')
        return true
      case 'Enter': {
        if (event.isComposing) return false
        event.preventDefault()
        const item = selectedIndex.value !== -1 ? list[selectedIndex.value] : undefined
        if (item) onSelect?.(item)
        return true
      }
      case 'Escape':
        event.preventDefault()
        onClose?.()
        return true
      default:
        return false
    }
  }

  let target: HTMLElement | null = null
  const listener = (event: KeyboardEvent) => handleKeydown(event)

  watch(
    [() => editor.value, () => containerRef?.value],
    () => {
      target?.removeEventListener('keydown', listener, true)
      target = editor.value ? (editor.value.view.dom as HTMLElement) : (containerRef?.value ?? null)
      target?.addEventListener('keydown', listener, true)
    },
    { immediate: true },
  )

  watch(query, (value) => {
    if (value !== undefined) selectedIndex.value = autoSelectFirstItem ? 0 : -1
  })

  onBeforeUnmount(() => {
    target?.removeEventListener('keydown', listener, true)
  })

  return { selectedIndex, setSelectedIndex: (index: number) => (selectedIndex.value = index) }
}
