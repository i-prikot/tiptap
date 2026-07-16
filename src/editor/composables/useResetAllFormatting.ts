import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { RotateCcwIcon } from '../icons'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export const RESET_ALL_FORMATTING_SHORTCUT_KEY = 'mod+r'
export const DEFAULT_RESET_PRESERVE_MARKS = ['inlineThread']

function selectionHasRemovableMarks(tr: Transaction, preserveMarks: string[]): boolean {
  const { selection } = tr
  if (selection.empty) return false
  for (const range of selection.ranges) {
    let found = false
    tr.doc.nodesBetween(range.$from.pos, range.$to.pos, (node) => {
      if (!node.isInline) return true
      for (const mark of node.marks) {
        if (!preserveMarks.includes(mark.type.name)) {
          found = true
          return false
        }
      }
      return true
    })
    if (found) return true
  }
  return false
}

export function useResetAllFormatting(
  editor: ComputedRef<Editor | null>,
  preserveMarks: string[] = DEFAULT_RESET_PRESERVE_MARKS,
) {
  const signal = useEditorSelectionSignal(editor)
  const canReset = computed(
    () => (
      signal.value,
      !!editor.value &&
        !!editor.value.isEditable &&
        selectionHasRemovableMarks(editor.value.state.tr, preserveMarks)
    ),
  )

  const handleResetFormatting = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { view, state } = instance
      const { tr } = state
      const { selection } = tr
      if (!selection.empty) {
        selection.ranges.forEach((range) => {
          tr.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
            if (!node.isInline) return true
            node.marks.forEach((mark) => {
              if (!preserveMarks.includes(mark.type.name))
                tr.removeMark(pos, pos + node.nodeSize, mark.type)
            })
            return true
          })
        })
      }
      view.dispatch(tr)
      instance.commands.focus()
      return true
    } catch {
      return false
    }
  }

  return {
    canReset,
    handleResetFormatting,
    label: 'Reset formatting',
    shortcutKeys: RESET_ALL_FORMATTING_SHORTCUT_KEY,
    Icon: RotateCcwIcon,
  }
}
