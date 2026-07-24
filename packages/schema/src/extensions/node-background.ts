/**
 * NodeBackground — глобальный атрибут `backgroundColor` для блочных узлов
 * и ячеек таблиц с командами set/unset/toggle.
 */
import { Extension } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { getSelectedNodesOfType, updateNodesAttr } from '../utils/tiptap-utils.js'
import type { NodeWithPos } from '../utils/tiptap-utils.js'

export interface NodeBackgroundOptions {
  /** Типы узлов, получающих атрибут backgroundColor. */
  types: string[]
  /** true — рендерить inline-стиль, false — data-атрибут. */
  useStyle: boolean
}

/** Если хотя бы у одного узла цвет отличается — применяем, иначе снимаем. */
function toggleValue(nodes: NodeWithPos[], color: string): string | null {
  if (nodes.length === 0) return null
  for (const { node } of nodes) {
    if ((node.attrs?.backgroundColor ?? null) !== color) return color
  }
  return null
}

export const NodeBackground = Extension.create<NodeBackgroundOptions>({
  name: 'nodeBackground',

  addOptions() {
    return {
      types: [
        'paragraph',
        'heading',
        'blockquote',
        'taskList',
        'bulletList',
        'orderedList',
        'tableCell',
        'tableHeader',
      ],
      useStyle: true,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              element.style?.backgroundColor ||
              element.getAttribute('data-background-color') ||
              null,
            renderHTML: (attributes) => {
              const color = attributes.backgroundColor
              if (!color) return {}
              return this.options.useStyle
                ? { style: `background-color: ${color}` }
                : { 'data-background-color': color }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    const applyColor =
      (resolve: (nodes: NodeWithPos[], color?: string) => string | null) =>
      (color?: string) =>
      ({ state, tr }: { state: EditorState; tr: Transaction }) => {
        const nodes = getSelectedNodesOfType(state.selection, this.options.types)
        if (nodes.length === 0) return false
        const value = resolve(nodes, color)
        return updateNodesAttr(tr, nodes, 'backgroundColor', value)
      }

    return {
      setNodeBackgroundColor: applyColor((_nodes, color) => color || null),
      unsetNodeBackgroundColor: () => applyColor(() => null)(undefined),
      toggleNodeBackgroundColor: applyColor((nodes, color) => toggleValue(nodes, color || '')),
    }
  },
})
