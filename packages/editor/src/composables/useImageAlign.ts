import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export type ImageAlign = 'left' | 'center' | 'right'

const labelsByAlign: Record<ImageAlign, string> = {
  left: 'Image align left',
  center: 'Image align center',
  right: 'Image align right',
}
const shortcutKeysByAlign: Record<ImageAlign, string> = {
  left: 'alt+shift+l',
  center: 'alt+shift+e',
  right: 'alt+shift+r',
}

const diagnostics = createDevelopmentDiagnostics('useImageAlign')

export function useImageAlign(options: {
  editor: ComputedRef<Editor | null>
  align: ComputedRef<ImageAlign>
  extensionName: ComputedRef<string>
  attributeName: ComputedRef<string>
  hideWhenUnavailable: ComputedRef<boolean>
}) {
  const { editor, align, extensionName, attributeName, hideWhenUnavailable } = options
  const signal = useEditorSelectionSignal(editor)
  const canAlign = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance &&
      instance.isEditable &&
      isExtensionAvailable(instance, [extensionName.value]) &&
      instance.can().updateAttributes(extensionName.value, { [attributeName.value]: align.value })
    )
  })
  const isActive = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance &&
      instance.isEditable &&
      isExtensionAvailable(instance, [extensionName.value]) &&
      (instance.getAttributes(extensionName.value)[attributeName.value] || 'left') === align.value
    )
  })
  const isVisible = computed(() => {
    void signal.value
    return !!editor.value?.isEditable && (!hideWhenUnavailable.value || canAlign.value)
  })

  const execute = (): boolean => {
    const instance = editor.value
    if (!instance || !canAlign.value) {
      diagnostics.debug('command rejected', { align: align.value })
      return false
    }
    try {
      const selection = instance.state.selection
      const nodePosition = selection instanceof NodeSelection ? selection.from : undefined
      diagnostics.debug('command attempted', { align: align.value })
      const executed = instance
        .chain()
        .focus()
        .updateAttributes(extensionName.value, { [attributeName.value]: align.value })
        .run()
      if (executed && nodePosition !== undefined) instance.commands.setNodeSelection(nodePosition)
      diagnostics.debug('command completed', { align: align.value, executed })
      return executed
    } catch {
      diagnostics.debug('command failed', {
        align: align.value,
        failureCategory: 'unexpected-editor-command-error',
      })
      return false
    }
  }

  return {
    canAlign,
    isActive,
    isVisible,
    execute,
    label: computed(() => labelsByAlign[align.value]),
    shortcutKeys: computed(() => shortcutKeysByAlign[align.value]),
  }
}
