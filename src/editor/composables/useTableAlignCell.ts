/**
 * Выравнивание ячеек таблицы (текстовое и вертикальное).
 * Порт useTableAlignCell из чанка 2yhkpc8fmweba (модуль 489144).
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { FunctionalComponent } from 'vue'
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

function canAlignRowOrColumn(editor: Editor | null, index?: number, orientation?: Orientation): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSIONS)) return false
  try {
    if (!getTable(editor)) return false
    return getRowOrColumnCells(editor, index, orientation).cells.length > 0
  } catch {
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
  const { editor, alignmentType, alignment, index, orientation, hideWhenUnavailable = false, onAligned } = options
  const signal = useEditorSelectionSignal(editor)
  const attrName = alignmentType === 'text' ? 'nodeTextAlign' : 'nodeVerticalAlign'
  const defaultValue = alignmentType === 'text' ? 'left' : 'top'

  const canAlign = (): boolean =>
    typeof index === 'number' && orientation
      ? canAlignRowOrColumn(editor.value, index, orientation)
      : isInTableCell(editor.value)

  const currentAlignment = (): string | null => {
    const instance = editor.value
    if (typeof index === 'number' && orientation) {
      if (!instance) return null
      try {
        const { cells } = getRowOrColumnCells(instance, index, orientation)
        const first = cells[0]
        if (!first?.node) return null
        return first.node.attrs?.[attrName] || defaultValue
      } catch {
        return null
      }
    }
    if (!isInTableCell(instance) || !instance) return null
    try {
      const $anchor = instance.state.selection.$anchor
      for (let depth = $anchor.depth; depth >= 0; depth--) {
        const node = $anchor.node(depth)
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          return node.attrs?.[attrName] || defaultValue
        }
      }
      return null
    } catch {
      return null
    }
  }

  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance || !instance.isEditable || !isExtensionAvailable(instance, TABLE_EXTENSIONS)) return false
    return !hideWhenUnavailable || canAlign()
  })
  const isActive = computed(() => (signal.value, currentAlignment() === alignment))
  const canAlignCell = computed(() => (signal.value, canAlign()))

  const handleAlign = (): boolean => {
    const instance = editor.value
    if (!instance) return false
    try {
      let applied: boolean
      if (typeof index === 'number' && orientation) {
        applied = alignRowOrColumn(instance)
      } else {
        if (!isInTableCell(instance)) return false
        applied = instance.commands.setCellAttribute(attrName, alignment)
      }
      if (applied) onAligned?.(alignment)
      return applied
    } catch (error) {
      console.error('Error aligning table cell:', error)
      return false
    }
  }

  const alignRowOrColumn = (instance: Editor): boolean => {
    if (!canAlignRowOrColumn(instance, index, orientation)) return false
    try {
      const tr = instance.state.tr
      const { cells } = getRowOrColumnCells(instance, index, orientation)
      if (cells.length === 0) return false
      const byPos = new Map<number, (typeof cells)[number]>()
      cells.forEach(cell => {
        if (cell.node && cell.pos !== undefined) byPos.set(cell.pos, cell)
      })
      if (byPos.size === 0) return false
      const sorted = Array.from(byPos.values()).sort((a, b) => b.pos - a.pos)
      sorted.forEach(cell => {
        if (cell.node && cell.pos !== undefined) {
          const updated = cell.node.type.create({ ...cell.node.attrs, [attrName]: alignment }, cell.node.content, cell.node.marks)
          tr.replaceWith(cell.pos, cell.pos + cell.node.nodeSize, updated)
        }
      })
      if (tr.docChanged) {
        instance.view.dispatch(tr)
        return true
      }
      return false
    } catch (error) {
      console.error(`Error aligning table ${orientation}:`, error)
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
