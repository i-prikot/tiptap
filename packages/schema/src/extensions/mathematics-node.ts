import { InputRule, mergeAttributes, Node } from '@tiptap/core'
import type { MathematicsNodeOptions, MathematicsNodeType } from './mathematics-types.js'

export interface MathematicsNodeConfig {
  name: MathematicsNodeType
  group: 'block' | 'inline'
  inline: boolean
  element: 'div' | 'span'
  dataType: 'block-math' | 'inline-math'
}

type MathematicsNodeInstance = {
  name: string
  type: { create: (attributes: { latex: string }) => unknown }
  options: MathematicsNodeOptions
}

function createBlockMathCommands(node: MathematicsNodeInstance) {
  return {
    insertBlockMath:
      (options: { latex: string; pos?: number }) =>
      ({ commands, editor }: any) => {
        const { latex, pos } = options
        if (!latex) return false
        return commands.insertContentAt(pos ?? editor.state.selection.from, {
          type: node.name,
          attrs: { latex },
        })
      },
    deleteBlockMath:
      (options?: { pos?: number }) =>
      ({ editor, tr }: any) => {
        const pos = options?.pos ?? editor.state.selection.$from.pos
        const mathNode = editor.state.doc.nodeAt(pos)
        if (!mathNode || mathNode.type.name !== node.name) return false
        tr.delete(pos, pos + mathNode.nodeSize)
        return true
      },
    updateBlockMath:
      (options?: { latex: string; pos?: number }) =>
      ({ editor, tr }: any) => {
        const latex = options?.latex
        const pos = options?.pos ?? editor.state.selection.$from.pos
        const mathNode = editor.state.doc.nodeAt(pos)
        if (!mathNode || mathNode.type.name !== node.name) return false
        tr.setNodeMarkup(pos, node.type, {
          ...mathNode.attrs,
          latex: latex ?? mathNode.attrs.latex,
        })
        return true
      },
  }
}

function createInlineMathCommands(node: MathematicsNodeInstance) {
  return {
    insertInlineMath:
      (options: { latex: string; pos?: number }) =>
      ({ editor, tr }: any) => {
        const { latex } = options
        const pos = options.pos ?? editor.state.selection.from
        if (!latex) return false
        tr.replaceWith(pos, pos, node.type.create({ latex }))
        return true
      },
    deleteInlineMath:
      (options?: { pos?: number }) =>
      ({ editor, tr }: any) => {
        const pos = options?.pos ?? editor.state.selection.$from.pos
        const mathNode = editor.state.doc.nodeAt(pos)
        if (!mathNode || mathNode.type.name !== node.name) return false
        tr.delete(pos, pos + mathNode.nodeSize)
        return true
      },
    updateInlineMath:
      (options?: { latex?: string; pos?: number }) =>
      ({ editor, tr }: any) => {
        const latex = options?.latex
        const pos = options?.pos ?? editor.state.selection.$from.pos
        const mathNode = editor.state.doc.nodeAt(pos)
        if (!mathNode || mathNode.type.name !== node.name) return false
        tr.setNodeMarkup(pos, node.type, { ...mathNode.attrs, latex })
        return true
      },
  }
}

function createMarkdownTokenizer(config: MathematicsNodeConfig) {
  const isBlockMath = config.name === 'blockMath'
  const find = isBlockMath ? /^\$\$([^$]+)\$\$/ : /^\$([^$]+)\$(?!\$)/
  return {
    name: config.name,
    level: isBlockMath ? ('block' as const) : ('inline' as const),
    start: (source: string) => source.indexOf(isBlockMath ? '$$' : '$'),
    tokenize: (source: string) => {
      const match = source.match(find)
      if (!match) return undefined
      const [raw, latex] = match
      return { type: config.name, raw, latex: latex.trim() }
    },
  }
}

function createInputRules(config: MathematicsNodeConfig, node: MathematicsNodeInstance) {
  if (config.name === 'blockMath') {
    return [
      new InputRule({
        find: /^\$\$\$([^$]+)\$\$\$$/,
        handler: ({ state, range, match }) => {
          const [, latex] = match
          const $from = state.doc.resolve(range.from)
          const mathNode = node.type.create({ latex })
          const consumesHostTextblock =
            $from.depth > 0 &&
            $from.parent.isTextblock &&
            range.from === $from.start() &&
            range.to === $from.end()
          const canReplaceHostTextblock =
            consumesHostTextblock &&
            $from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), node.type as any)
          const replacementRange = canReplaceHostTextblock
            ? { from: $from.before(), to: $from.after() }
            : range
          state.tr.replaceWith(replacementRange.from, replacementRange.to, mathNode as any)
        },
      }),
    ]
  }

  return [
    new InputRule({
      find: /(?<!\$)(\$\$([^$\n]+?)\$\$)(?!\$)/,
      handler: ({ range, match, state }) => {
        state.tr.replaceWith(range.from, range.to, node.type.create({ latex: match[2] }) as any)
      },
    }),
  ]
}

export function createMathematicsNode(config: MathematicsNodeConfig) {
  return Node.create<MathematicsNodeOptions>({
    name: config.name,
    group: config.group,
    inline: config.inline,
    atom: true,
    addOptions() {
      return { onClick: undefined, katexOptions: undefined, nodeView: undefined }
    },
    addAttributes() {
      return {
        latex: {
          default: '',
          parseHTML: (element) => element.getAttribute('data-latex'),
          renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
        },
      }
    },
    addCommands() {
      const node = this as unknown as MathematicsNodeInstance
      return config.name === 'blockMath'
        ? createBlockMathCommands(node)
        : createInlineMathCommands(node)
    },
    parseHTML() {
      return [{ tag: `${config.element}[data-type="${config.dataType}"]` }]
    },
    renderHTML({ HTMLAttributes }) {
      return [config.element, mergeAttributes(HTMLAttributes, { 'data-type': config.dataType })]
    },
    parseMarkdown: (token: any) => ({ type: config.name, attrs: { latex: token.latex } }),
    renderMarkdown: (node) => {
      const latex = node.attrs?.latex || ''
      return config.name === 'blockMath' ? ['$$', latex, '$$'].join('\n') : `$${latex}$`
    },
    markdownTokenizer: createMarkdownTokenizer(config),
    addInputRules() {
      return createInputRules(config, this as unknown as MathematicsNodeInstance)
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
}
