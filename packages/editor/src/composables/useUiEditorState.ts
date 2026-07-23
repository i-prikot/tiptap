/**
 * Реактивный срез uiState-storage редактора: обновляется только по
 * целевому событию uiStateUpdate и только для запрошенных ключей.
 */
import { onBeforeUnmount, reactive, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { UiStateUpdate } from '@i-prikot/editor-schema'
import { defaultUiState } from '../extensions/ui-state'
import type { UiEditorState } from '../extensions/ui-state'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

const diagnostics = createDevelopmentDiagnostics('useUiEditorState')

export function useUiEditorState<Key extends keyof UiEditorState>(
  editor: ComputedRef<Editor | null>,
  keys: readonly Key[],
): Pick<UiEditorState, Key> {
  const selectedKeys = [...new Set(keys)] as Key[]
  const state = reactive({}) as Record<Key, boolean>

  const updateSelectedState = (nextState: Partial<UiEditorState>) => {
    for (const key of selectedKeys) {
      if (!(key in nextState)) continue
      const value = nextState[key]
      if (value !== undefined && state[key] !== value) state[key] = value
    }
  }

  const resetSelectedState = () => updateSelectedState(defaultUiState)
  resetSelectedState()

  const readStorage = (instance: Editor) => {
    const storage = instance.storage.uiState as UiEditorState | undefined
    if (!storage) {
      diagnostics.debug('uiState storage unavailable', { selectedKeys })
      resetSelectedState()
      return
    }
    updateSelectedState(storage)
  }

  let unsubscribe: (() => void) | null = null

  watch(
    editor,
    (instance) => {
      unsubscribe?.()
      unsubscribe = null
      if (!instance) {
        resetSelectedState()
        return
      }

      const handler = ({ changed }: UiStateUpdate) => updateSelectedState(changed)
      readStorage(instance)
      instance.on('uiStateUpdate', handler)
      unsubscribe = () => {
        instance.off('uiStateUpdate', handler)
        diagnostics.debug('subscription removed', { selectedKeys })
      }
      diagnostics.debug('subscription added', { selectedKeys })
    },
    { immediate: true },
  )

  onBeforeUnmount(() => unsubscribe?.())

  return state as Pick<UiEditorState, Key>
}
