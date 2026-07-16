import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { TrashIcon } from '../icons'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export const DELETE_NODE_SHORTCUT_KEY = 'backspace'

function canDeleteCurrentNode(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  const { state } = editor
  const { selection } = state
  if (selection instanceof NodeSelection) return true
  const $anchor = selection.$anchor
  for (let depth = $anchor.depth; depth > 0; depth--) {
    const node = $anchor.node(depth)
    const before = $anchor.before(depth)
    if (state.tr.delete(before, before + node.nodeSize).doc !== state.doc) return true
  }
  return false
}

function deleteNodeRange(editor: Editor, from: number, size: number): boolean {
  const chain = editor.chain().focus()
  return (
    !!chain.deleteRange({ from, to: from + size }).run() ||
    chain.setNodeSelection(from).deleteSelection().run()
  )
}

export function useDeleteNode(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDeleteNode = computed(() => (signal.value, canDeleteCurrentNode(editor.value)))

  const handleDeleteNode = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { selection } = instance.state
      if (selection instanceof NodeSelection) {
        const node = selection.node
        if (!node) return false
        return deleteNodeRange(instance, selection.from, node.nodeSize)
      }
      const $from = selection.$from
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth)
        const before = $from.before(depth)
        if (
          node &&
          node.isBlock &&
          node.type.name !== 'tableRow' &&
          node.type.name !== 'tableHeader' &&
          node.type.name !== 'tableCell'
        ) {
          return deleteNodeRange(instance, before, node.nodeSize)
        }
      }
      return false
    } catch {
      return false
    }
  }

  return {
    canDeleteNode,
    handleDeleteNode,
    label: 'Delete',
    shortcutKeys: DELETE_NODE_SHORTCUT_KEY,
    Icon: TrashIcon,
  }
}
