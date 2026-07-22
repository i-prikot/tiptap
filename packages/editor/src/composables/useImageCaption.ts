import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable, isNodeTypeSelected } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

const diagnostics = createDevelopmentDiagnostics('useImageCaption')

export function useImageCaption(
  editor: ComputedRef<Editor | null>,
  hideWhenUnavailable: ComputedRef<boolean>,
) {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance &&
      instance.isEditable &&
      isExtensionAvailable(instance, ['image']) &&
      isNodeTypeSelected(instance, ['image'])
    )
  })
  const isActive = computed(() => {
    void signal.value
    const selection = editor.value?.state.selection
    return (
      selection instanceof NodeSelection &&
      selection.node.type.name === 'image' &&
      (selection.node.attrs.showCaption === true || selection.node.content.size > 0)
    )
  })
  const isVisible = computed(() => {
    void signal.value
    return !!editor.value && (!hideWhenUnavailable.value || canToggle.value)
  })

  const execute = (): boolean => {
    const instance = editor.value
    if (!instance || !canToggle.value) {
      diagnostics.debug('command rejected')
      return false
    }
    try {
      const selection = instance.state.selection
      if (!(selection instanceof NodeSelection && selection.node.type.name === 'image'))
        return false
      diagnostics.debug('command attempted')
      const executed = instance
        .chain()
        .focus()
        .updateAttributes('image', { showCaption: true })
        .run()
      if (executed)
        instance
          .chain()
          .focus(selection.from + 1)
          .selectTextblockEnd()
          .run()
      diagnostics.debug('command completed', { executed })
      return executed
    } catch {
      diagnostics.debug('command failed', { failureCategory: 'unexpected-editor-command-error' })
      return false
    }
  }

  return { canToggle, isActive, isVisible, execute }
}
