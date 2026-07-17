import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TableMap } from '@tiptap/pm/tables'
import type { Rect } from '@tiptap/pm/tables'

import type { DomCellInfo } from './shared.js'

export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

export function safeClosest(
  element: HTMLElement | null | undefined,
  selector: string,
): HTMLElement | null {
  return (element?.closest?.(selector) as HTMLElement | null) ?? null
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Ближайшая ячейка (или .tableWrapper) вокруг DOM-узла. */
export function domCellAround(target: EventTarget | null): DomCellInfo | undefined {
  let current = target as HTMLElement | null
  while (
    current &&
    current.tagName !== 'TD' &&
    current.tagName !== 'TH' &&
    !current.classList.contains('tableWrapper')
  ) {
    if (current.classList.contains('ProseMirror')) return undefined
    current = isHTMLElement(current.parentNode) ? current.parentNode : null
  }
  if (!current) return undefined
  return current.tagName === 'TD' || current.tagName === 'TH'
    ? { type: 'cell', domNode: current, tbodyNode: safeClosest(current, 'tbody') }
    : { type: 'wrapper', domNode: current, tbodyNode: current.querySelector('tbody') }
}

export function getCellIndicesFromDOM(
  cell: HTMLElement,
  tableNode: ProseMirrorNode | null,
  editor: Editor,
): { rowIndex: number; colIndex: number } | null {
  if (!tableNode) return null
  try {
    const pos = editor.view.posAtDOM(cell, 0)
    const $pos = editor.view.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth)
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        const map = TableMap.get(tableNode)
        const cellPos = $pos.before(depth)
        const tableStart = $pos.start(depth - 2)
        const relative = cellPos - tableStart
        const mapIndex = map.map.indexOf(relative)
        return { rowIndex: Math.floor(mapIndex / map.width), colIndex: mapIndex % map.width }
      }
    }
  } catch (error) {
    console.warn('Could not get cell position:', error)
  }
  return null
}

export function getTableFromDOM(
  element: HTMLElement,
  editor: Editor,
): { node: ProseMirrorNode; pos: number } | null {
  try {
    const pos = editor.view.posAtDOM(element, 0)
    const $pos = editor.view.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth)
      if (isTableNode(node)) return { node, pos: depth === 0 ? 0 : $pos.before(depth) }
    }
  } catch (error) {
    console.warn('Could not get table from DOM:', error)
  }
  return null
}

export function isCellEmpty(node: ProseMirrorNode): boolean {
  if (node.childCount === 0) return true
  let empty = true
  node.descendants((child) => {
    if ((child.isText && child.text?.trim()) || (child.isLeaf && !child.isText)) {
      empty = false
      return false
    }
    return true
  })
  return empty
}

export function isTableNode(node: ProseMirrorNode | null | undefined): boolean {
  return !!node && (node.type.name === 'table' || node.type.spec.tableRole === 'table')
}

/** Округление с «полем» — для порогов drag-расширения таблицы. */
export function marginRound(value: number, margin = 0.3): number {
  const floor = Math.floor(value)
  const ceil = Math.ceil(value)
  if (value < floor + margin) return floor
  if (value > ceil - margin) return ceil
  return Math.round(value)
}

export function rectEq(a?: DOMRect | null, b?: DOMRect | null): boolean {
  return (
    (!a && !b) ||
    (!!a &&
      !!b &&
      a.left === b.left &&
      a.top === b.top &&
      a.width === b.width &&
      a.height === b.height)
  )
}

/** Есть ли в прямоугольнике ячейки, выходящие за его границы (merge). */
export function cellsOverlapRectangle({ width, height, map }: TableMap, rect: Rect): boolean {
  let indexTop = rect.top * width + rect.left
  let indexLeft = indexTop
  let indexBottom = (rect.bottom - 1) * width + rect.left
  let indexRight = indexTop + (rect.right - rect.left - 1)
  for (let i = rect.top; i < rect.bottom; i++) {
    if (
      (rect.left > 0 && map[indexLeft] === map[indexLeft - 1]) ||
      (rect.right < width && map[indexRight] === map[indexRight + 1])
    ) {
      return true
    }
    indexLeft += width
    indexRight += width
  }
  for (let i = rect.left; i < rect.right; i++) {
    if (
      (rect.top > 0 && map[indexTop] === map[indexTop - width]) ||
      (rect.bottom < height && map[indexBottom] === map[indexBottom + width])
    ) {
      return true
    }
    indexTop++
    indexBottom++
  }
  return false
}
