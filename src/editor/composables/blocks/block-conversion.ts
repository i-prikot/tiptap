/**
 * Общая логика «Turn into»-преобразований блоков: перед конвертацией
 * одиночный блок выделяется как NodeSelection, содержимое очищается от
 * вложенных обёрток (clearNodes), затем применяется целевой тип.
 * Порт общего паттерна из чанка 415bw3fz4s42y.
 */
import type { Editor } from '@tiptap/vue-3'
import type { ChainedCommands } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import {
  findNodePosition,
  getSelectedBlockNodes,
  isValidPosition,
  selectionWithinConvertibleTypes,
} from '../../utils/tiptap-utils'

/** Типы блоков, между которыми возможно преобразование. */
export const CONVERTIBLE_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
]

/**
 * Выполняет преобразование блока: нормализует выделение (одиночный блок →
 * NodeSelection → текстовое выделение содержимого + clearNodes), затем
 * вызывает apply с подготовленной цепочкой.
 */
export function convertSelectedBlock(
  editor: Editor,
  apply: (chain: ChainedCommands) => ChainedCommands,
): boolean {
  try {
    const view = editor.view
    let state = view.state
    let tr = state.tr

    const selectedBlocks = getSelectedBlockNodes(editor)
    const isSingleConvertibleBlock =
      selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES) && selectedBlocks.length === 1

    if (
      (state.selection.empty || state.selection instanceof TextSelection) &&
      isSingleConvertibleBlock
    ) {
      const pos = findNodePosition({ editor, node: state.selection.$anchor.node(1) })?.pos
      if (!isValidPosition(pos)) return false
      tr = tr.setSelection(NodeSelection.create(state.doc, pos))
      view.dispatch(tr)
      state = view.state
    }

    const selection = state.selection
    let chain = editor.chain().focus()
    if (selection instanceof NodeSelection) {
      const firstInner = selection.node.firstChild?.firstChild
      const lastInner = selection.node.lastChild?.lastChild
      const from = firstInner ? selection.from + firstInner.nodeSize : selection.from + 1
      const to = lastInner ? selection.to - lastInner.nodeSize : selection.to - 1
      const $from = state.doc.resolve(from)
      const $to = state.doc.resolve(to)
      chain = chain.setTextSelection(TextSelection.between($from, $to)).clearNodes()
    }

    apply(chain).run()
    editor.chain().focus().selectTextblockEnd().run()
    return true
  } catch {
    return false
  }
}
