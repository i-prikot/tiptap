/**
 * NodeAlignment — глобальные атрибуты `nodeTextAlign`/`nodeVerticalAlign`
 * для блоков и ячеек таблиц с командами set/unset/toggle.
 * Порт из чанка 34p294mqk5mqb (модуль 109299).
 */
import { Extension } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { getSelectedNodesOfType, updateNodesAttr } from '../utils/tiptap-utils'
import type { NodeWithPos } from '../utils/tiptap-utils'

export interface NodeAlignmentOptions {
  types: string[]
  useStyle: boolean
  textAlignValues: string[]
  verticalAlignValues: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nodeAlignment: {
      setNodeTextAlign: (align: string) => ReturnType
      unsetNodeTextAlign: () => ReturnType
      toggleNodeTextAlign: (align: string) => ReturnType
      setNodeVAlign: (align: string) => ReturnType
      unsetNodeVAlign: () => ReturnType
      toggleNodeVAlign: (align: string) => ReturnType
      setNodeAlignment: (textAlign?: string, verticalAlign?: string) => ReturnType
      unsetNodeAlignment: () => ReturnType
    }
  }
}

/** Если хотя бы у одного узла значение отличается — применяем, иначе снимаем. */
function toggleAttrValue(nodes: NodeWithPos[], attrName: string, value: string): string | null {
  if (nodes.length === 0) return null
  for (const { node } of nodes) {
    if ((node.attrs?.[attrName] ?? null) !== value) return value
  }
  return null
}

export const NodeAlignment = Extension.create<NodeAlignmentOptions>({
  name: 'nodeAlignment',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'tableCell', 'tableHeader'],
      useStyle: true,
      textAlignValues: ['left', 'center', 'right', 'justify'],
      verticalAlignValues: ['top', 'middle', 'bottom'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeTextAlign: {
            default: null,
            parseHTML: (element) => {
              const styleValue = element.style?.textAlign
              if (styleValue && this.options.textAlignValues.includes(styleValue)) return styleValue
              const dataValue = element.getAttribute('data-node-text-align')
              return dataValue && this.options.textAlignValues.includes(dataValue)
                ? dataValue
                : null
            },
            renderHTML: (attributes) => {
              const align = attributes.nodeTextAlign
              if (!align || !this.options.textAlignValues.includes(align)) return {}
              return this.options.useStyle
                ? { style: `text-align: ${align}` }
                : { 'data-node-text-align': align }
            },
          },
          nodeVerticalAlign: {
            default: null,
            parseHTML: (element) => {
              const styleValue = element.style?.verticalAlign
              if (styleValue && this.options.verticalAlignValues.includes(styleValue))
                return styleValue
              const dataValue = element.getAttribute('data-node-vertical-align')
              return dataValue && this.options.verticalAlignValues.includes(dataValue)
                ? dataValue
                : null
            },
            renderHTML: (attributes) => {
              const align = attributes.nodeVerticalAlign
              if (!align || !this.options.verticalAlignValues.includes(align)) return {}
              return this.options.useStyle
                ? { style: `vertical-align: ${align}` }
                : { 'data-node-vertical-align': align }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    const applyAttr =
      (attrName: string, resolve: (nodes: NodeWithPos[], value?: string) => string | null) =>
      (value?: string) =>
      ({ state, tr }: { state: EditorState; tr: Transaction }) => {
        const nodes = getSelectedNodesOfType(state.selection, this.options.types)
        if (nodes.length === 0) return false
        const resolved = resolve(nodes, value)
        return updateNodesAttr(tr, nodes, attrName, resolved)
      }

    return {
      setNodeTextAlign: applyAttr('nodeTextAlign', (_nodes, value) =>
        value && this.options.textAlignValues.includes(value) ? value : null,
      ),
      unsetNodeTextAlign: () => applyAttr('nodeTextAlign', () => null)(undefined),
      toggleNodeTextAlign: applyAttr('nodeTextAlign', (nodes, value) =>
        value && this.options.textAlignValues.includes(value)
          ? toggleAttrValue(nodes, 'nodeTextAlign', value)
          : null,
      ),
      setNodeVAlign: applyAttr('nodeVerticalAlign', (_nodes, value) =>
        value && this.options.verticalAlignValues.includes(value) ? value : null,
      ),
      unsetNodeVAlign: () => applyAttr('nodeVerticalAlign', () => null)(undefined),
      toggleNodeVAlign: applyAttr('nodeVerticalAlign', (nodes, value) =>
        value && this.options.verticalAlignValues.includes(value)
          ? toggleAttrValue(nodes, 'nodeVerticalAlign', value)
          : null,
      ),
      setNodeAlignment:
        (textAlign?: string, verticalAlign?: string) =>
        ({ state, tr }: { state: EditorState; tr: Transaction }) => {
          const nodes = getSelectedNodesOfType(state.selection, this.options.types)
          if (nodes.length === 0) return false
          let changed = false
          for (const { node, pos } of nodes) {
            const attrs: Record<string, unknown> = { ...node.attrs }
            if (textAlign && this.options.textAlignValues.includes(textAlign)) {
              attrs.nodeTextAlign = textAlign
              changed = true
            }
            if (verticalAlign && this.options.verticalAlignValues.includes(verticalAlign)) {
              attrs.nodeVerticalAlign = verticalAlign
              changed = true
            }
            if (changed) tr.setNodeMarkup(pos, undefined, attrs)
          }
          return changed
        },
      unsetNodeAlignment:
        () =>
        ({ state, tr }: { state: EditorState; tr: Transaction }) => {
          const nodes = getSelectedNodesOfType(state.selection, this.options.types)
          if (nodes.length === 0) return false
          let changed = false
          for (const { node, pos } of nodes) {
            const textAlign = node.attrs?.nodeTextAlign ?? null
            const verticalAlign = node.attrs?.nodeVerticalAlign ?? null
            if (textAlign || verticalAlign) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                nodeTextAlign: null,
                nodeVerticalAlign: null,
              })
              changed = true
            }
          }
          return changed
        },
    }
  },
})
