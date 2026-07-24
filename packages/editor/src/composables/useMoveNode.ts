/**
 * Перемещение текущего блока вверх/вниз.
 */
import { createLogger } from '@i-prikot/editor-schema'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { TextSelection } from '@tiptap/pm/state'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { getAnchorNodeAndPos } from './useNodeActions'
import { AlignBottomIcon, AlignTopIcon } from '../icons'

export type MoveDirection = 'up' | 'down'

const logger = createLogger('useMoveNode')

export const MOVE_NODE_SHORTCUT_KEYS: Record<MoveDirection, string> = {
  up: 'mod+shift+ArrowUp',
  down: 'mod+shift+ArrowDown',
}

export function canMoveNode(editor: Editor | null, direction: MoveDirection): boolean {
  if (!editor || !editor.isEditable) return false
  const anchor = getAnchorNodeAndPos(editor)
  if (!anchor) return false
  try {
    const $pos = editor.state.doc.resolve(anchor.pos)
    const parent = $pos.parent
    const index = $pos.index()
    return direction === 'up' ? index > 0 : index < parent.childCount - 1
  } catch {
    return false
  }
}

function moveNode(editor: Editor | null, direction: MoveDirection): boolean {
  if (!editor || !editor.isEditable) return false
  const anchor = getAnchorNodeAndPos(editor)
  if (!anchor) return false
  try {
    const { pos, node } = anchor
    const tr = editor.state.tr
    const $pos = tr.doc.resolve(pos)
    const parent = $pos.parent
    const index = $pos.index()
    if (index < 0 || index >= parent.childCount) return false
    if (direction === 'up' && index > 0) {
      const prevSize = parent.child(index - 1).nodeSize
      const copy = node.type.create(node.attrs, node.content, node.marks)
      tr.deleteRange(pos, pos + node.nodeSize)
      const target = pos - prevSize
      tr.insert(target, copy)
      tr.setSelection(TextSelection.near(tr.doc.resolve(target)))
    } else if (direction === 'down' && index < parent.childCount - 1) {
      const nextSize = parent.child(index + 1).nodeSize
      const copy = node.type.create(node.attrs, node.content, node.marks)
      tr.deleteRange(pos, pos + node.nodeSize)
      const target = pos + nextSize
      tr.insert(target, copy)
      tr.setSelection(TextSelection.near(tr.doc.resolve(target)))
    } else {
      return false
    }
    editor.view.dispatch(tr)
    return true
  } catch (error) {
    logger.error('Error moving node:', error)
    return false
  }
}

export function useMoveNode(
  editor: ComputedRef<Editor | null>,
  direction: MoveDirection,
  hideWhenUnavailable = false,
  onMoved?: (direction: MoveDirection) => void,
) {
  const signal = useEditorSelectionSignal(editor)

  const canMove = computed(() => (signal.value, canMoveNode(editor.value, direction)))
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    if (!hideWhenUnavailable) return true
    if (!instance.isEditable) return false
    return !!getAnchorNodeAndPos(instance) && canMoveNode(instance, direction)
  })

  const handleMoveNode = (): boolean => {
    if (!canMove.value) return false
    const moved = moveNode(editor.value, direction)
    if (moved) onMoved?.(direction)
    return moved
  }

  return {
    isVisible,
    canMoveNode: canMove,
    handleMoveNode,
    label: direction === 'up' ? 'Move Up' : 'Move Down',
    shortcutKeys: MOVE_NODE_SHORTCUT_KEYS[direction],
    Icon: direction === 'up' ? AlignTopIcon : AlignBottomIcon,
  }
}
