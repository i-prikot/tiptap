/**
 * Выравнивание ячеек таблицы (текстовое и вертикальное).
 */
import { createLogger } from '@i-prikot/editor-schema'
import { computed } from 'vue'
import type { ComputedRef, FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable } from '../utils/tiptap-utils'
import { getRowOrColumnCells, getTable } from '../utils/table-utils'
import type { Orientation } from '../utils/table-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
} from '../icons'

export type TableAlignmentType = 'text' | 'vertical'
export type TableTextAlignment = 'left' | 'center' | 'right' | 'justify'
export type TableVerticalAlignment = 'top' | 'middle' | 'bottom'
export type TableAlignment = TableTextAlignment | TableVerticalAlignment

const logger = createLogger('useTableAlignCell')
const TABLE_EXTENSIONS = ['table']

const TEXT_LABELS: Record<TableTextAlignment, string> = {
  left: 'Align left',
  center: 'Align center',
  right: 'Align right',
  justify: 'Justify',
}
const VERTICAL_LABELS: Record<TableVerticalAlignment, string> = {
  top: 'Align top',
  middle: 'Align middle',
  bottom: 'Align bottom',
}

const TEXT_ICONS: Record<TableTextAlignment, FunctionalComponent> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
  justify: AlignJustifyIcon,
}
const VERTICAL_ICONS: Record<TableVerticalAlignment, FunctionalComponent> = {
  top: AlignTopIcon,
  middle: AlignMiddleIcon,
  bottom: AlignBottomIcon,
}

/** Курсор в ячейке таблицы. */
export function isInTableCell(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSIONS)) return false
  try {
    return editor.isActive('tableCell') || editor.isActive('tableHeader')
  } catch {
    return false
  }
}

function canAlignRowOrColumn(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSIONS)) return false
  try {
    return (
      Boolean(getTable(editor)) && getRowOrColumnCells(editor, index, orientation).cells.length > 0
    )
  } catch {
    return false
  }
}

function getCurrentAlignment(
  editor: Editor | null,
  attrName: string,
  defaultValue: string,
  index?: number,
  orientation?: Orientation,
): string | null {
  if (typeof index === 'number' && orientation)
    return getRowOrColumnAlignment(editor, attrName, defaultValue, index, orientation)
  return getActiveCellAlignment(editor, attrName, defaultValue)
}

function getRowOrColumnAlignment(
  editor: Editor | null,
  attrName: string,
  defaultValue: string,
  index: number,
  orientation: Orientation,
): string | null {
  if (!editor) return null
  try {
    const first = getRowOrColumnCells(editor, index, orientation).cells[0]
    return first?.node ? first.node.attrs?.[attrName] || defaultValue : null
  } catch {
    return null
  }
}

function getActiveCellAlignment(
  editor: Editor | null,
  attrName: string,
  defaultValue: string,
): string | null {
  if (!editor || !isInTableCell(editor)) return null
  try {
    const { $anchor } = editor.state.selection
    for (let depth = $anchor.depth; depth >= 0; depth--) {
      const node = $anchor.node(depth)
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        return node.attrs?.[attrName] || defaultValue
      }
    }
  } catch {
    return null
  }
  return null
}

function alignRowOrColumn(
  editor: Editor,
  index: number | undefined,
  orientation: Orientation | undefined,
  attrName: string,
  alignment: TableAlignment,
): boolean {
  if (!canAlignRowOrColumn(editor, index, orientation)) return false
  try {
    const { cells } = getRowOrColumnCells(editor, index, orientation)
    const cellsByPosition = new Map<number, (typeof cells)[number]>()
    cells.forEach((cell) => {
      if (cell.node && cell.pos !== undefined) cellsByPosition.set(cell.pos, cell)
    })
    if (cellsByPosition.size === 0) return false
    const cellsByDescendingPosition = Array.from(cellsByPosition.values()).sort(
      (left, right) => right.pos - left.pos,
    )
    const transaction = editor.state.tr

    cellsByDescendingPosition.forEach((cell) => {
      if (!cell.node || cell.pos === undefined) return
      const updated = cell.node.type.create(
        { ...cell.node.attrs, [attrName]: alignment },
        cell.node.content,
        cell.node.marks,
      )
      transaction.replaceWith(cell.pos, cell.pos + cell.node.nodeSize, updated)
    })
    if (!transaction.docChanged) return false
    editor.view.dispatch(transaction)
    return true
  } catch (error) {
    logger.error(`Error aligning table ${orientation}:`, error)
    return false
  }
}

export interface UseTableAlignCellOptions {
  editor: ComputedRef<Editor | null>
  alignmentType: TableAlignmentType
  alignment: TableAlignment
  index?: number
  orientation?: Orientation
  hideWhenUnavailable?: boolean
  onAligned?: (alignment: TableAlignment) => void
}

export function useTableAlignCell(options: UseTableAlignCellOptions) {
  const {
    editor,
    alignmentType,
    alignment,
    index,
    orientation,
    hideWhenUnavailable = false,
    onAligned,
  } = options
  const signal = useEditorSelectionSignal(editor)
  const attrName = alignmentType === 'text' ? 'nodeTextAlign' : 'nodeVerticalAlign'
  const defaultValue = alignmentType === 'text' ? 'left' : 'top'
  const canAlign = () =>
    typeof index === 'number' && orientation
      ? canAlignRowOrColumn(editor.value, index, orientation)
      : isInTableCell(editor.value)

  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      Boolean(instance?.isEditable && isExtensionAvailable(instance, TABLE_EXTENSIONS)) &&
      (!hideWhenUnavailable || canAlign())
    )
  })
  const isActive = computed(
    () => (
      signal.value,
      getCurrentAlignment(editor.value, attrName, defaultValue, index, orientation) === alignment
    ),
  )
  const canAlignCell = computed(() => (signal.value, canAlign()))
  const handleAlign = (): boolean => {
    const instance = editor.value
    if (!instance) return false
    try {
      const applied =
        typeof index === 'number' && orientation
          ? alignRowOrColumn(instance, index, orientation, attrName, alignment)
          : isInTableCell(instance) && instance.commands.setCellAttribute(attrName, alignment)
      if (applied) onAligned?.(alignment)
      return applied
    } catch (error) {
      logger.error('Error aligning table cell:', error)
      return false
    }
  }

  return {
    isVisible,
    isActive,
    canAlignCell,
    handleAlign,
    label:
      alignmentType === 'text'
        ? TEXT_LABELS[alignment as TableTextAlignment]
        : VERTICAL_LABELS[alignment as TableVerticalAlignment],
    Icon:
      alignmentType === 'text'
        ? TEXT_ICONS[alignment as TableTextAlignment]
        : VERTICAL_ICONS[alignment as TableVerticalAlignment],
  }
}
