import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { AllSelection, NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import type { NodeWithPos } from './tiptap-utils.js'

/** Выделяет содержимое текущего непустого блока вокруг курсора. */
export function selectCurrentBlockContent(editor: Editor) {
  const { selection, doc } = editor.state
  if (!selection.empty) return

  const $from = selection.$from
  let blockNode: ProseMirrorNode | null = null
  let blockStart = -1
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (node.isBlock && node.textContent.trim()) {
      blockNode = node
      blockStart = $from.start(depth)
      break
    }
  }

  if (blockNode && blockStart >= 0) {
    const from = blockStart
    const to = blockStart + blockNode.nodeSize - 2
    if (from < to) {
      const $start = doc.resolve(from)
      const $end = doc.resolve(to)
      const blockSelection = TextSelection.between($start, $end, 1)
      if (blockSelection && !selection.eq(blockSelection)) {
        editor.view.dispatch(editor.state.tr.setSelection(blockSelection))
      }
    }
  }
}

/** Все текстовые блоки выделения принадлежат перечисленным типам. */
export function selectionWithinConvertibleTypes(
  editor: Editor | null,
  types: string[] = [],
): boolean {
  if (!editor || types.length === 0) return false
  const { state } = editor
  const { selection } = state
  const allowed = new Set(types)

  if (selection instanceof NodeSelection) {
    const name = selection.node?.type?.name
    return !!name && allowed.has(name)
  }

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    let valid = true
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.isTextblock && !allowed.has(node.type.name)) {
        valid = false
        return false
      }
      return valid
    })
    return valid
  }

  return false
}

/**
 * Обновляет атрибут набора узлов; `value` может быть функцией от текущего
 * значения. Возвращает true, если транзакция что-то изменила.
 */
export function updateNodesAttr(
  tr: Transaction,
  nodes: NodeWithPos[],
  attrName: string,
  value: unknown | ((current: unknown) => unknown),
): boolean {
  if (!nodes.length) return false
  let changed = false
  for (const { pos } of nodes) {
    const node = tr.doc.nodeAt(pos)
    if (!node) continue
    const current = node.attrs[attrName]
    const next =
      typeof value === 'function' ? (value as (current: unknown) => unknown)(current) : value
    if (current === next) continue
    const attrs: Record<string, unknown> = { ...node.attrs }
    if (next === undefined) delete attrs[attrName]
    else attrs[attrName] = next
    tr.setNodeMarkup(pos, undefined, attrs)
    changed = true
  }
  return changed
}

/** Разбивает массив на подмассивы длиной size. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )
}

/** Атрибуты активной марки в выделении. */
export function getActiveMarkAttrs(
  editor: Editor | null,
  markName: string,
): Record<string, any> | null {
  if (!editor) return null
  const { state } = editor
  const { from, to, empty, $from } = state.selection
  if (empty) {
    const mark = $from.marks().find((m) => m.type.name === markName)
    return mark?.attrs ?? null
  }
  const seen = new Set<string>()
  let attrs: Record<string, any> | null = null
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) {
      for (const mark of node.marks) {
        if (mark.type.name === markName && !seen.has(mark.type.name)) {
          seen.add(mark.type.name)
          attrs = mark.attrs
        }
      }
    }
  })
  return attrs
}
