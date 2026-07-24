/**
 * ListNormalization — Backspace на пустом абзаце, зажатом между двумя
 * списками одного типа, удаляет абзац и склеивает списки в один,
 * сохраняя позицию курсора.
 */
import { Extension } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { canJoin } from '@tiptap/pm/transform'

const LIST_TYPES = ['bulletList', 'orderedList', 'taskList']

export const ListNormalization = Extension.create({
  name: 'listNormalization',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        const { $from, empty } = selection
        if (!empty || $from.parentOffset !== 0) return false

        const parent = $from.parent
        if (parent.type.name !== 'paragraph' || parent.content.size > 0) return false

        const containerDepth = $from.depth - 1
        if (containerDepth < 0) return false

        const container = $from.node(containerDepth)
        const index = $from.index(containerDepth)
        // абзац должен стоять строго между двумя соседями
        if (index === 0 || index >= container.childCount - 1) return false

        const before = container.child(index - 1)
        const after = container.child(index + 1)
        const beforeIsList = LIST_TYPES.includes(before.type.name)
        const afterIsList = LIST_TYPES.includes(after.type.name)
        if (!beforeIsList || !afterIsList || before.type.name !== after.type.name) return false

        const paragraphStart = $from.before(containerDepth + 1)
        const paragraphEnd = $from.after(containerDepth + 1)

        // позиция курсора — конец последнего пункта первого списка
        const $beforeParagraph = state.doc.resolve(paragraphStart - 1)
        const cursorSelection = TextSelection.findFrom($beforeParagraph, -1, true)
        if (!cursorSelection) return false

        const cursorPos = cursorSelection.from
        const tr = state.tr
        tr.delete(paragraphStart, paragraphEnd)
        if (canJoin(tr.doc, paragraphStart)) tr.join(paragraphStart)

        const mappedCursor = tr.mapping.map(cursorPos)
        tr.setSelection(TextSelection.create(tr.doc, mappedCursor))
        view.dispatch(tr)
        return true
      },
    }
  },
})
