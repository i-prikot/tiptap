/**
 * Хелперы выделения/позиционирования из чанков 3qxxh2m8wjeqx и 2mux2p9tadf0h.
 */
import type { Editor } from '@tiptap/core'
import { isNodeSelection, isTextSelection, posToDOMRect } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Selection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { NodeSelection } from '@tiptap/pm/state'
import { findNodePosition, isValidPosition } from './tiptap-utils'

/** DOMRect текущего выделения (для NodeSelection — rect DOM-узла). */
export function getSelectionBoundingRect(editor: Editor): DOMRect | null {
  const { state } = editor.view
  const { selection } = state
  const { ranges } = selection
  const from = Math.min(...ranges.map(range => range.$from.pos))
  const to = Math.max(...ranges.map(range => range.$to.pos))

  if (isNodeSelection(selection)) {
    const node = editor.view.nodeDOM(from) as HTMLElement | null
    if (node) return node.getBoundingClientRect()
  }
  return posToDOMRect(editor.view, from, to)
}

/** Пригодно ли выделение для floating toolbar. */
export function isSelectionValid(
  editor: Editor | null,
  selection?: Selection,
  excludedNodeTypes: string[] = ['imageUpload', 'horizontalRule'],
): boolean {
  if (!editor) return false
  if (!selection) selection = editor.state.selection
  const { state } = editor
  const { doc } = state
  const { empty, from, to } = selection

  const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(selection)
  const isCodeBlock =
    selection.$from.parent.type.spec.code || (isNodeSelection(selection) && selection.node.type.spec.code)
  const isExcludedNode = isNodeSelection(selection) && excludedNodeTypes.includes(selection.node.type.name)
  const isCellSelection = selection instanceof CellSelection

  return !empty && !isEmptyTextBlock && !isCodeBlock && !isExcludedNode && !isCellSelection
}

export function isTextSelectionValid(editor: Editor | null): boolean {
  if (!editor) return false
  const { selection } = editor.state
  return (
    isTextSelection(selection) && !selection.empty && !selection.$from.parent.type.spec.code && !isNodeSelection(selection)
  )
}

/** Убирает пустые параграфы из JSON-контента. */
export function removeEmptyParagraphs<T extends { content?: Array<Record<string, any>> }>(doc: T): T {
  return {
    ...doc,
    content: doc.content?.filter(
      node =>
        node.type !== 'paragraph' ||
        node.content?.some((child: Record<string, any>) => child.text?.trim() || child.type !== 'text'),
    ),
  }
}

/** Положение элемента относительно контейнера: top/bottom/both/none. */
export function getElementOverflowPosition(element: Element, container: Element): 'top' | 'bottom' | 'both' | 'none' {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const overflowsTop = elementRect.top < containerRect.top
  const overflowsBottom = elementRect.bottom > containerRect.bottom
  if (overflowsTop && overflowsBottom) return 'both'
  if (overflowsTop) return 'top'
  if (overflowsBottom) return 'bottom'
  return 'none'
}

const NODE_DISPLAY_NAMES: Record<string, string> = {
  paragraph: 'Text',
  heading: 'Heading',
  blockquote: 'Blockquote',
  listItem: 'List Item',
  codeBlock: 'Code Block',
  table: 'Table',
  tocNode: 'Table of contents',
}

/** Отображаемое имя выделенного узла (для заголовка контекстного меню). */
export function getNodeDisplayName(editor: Editor | null): string {
  if (!editor) return 'Node'
  const { selection } = editor.state
  if (selection instanceof NodeSelection) {
    const name = selection.node.type.name
    return NODE_DISPLAY_NAMES[name] || name.toLowerCase()
  }
  if (selection instanceof CellSelection) return 'Table'
  const parentName = selection.$from.parent.type.name
  return NODE_DISPLAY_NAMES[parentName] || parentName.toLowerCase() || 'Node'
}

/** Есть ли непустой контент выше курсора; возвращает ближайший текст. */
export function hasContentAbove(editor: Editor | null): { hasContent: boolean; content: string } {
  if (!editor) return { hasContent: false, content: '' }
  const { state } = editor
  const { $from } = state.selection
  for (let index = $from.index(0) - 1; index >= 0; index--) {
    const content = state.doc.child(index).textContent.trim()
    if (content) return { hasContent: true, content }
  }
  return { hasContent: false, content: '' }
}

export function selectionHasText(editor: Editor | null): boolean {
  if (!editor) return false
  const { selection, doc } = editor.state
  return !selection.empty && doc.textBetween(selection.from, selection.to, '\n', '\0').trim().length > 0
}

/** Позиция для NodeSelection: явная, по узлу, либо блок вокруг пустого курсора. */
export function findSelectionPosition(args: {
  editor: Editor
  node?: ProseMirrorNode | null
  nodePos?: number | null
}): number | null {
  const { editor, node, nodePos } = args
  if (isValidPosition(nodePos)) return nodePos
  if (node) {
    const found = findNodePosition({ editor, node })
    if (found) return found.pos
  }
  const { selection } = editor.state
  if (!selection.empty) return null
  const $anchor = selection.$anchor
  return $anchor.node(1) ? $anchor.before(1) : null
}
