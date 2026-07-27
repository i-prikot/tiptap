/**
 * Общие утилиты редактора.
 */
import { createLogger } from './logger.js'
import { findParentNodeClosestToPos } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, Selection as PMSelection, TextSelection } from '@tiptap/pm/state'
import type { Selection } from '@tiptap/pm/state'
import { CellSelection, cellAround } from '@tiptap/pm/tables'
export {
  chunkArray,
  getActiveMarkAttrs,
  selectCurrentBlockContent,
  selectionWithinConvertibleTypes,
  updateNodesAttr,
} from './tiptap-selection-utils.js'
export { parseShortcutKeys } from './tiptap-shortcut-utils.js'

const logger = createLogger('tiptap-utils')

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/** Инлайновые стили визуально скрытого элемента (screen-reader only). */
export const SR_ONLY: Record<string, string | number> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
}
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === 'number' && pos >= 0
}

export interface NodeWithPos {
  node: ProseMirrorNode
  pos: number
}

/**
 * Находит позицию узла в документе: либо по ссылке на сам узел,
 * либо по числовой позиции.
 */
export function findNodePosition(args: {
  editor: Editor | null
  node?: ProseMirrorNode | null
  nodePos?: number | null
}): NodeWithPos | null {
  const { editor, node, nodePos } = args
  if (!editor || !editor.state?.doc) return null

  const hasNode = node != null
  const hasPos = isValidPosition(nodePos)
  if (!hasNode && !hasPos) return null

  if (hasNode) {
    let foundPos = -1
    let foundNode: ProseMirrorNode | null = null
    editor.state.doc.descendants((child, pos) => {
      if (child === node) {
        foundPos = pos
        foundNode = child
        return false
      }
      return true
    })
    if (foundPos !== -1 && foundNode !== null) return { pos: foundPos, node: foundNode }
  }

  if (hasPos) {
    let resolved: ProseMirrorNode | null = null
    try {
      resolved = editor.state.doc.nodeAt(nodePos!)
      if (!resolved) logger.warn(`No node found at position ${nodePos}`)
    } catch (error) {
      logger.error(`Error getting node at position ${nodePos}:`, error)
    }
    if (resolved) return { pos: nodePos!, node: resolved }
  }

  return null
}

/**
 * Переводит курсор в следующий текстовый блок; если его нет —
 * добавляет пустой параграф в конец документа.
 */
export function focusNextNode(editor: Editor): boolean {
  const { state, view } = editor
  const { doc, selection } = state

  const next = PMSelection.findFrom(selection.$to, 1, true)
  if (next) {
    view.dispatch(state.tr.setSelection(next).scrollIntoView())
    return true
  }

  const paragraph = state.schema.nodes.paragraph
  if (!paragraph) {
    logger.warn('No paragraph node type found in schema.')
    return false
  }

  const end = doc.content.size
  let tr = state.tr.insert(end, paragraph.create())
  const $pos = tr.doc.resolve(end + 1)
  tr = tr.setSelection(TextSelection.near($pos)).scrollIntoView()
  view.dispatch(tr)
  return true
}

/** Все блочные узлы верхнего уровня, попадающие в выделение. */
export function getSelectedBlockNodes(editor: Editor): ProseMirrorNode[] {
  const { doc } = editor.state
  const { from, to } = editor.state.selection
  const nodes: ProseMirrorNode[] = []
  const seen = new Set<number>()
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isBlock) {
      if (!seen.has(pos)) {
        seen.add(pos)
        nodes.push(node)
      }
      return false
    }
    return undefined
  })
  return nodes
}

/**
 * Узлы заданных типов, затронутые выделением: поддерживает CellSelection,
 * NodeSelection и текстовое выделение (ячейка вокруг курсора либо ближайший
 * родитель нужного типа).
 */
export function getSelectedNodesOfType(selection: Selection, types: string[]): NodeWithPos[] {
  const result: NodeWithPos[] = []
  const wanted = new Set(types)

  if (selection instanceof CellSelection) {
    selection.forEachCell((node, pos) => {
      if (wanted.has(node.type.name)) result.push({ node, pos })
    })
    return result
  }

  if (selection instanceof NodeSelection) {
    const { node, from } = selection
    if (node && wanted.has(node.type.name)) result.push({ node, pos: from })
    return result
  }

  const { $anchor } = selection
  const cell = cellAround($anchor)
  if (cell) {
    const node = $anchor.doc.nodeAt(cell.pos)
    if (node && wanted.has(node.type.name)) {
      result.push({ node, pos: cell.pos })
      return result
    }
  }

  const parent = findParentNodeClosestToPos($anchor, (node) => wanted.has(node.type.name))
  if (parent) result.push({ node: parent.node, pos: parent.pos })
  return result
}

/** Проверяет, что хотя бы одно из расширений зарегистрировано в редакторе. */
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[],
): boolean {
  if (!editor) return false
  const names = Array.isArray(extensionNames) ? extensionNames : [extensionNames]
  const available = names.some((name) =>
    editor.extensionManager.extensions.some((extension) => extension.name === name),
  )
  if (!available) {
    logger.warn(
      `None of the extensions [${names.join(', ')}] were found in the editor schema. Ensure they are included in the editor configuration.`,
    )
  }
  return available
}

export function isMarkInSchema(markName: string, editor: Editor | null): boolean {
  if (!editor?.schema) return false
  return editor.schema.spec.marks.get(markName) !== undefined
}

export function isNodeInSchema(nodeName: string, editor: Editor | null): boolean {
  if (!editor?.schema) return false
  return editor.schema.spec.nodes.get(nodeName) !== undefined
}

/**
 * Выделен ли сейчас узел одного из указанных типов
 * (NodeSelection или, опционально, предок текстового выделения).
 */
export function isNodeTypeSelected(
  editor: Editor | null,
  types: string[] = [],
  checkAncestors = false,
): boolean {
  if (!editor || !editor.state.selection) return false
  const { selection } = editor.state
  if (selection.empty) return false

  if (selection instanceof NodeSelection) {
    const node = selection.node
    return !!node && types.includes(node.type.name)
  }

  if (checkAncestors) {
    const { $from } = selection
    for (let depth = $from.depth; depth > 0; depth--) {
      if (types.includes($from.node(depth).type.name)) return true
    }
  }

  return false
}

const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

/** Возвращает безопасный URL либо `#`, отбрасывая опасные схемы. */
export function sanitizeUrl(
  inputUrl: string,
  baseUrl?: string,
  protocols?: Array<string | { scheme: string }>,
): string {
  try {
    const url = new URL(inputUrl, baseUrl)
    const href = url.href
    const allowed = [
      'http',
      'https',
      'ftp',
      'ftps',
      'mailto',
      'tel',
      'callto',
      'sms',
      'cid',
      'xmpp',
    ]
    if (protocols) {
      protocols.forEach((protocol) => {
        const scheme = typeof protocol === 'string' ? protocol : protocol.scheme
        if (scheme) allowed.push(scheme)
      })
    }
    if (
      !href ||
      href
        .replace(ATTR_WHITESPACE, '')
        .match(
          new RegExp(`^(?:(?:${allowed.join('|')}):|[^a-z]|[a-z0-9+.-]+(?:[^a-z+.-:]|$))`, 'i'),
        )
    ) {
      return url.href
    }
  } catch {
    // невалидный URL — вернём заглушку ниже
  }
  return '#'
}
