import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { ListIndentedIcon } from '../icons'
import { isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

function canToggleTocTitle(editor: Editor | null): boolean {
  return !!editor && !!editor.isEditable && isNodeTypeSelected(editor, ['tocNode'])
}

export function useTocShowTitle(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleTocTitle(editor.value)))
  const isActive = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    try {
      const { selection } = instance.state
      return (
        selection instanceof NodeSelection &&
        selection.node.type.name === 'tocNode' &&
        selection.node.attrs.showTitle === true
      )
    } catch {
      return false
    }
  })

  const handleToggle = (): boolean => {
    const instance = editor.value
    if (!instance?.isEditable || !canToggleTocTitle(instance)) return false
    try {
      const { selection } = instance.state
      if (!(selection instanceof NodeSelection && selection.node.type.name === 'tocNode'))
        return false
      const showTitle = selection.node.attrs.showTitle === true
      return instance.chain().focus().updateAttributes('tocNode', { showTitle: !showTitle }).run()
    } catch {
      return false
    }
  }

  return { canToggle, isActive, handleToggle, label: 'Show title', Icon: ListIndentedIcon }
}
