/**
 * Реактивный снимок uiState-storage редактора: обновляется на каждой
 * транзакции. Эквивалент useUiEditorState из чанка 35aonnuqri98j
 * (React useEditorState → Vue reactive + подписка на transaction).
 */
import { onBeforeUnmount, reactive, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { defaultUiState } from '../extensions/ui-state'
import type { UiEditorState } from '../extensions/ui-state'

export function useUiEditorState(editor: ComputedRef<Editor | null>): UiEditorState {
  const state = reactive<UiEditorState>({ ...defaultUiState })

  const readStorage = (instance: Editor) => {
    const storage = instance.storage.uiState as UiEditorState | undefined
    if (!storage) {
      console.warn(
        'Editor storage uiState is not initialized. Ensure you have the uiState extension added to your editor.',
      )
      Object.assign(state, defaultUiState)
      return
    }
    Object.assign(state, defaultUiState, storage)
  }

  let unsubscribe: (() => void) | null = null

  watch(
    editor,
    instance => {
      unsubscribe?.()
      unsubscribe = null
      if (!instance) {
        Object.assign(state, defaultUiState)
        return
      }
      const handler = () => readStorage(instance)
      handler()
      instance.on('transaction', handler)
      unsubscribe = () => instance.off('transaction', handler)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unsubscribe?.()
  })

  return state
}
