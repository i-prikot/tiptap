import { Extension, InputRule, mergeAttributes, Node } from '@tiptap/core'
import type { NodeViewRenderer } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'

export type MathematicsNodeType = 'inlineMath' | 'blockMath'

export type MathematicsKatexOptions = object

export interface MathematicsNodeViewOptions {
  type: MathematicsNodeType
  katexOptions?: MathematicsKatexOptions
  onClick?: (node: PMNode, pos: number) => void
}

export type MathematicsNodeViewRenderer = (options: MathematicsNodeViewOptions) => NodeViewRenderer

export interface MathematicsNodeOptions {
  katexOptions?: MathematicsKatexOptions
  onClick?: (node: PMNode, pos: number) => void
  nodeView?: MathematicsNodeViewRenderer
}

export interface MathematicsOptions {
  inlineOptions?: MathematicsNodeOptions
  blockOptions?: MathematicsNodeOptions
  katexOptions?: MathematicsKatexOptions
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMath: {
      insertBlockMath: (options: { latex: string; pos?: number }) => ReturnType
      deleteBlockMath: (options?: { pos?: number }) => ReturnType
      updateBlockMath: (options?: { latex: string; pos?: number }) => ReturnType
    }
    inlineMath: {
      insertInlineMath: (options: { latex: string; pos?: number }) => ReturnType
      deleteInlineMath: (options?: { pos?: number }) => ReturnType
      updateInlineMath: (options?: { latex?: string; pos?: number }) => ReturnType
    }
  }
}

interface MathematicsNodeConfig {
  name: MathematicsNodeType
  group: 'block' | 'inline'
  inline: boolean
  element: 'div' | 'span'
  dataType: 'block-math' | 'inline-math'
}

const createMathematicsNode = (config: MathematicsNodeConfig) =>
  Node.create<MathematicsNodeOptions>({
    name: config.name,
    group: config.group,
    inline: config.inline,
    atom: true,

    addOptions() {
      return {
        onClick: undefined,
        katexOptions: undefined,
        nodeView: undefined,
      }
    },

    addAttributes() {
      return {
        latex: {
          default: '',
          parseHTML: (element) => element.getAttribute('data-latex'),
          renderHTML: (attributes) => ({
            'data-latex': attributes.latex,
          }),
        },
      }
    },

    addCommands() {
      if (config.name === 'blockMath') {
        return {
          insertBlockMath:
            (options: { latex: string; pos?: number }) =>
            ({ commands, editor }) => {
              const { latex, pos } = options

              if (!latex) {
                return false
              }

              return commands.insertContentAt(pos ?? editor.state.selection.from, {
                type: this.name,
                attrs: { latex },
              })
            },

          deleteBlockMath:
            (options?: { pos?: number }) =>
            ({ editor, tr }) => {
              const pos = options?.pos ?? editor.state.selection.$from.pos
              const node = editor.state.doc.nodeAt(pos)

              if (!node || node.type.name !== this.name) {
                return false
              }

              tr.delete(pos, pos + node.nodeSize)
              return true
            },

          updateBlockMath:
            (options?: { latex: string; pos?: number }) =>
            ({ editor, tr }) => {
              const latex = options?.latex
              const pos = options?.pos ?? editor.state.selection.$from.pos
              const node = editor.state.doc.nodeAt(pos)

              if (!node || node.type.name !== this.name) {
                return false
              }

              tr.setNodeMarkup(pos, this.type, {
                ...node.attrs,
                latex: latex ?? node.attrs.latex,
              })

              return true
            },
        }
      }

      return {
        insertInlineMath:
          (options: { latex: string; pos?: number }) =>
          ({ editor, tr }) => {
            const { latex } = options
            const pos = options.pos ?? editor.state.selection.from

            if (!latex) {
              return false
            }

            tr.replaceWith(pos, pos, this.type.create({ latex }))
            return true
          },

        deleteInlineMath:
          (options?: { pos?: number }) =>
          ({ editor, tr }) => {
            const pos = options?.pos ?? editor.state.selection.$from.pos
            const node = editor.state.doc.nodeAt(pos)

            if (!node || node.type.name !== this.name) {
              return false
            }

            tr.delete(pos, pos + node.nodeSize)
            return true
          },

        updateInlineMath:
          (options?: { latex?: string; pos?: number }) =>
          ({ editor, tr }) => {
            const latex = options?.latex
            const pos = options?.pos ?? editor.state.selection.$from.pos
            const node = editor.state.doc.nodeAt(pos)

            if (!node || node.type.name !== this.name) {
              return false
            }

            tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex })
            return true
          },
      }
    },

    parseHTML() {
      return [{ tag: `${config.element}[data-type="${config.dataType}"]` }]
    },

    renderHTML({ HTMLAttributes }) {
      return [config.element, mergeAttributes(HTMLAttributes, { 'data-type': config.dataType })]
    },

    parseMarkdown: (token: any) => ({
      type: config.name,
      attrs: { latex: token.latex },
    }),

    renderMarkdown: (node) => {
      const latex = node.attrs?.latex || ''

      return config.name === 'blockMath' ? ['$$', latex, '$$'].join('\n') : `$${latex}$`
    },

    markdownTokenizer:
      config.name === 'blockMath'
        ? {
            name: 'blockMath',
            level: 'block',
            start: (source: string) => source.indexOf('$$'),
            tokenize: (source: string) => {
              const match = source.match(/^\$\$([^$]+)\$\$/)

              if (!match) {
                return undefined
              }

              const [raw, latex] = match

              return { type: 'blockMath', raw, latex: latex.trim() }
            },
          }
        : {
            name: 'inlineMath',
            level: 'inline',
            start: (source: string) => source.indexOf('$'),
            tokenize: (source: string) => {
              const match = source.match(/^\$([^$]+)\$(?!\$)/)

              if (!match) {
                return undefined
              }

              const [raw, latex] = match

              return { type: 'inlineMath', raw, latex: latex.trim() }
            },
          },

    addInputRules() {
      if (config.name === 'blockMath') {
        return [
          new InputRule({
            find: /^\$\$\$([^$]+)\$\$\$$/,
            handler: ({ state, range, match }) => {
              const [, latex] = match
              const { tr } = state
              const $from = state.doc.resolve(range.from)
              const node = this.type.create({ latex })
              const consumesHostTextblock =
                $from.depth > 0 &&
                $from.parent.isTextblock &&
                range.from === $from.start() &&
                range.to === $from.end()
              const canReplaceHostTextblock =
                consumesHostTextblock &&
                $from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), this.type)
              const replacementRange = canReplaceHostTextblock
                ? { from: $from.before(), to: $from.after() }
                : range

              tr.replaceWith(replacementRange.from, replacementRange.to, node)
            },
          }),
        ]
      }

      return [
        new InputRule({
          find: /(?<!\$)(\$\$([^$\n]+?)\$\$)(?!\$)/,
          handler: ({ range, match, state }) => {
            const { tr } = state

            tr.replaceWith(range.from, range.to, this.type.create({ latex: match[2] }))
          },
        }),
      ]
    },

    addNodeView() {
      return (
        this.options.nodeView?.({
          type: config.name,
          katexOptions: this.options.katexOptions,
          onClick: this.options.onClick,
        }) ?? null
      )
    },
  })

export const BlockMath = createMathematicsNode({
  name: 'blockMath',
  group: 'block',
  inline: false,
  element: 'div',
  dataType: 'block-math',
})

export const InlineMath = createMathematicsNode({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  element: 'span',
  dataType: 'inline-math',
})

export const Mathematics = Extension.create<MathematicsOptions>({
  name: 'Mathematics',

  addOptions() {
    return {
      inlineOptions: undefined,
      blockOptions: undefined,
      katexOptions: undefined,
    }
  },

  addExtensions() {
    return [
      BlockMath.configure({
        ...this.options.blockOptions,
        katexOptions: this.options.katexOptions,
      }),
      InlineMath.configure({
        ...this.options.inlineOptions,
        katexOptions: this.options.katexOptions,
      }),
    ]
  },
})

export default Mathematics
