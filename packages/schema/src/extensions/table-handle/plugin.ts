import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { setActiveTableHandleContext } from './drag-and-drop.js'
import { createTableHandleDecorations } from './decorations.js'
import { tableHandlePluginKey } from './plugin-key.js'
import { TableHandleView } from './plugin-view.js'
import type { TableHandleState } from './types.js'

export { tableHandlePluginKey } from './plugin-key.js'

let activeHandleView: TableHandleView | null = null

/**
 * Создаёт ProseMirror plugin табличных ручек.
 *
 * Plugin state содержит только freeze-флаг, а подробный `TableHandleState`
 * остаётся во view и передаётся callback-ом. Декорации читают этот же view-state
 * для drag-source и dropcursor; они не создают транзакции и не являются
 * доказательством валидности drop.
 */
export function TableHandlePlugin(editor: Editor, emit: (state: TableHandleState) => void) {
  return new Plugin({
    key: tableHandlePluginKey,
    state: {
      init: () => false,
      apply: (tr, value) => {
        const meta = tr.getMeta(tableHandlePluginKey)
        return meta !== undefined ? meta : value
      },
    },
    view: (view) => {
      activeHandleView = new TableHandleView(editor, view, emit)
      setActiveTableHandleContext(activeHandleView)
      return activeHandleView
    },
    props: {
      decorations: (state) => {
        if (!activeHandleView) return null
        return createTableHandleDecorations({
          editor,
          editorState: state,
          tableState: activeHandleView.state,
          tablePos: activeHandleView.tablePos,
        })
      },
    },
  })
}

export const TableHandleExtension = Extension.create({
  name: 'tableHandleExtension',

  /**
   * Добавляет команды управления freeze без прямого редактирования view-state.
   *
   * `freezeHandles`/`unfreezeHandles` всегда возвращают `true`; при
   * отсутствии dispatch они только подтверждают применимость команды. Реальное
   * обновление `menuFrozen` происходит в `TableHandleView.update` после
   * обработки meta-транзакции.
   */
  addCommands() {
    return {
      freezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, true)
          return true
        },
      unfreezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, false)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    return [
      TableHandlePlugin(editor, (state) => {
        this.editor.emit('tableHandleState', state)
      }),
    ]
  },
})
