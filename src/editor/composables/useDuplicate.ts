import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { CopyIcon } from '../icons'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export const DUPLICATE_SHORTCUT_KEY = 'mod+d'

function canDuplicateNode(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  try {
    const { selection } = editor.state
    if (selection instanceof NodeSelection) return !!selection.node
    const $anchor = selection.$anchor
    for (let depth = 1; depth <= $anchor.depth; depth++) {
      const node = $anchor.node(depth)
      if (node.type.name !== 'doc' && node.type.spec.group) return true
    }
    return false
  } catch {
    return false
  }
}

export function useDuplicate(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDuplicate = computed(() => (signal.value, canDuplicateNode(editor.value)))

  const handleDuplicate = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { state } = instance
      const { selection } = state
      const chain = instance.chain().focus()
      if (selection instanceof NodeSelection) {
        chain.insertContentAt(selection.to, selection.node.toJSON()).run()
        return true
      }
      const $anchor = selection.$anchor
      for (let depth = 1; depth <= $anchor.depth; depth++) {
        const node = $anchor.node(depth)
        if (node.type.name === 'doc' || !node.type.spec.group) continue
        const start = $anchor.start(depth)
        const insertPos = Math.min(start + node.nodeSize, state.doc.content.size)
        chain.insertContentAt(insertPos, node.toJSON()).run()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return {
    canDuplicate,
    handleDuplicate,
    label: 'Duplicate node',
    shortcutKeys: DUPLICATE_SHORTCUT_KEY,
    Icon: CopyIcon,
  }
}
