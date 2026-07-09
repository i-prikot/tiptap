/**
 * Реактивный «сигнал» изменения выделения: счётчик, увеличивающийся на
 * каждый selectionUpdate. computed, читающие сигнал, пересчитываются
 * при каждом изменении выделения — эквивалент React-паттерна
 * useState + editor.on('selectionUpdate') из tiptap-ui хуков.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export function useEditorSelectionSignal(editor: ComputedRef<Editor | null>): Ref<number> {
  const signal = ref(0)
  let unsubscribe: (() => void) | null = null

  watch(
    editor,
    (instance) => {
      unsubscribe?.()
      unsubscribe = null
      if (!instance) return
      const bump = () => {
        signal.value++
      }
      instance.on('selectionUpdate', bump)
      unsubscribe = () => instance.off('selectionUpdate', bump)
      bump()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => unsubscribe?.())
  return signal
}
