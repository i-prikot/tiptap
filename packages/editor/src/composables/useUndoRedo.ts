import { computed, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Redo2Icon, Undo2Icon } from '../icons'
import { isNodeTypeSelected } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

export type UndoRedoAction = 'undo' | 'redo'

const shortcutKeysByAction: Record<UndoRedoAction, string> = { undo: 'mod+z', redo: 'mod+shift+z' }
const labelsByAction: Record<UndoRedoAction, string> = { undo: 'Undo', redo: 'Redo' }
const iconsByAction = { undo: Undo2Icon, redo: Redo2Icon }

const diagnostics = createDevelopmentDiagnostics('useUndoRedo')

function canExecuteAction(editor: Editor | null, action: UndoRedoAction): boolean {
  if (!editor || !editor.isEditable || isNodeTypeSelected(editor, ['image'])) return false
  return action === 'undo' ? editor.can().undo() : editor.can().redo()
}

export function useUndoRedo(
  editor: ComputedRef<Editor | null>,
  action: ComputedRef<UndoRedoAction>,
  hideWhenUnavailable: ComputedRef<boolean>,
) {
  const canExecute = ref(false)
  const isVisible = ref(true)
  let unsubscribe: (() => void) | undefined

  watch(
    [editor, action, hideWhenUnavailable],
    ([instance, currentAction, shouldHide]) => {
      unsubscribe?.()
      unsubscribe = undefined
      if (!instance) {
        if (canExecute.value) canExecute.value = false
        const nextVisibility = !shouldHide
        if (isVisible.value !== nextVisibility) isVisible.value = nextVisibility
        diagnostics.debug('editor unavailable', {
          action: currentAction,
          isVisible: isVisible.value,
        })
        return
      }

      const update = () => {
        const available = canExecuteAction(instance, currentAction)
        if (canExecute.value !== available) canExecute.value = available
        const nextVisibility =
          !shouldHide || (instance.isEditable && (instance.isActive('code') || available))
        if (isVisible.value !== nextVisibility) isVisible.value = nextVisibility
      }

      update()
      instance.on('transaction', update)
      unsubscribe = () => {
        instance.off('transaction', update)
        diagnostics.debug('transaction subscription removed', { action: currentAction })
      }
      diagnostics.debug('transaction subscription added', { action: currentAction })
    },
    { immediate: true },
  )

  onScopeDispose(() => unsubscribe?.())

  const execute = (): boolean => {
    const instance = editor.value
    const currentAction = action.value
    if (!instance || !canExecuteAction(instance, currentAction)) {
      diagnostics.debug('command rejected', { action: currentAction })
      return false
    }

    diagnostics.debug('command attempted', { action: currentAction })
    const chain = instance.chain().focus()
    const executed = currentAction === 'undo' ? chain.undo().run() : chain.redo().run()
    diagnostics.debug('command completed', { action: currentAction, executed })
    return executed
  }

  return {
    canExecute,
    isVisible,
    execute,
    label: computed(() => labelsByAction[action.value]),
    shortcutKeys: computed(() => shortcutKeysByAction[action.value]),
    icon: computed(() => iconsByAction[action.value]),
  }
}
