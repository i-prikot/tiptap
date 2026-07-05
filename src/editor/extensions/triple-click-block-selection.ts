/**
 * TripleClickBlockSelection — тройной клик выделяет ближайший текстовый блок
 * целиком как NodeSelection (вместо стандартного выделения текста).
 * Порт inline-расширения из чанка 3xpmbr0kqzhen (модуль 128347).
 */
import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state'

export const TripleClickBlockSelection = Extension.create({
  name: 'tripleClickBlockSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tripleClickBlockSelection'),
        props: {
          handleTripleClick: (view, pos) => {
            const { state } = view
            const { doc } = state
            const $pos = doc.resolve(pos)

            let depth = $pos.depth
            while (depth > 0 && !$pos.node(depth).isTextblock) depth--
            if (depth === 0 || $pos.node(depth).type.spec.selectable === false) return false

            const blockStart = $pos.before(depth)
            view.dispatch(state.tr.setSelection(NodeSelection.create(doc, blockStart)))
            return true
          },
        },
      }),
    ]
  },
})
