import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { isValidPosition } from '../utils/tiptap-utils'

/** Узел уровня блока вокруг якоря выделения (или сам NodeSelection). */
export function getAnchorNodeAndPos(
  editor: Editor | null,
  allowEmptySelection = true,
): { node: ProseMirrorNode; pos: number } | null {
  if (!editor) return null
  const { selection } = editor.state
  if (selection instanceof NodeSelection) {
    const node = selection.node
    const pos = selection.from
    if (node && isValidPosition(pos)) return { node, pos }
  }
  if (selection.empty && !allowEmptySelection) return null
  const $anchor = selection.$anchor
  return { node: $anchor.node(1), pos: $anchor.before(1) }
}
