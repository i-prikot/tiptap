import type { Editor } from '@tiptap/core'
import { mergeCells, splitCell } from '@tiptap/pm/tables'
import { isExtensionAvailable } from '../tiptap-utils'
import { TABLE_EXTENSION } from './shared'
import type { MergeSplitAction } from './shared'

export const MERGE_SPLIT_LABELS: Record<MergeSplitAction, string> = {
  merge: 'Merge cells',
  split: 'Split cell',
}

export function canMergeCells(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    return mergeCells(editor.state, undefined)
  } catch {
    return false
  }
}

export function canSplitCell(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    return splitCell(editor.state, undefined)
  } catch {
    return false
  }
}

export function mergeSplitCells(editor: Editor | null, action: MergeSplitAction): boolean {
  if (!editor) return false
  try {
    if (action === 'merge') {
      if (!canMergeCells(editor)) return false
      return mergeCells(editor.state, editor.view.dispatch.bind(editor.view))
    }
    if (!canSplitCell(editor)) return false
    return splitCell(editor.state, editor.view.dispatch.bind(editor.view))
  } catch (error) {
    console.error(`Error ${action}ing table cell:`, error)
    return false
  }
}
