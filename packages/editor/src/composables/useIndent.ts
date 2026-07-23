import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { IndentDecreaseIcon, IndentIncreaseIcon } from '../icons'
import { isExtensionAvailable } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { useEditorI18n } from './useEditorI18n'

export type IndentAction = 'indent' | 'outdent'

const shortcutKeysByAction: Record<IndentAction, string> = { indent: 'Tab', outdent: 'Shift-Tab' }
const iconsByAction = { indent: IndentIncreaseIcon, outdent: IndentDecreaseIcon }

const diagnostics = createDevelopmentDiagnostics('useIndent')

function canExecuteAction(editor: Editor | null, action: IndentAction): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, 'indent')) return false
  return action === 'indent' ? editor.can().indent() : editor.can().outdent()
}

export function useIndent(
  editor: ComputedRef<Editor | null>,
  action: ComputedRef<IndentAction>,
  hideWhenUnavailable: ComputedRef<boolean>,
) {
  const signal = useEditorSelectionSignal(editor)
  const { t } = useEditorI18n()
  const canIndent = computed(() => (signal.value, canExecuteAction(editor.value, action.value)))
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    return !!instance && (!hideWhenUnavailable.value || canExecuteAction(instance, action.value))
  })

  const execute = (): boolean => {
    const instance = editor.value
    const currentAction = action.value
    if (!instance || !canExecuteAction(instance, currentAction)) {
      diagnostics.debug('command rejected', { action: currentAction })
      return false
    }

    diagnostics.debug('command attempted', { action: currentAction })
    const executed =
      currentAction === 'indent'
        ? instance.chain().focus().indent().run()
        : instance.chain().focus().outdent().run()
    diagnostics.debug('command completed', { action: currentAction, executed })
    return executed
  }

  return {
    canIndent,
    isVisible,
    execute,
    label: computed(() =>
      t(action.value === 'indent' ? 'toolbar.increaseIndent' : 'toolbar.decreaseIndent'),
    ),
    shortcutKeys: computed(() => shortcutKeysByAction[action.value]),
    icon: computed(() => iconsByAction[action.value]),
  }
}
