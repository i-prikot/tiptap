/**
 * Клавиатурная навигация по пунктам меню (стрелки/Tab/Home/End/Enter/Escape).
 * Порт useMenuNavigation из чанка 3q2p49kc-ifgd (модуль 124248).
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export interface UseMenuNavigationOptions<Item> {
  editor: ComputedRef<Editor | null> | Ref<Editor | null>
  containerRef?: Ref<HTMLElement | null>
  query: Ref<string>
  items: Ref<Item[]> | ComputedRef<Item[]>
  onSelect?: (item: Item) => void
  onClose?: () => void
  orientation?: 'vertical' | 'horizontal' | 'both'
  autoSelectFirstItem?: boolean
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
  } = options

  const selectedIndex = ref(autoSelectFirstItem ? 0 : -1)

  const handleKeydown = (event: KeyboardEvent): boolean => {
    const list = items.value
    if (!list.length) return false

    const moveNext = () => {
      selectedIndex.value = selectedIndex.value === -1 ? 0 : (selectedIndex.value + 1) % list.length
    }
    const movePrev = () => {
      selectedIndex.value =
        selectedIndex.value === -1
          ? list.length - 1
          : (selectedIndex.value - 1 + list.length) % list.length
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
        event.preventDefault()
        if (event.shiftKey) movePrev()
        else moveNext()
        return true
      case 'Home':
        event.preventDefault()
        selectedIndex.value = 0
        return true
      case 'End':
        event.preventDefault()
        selectedIndex.value = list.length - 1
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
