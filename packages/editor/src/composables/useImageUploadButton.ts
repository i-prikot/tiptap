import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

const diagnostics = createDevelopmentDiagnostics('useImageUploadButton')

export function useImageUploadButton(
  editor: ComputedRef<Editor | null>,
  hideWhenUnavailable: ComputedRef<boolean>,
) {
  const signal = useEditorSelectionSignal(editor)
  const canInsert = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance &&
      instance.isEditable &&
      isExtensionAvailable(instance, 'imageUpload') &&
      instance.can().insertContent({ type: 'imageUpload' })
    )
  })
  const isActive = computed(
    () => (signal.value, !!editor.value?.isEditable && editor.value.isActive('imageUpload')),
  )
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance?.isEditable &&
      (!hideWhenUnavailable.value ||
        (isExtensionAvailable(instance, 'imageUpload') &&
          (instance.isActive('code') || canInsert.value)))
    )
  })

  const execute = (): boolean => {
    const instance = editor.value
    if (!instance || !canInsert.value) {
      diagnostics.debug('command rejected')
      return false
    }
    try {
      diagnostics.debug('command attempted')
      const executed = instance.chain().focus().insertContent({ type: 'imageUpload' }).run()
      diagnostics.debug('command completed', { executed })
      return executed
    } catch {
      diagnostics.debug('command failed', { failureCategory: 'unexpected-editor-command-error' })
      return false
    }
  }

  return { canInsert, isActive, isVisible, execute }
}
