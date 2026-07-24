/**
 * Indent — отступы блоков (paragraph/heading/blockquote) с атрибутом `indent`,
 * Tab/Shift-Tab, авто-outdent на Enter/Backspace и выравнивание отступа
 * после drag&drop. Внутри списков делегирует sink/liftListItem, внутри
 * таблиц не перехватывает Tab.
 */
import { Extension } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { clamp, getSelectedNodesOfType, updateNodesAttr } from '../utils/tiptap-utils.js'

export interface IndentOptions {
  /** Типы блоков, которые получают атрибут indent. */
  types: string[]
  /** Типы элементов списков — для них indent делегируется sink/liftListItem. */
  listItemTypes: string[]
  /** Внутри этих предков Tab/Shift-Tab не перехватываются (таблицы). */
  bypassAncestors: string[]
  minLevel: number
  maxLevel: number
  /** Рендерить margin-left напрямую вместо CSS-переменной. */
  useStyle: boolean
  /** Ширина одного уровня отступа в px (для парсинга и useStyle). */
  indentUnit: number
}

/** Имя типа ближайшего предка-списка из набора, либо null. */
function findListItemAncestor(state: EditorState, listItemTypes: Set<string>): string | null {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name
    if (listItemTypes.has(name)) return name
  }
  return null
}

/**
 * Условие авто-outdent: пустое выделение вне списка, курсор в блоке с
 * indent > 0; для Enter блок должен быть пуст, для Backspace — курсор в начале.
 */
function shouldAutoOutdent(
  state: EditorState,
  types: string[],
  listItemTypes: Set<string>,
  options: { onlyIfEmpty: boolean },
): boolean {
  const { selection } = state
  const { $from } = selection
  if (!selection.empty || findListItemAncestor(state, listItemTypes) !== null) return false
  const parent = $from.parent
  if (!types.includes(parent.type.name)) return false
  if (parent.attrs.indent <= 0) return false
  return options.onlyIfEmpty ? parent.content.size === 0 : $from.parentOffset === 0
}

function parseIndentFromElement(
  element: HTMLElement,
  min: number,
  max: number,
  indentUnit: number,
): number {
  const dataIndent = element.getAttribute('data-indent')
  if (dataIndent) {
    const parsed = parseInt(dataIndent, 10)
    if (!isNaN(parsed)) return clamp(parsed, min, max)
  }
  for (const property of ['marginLeft', 'paddingLeft', 'textIndent'] as const) {
    const value = element.style?.[property]
    if (value) {
      const parsed = parseFloat(value)
      if (!isNaN(parsed) && parsed > 0 && indentUnit > 0) {
        return clamp(Math.round(parsed / indentUnit), min, max)
      }
    }
  }
  return 0
}

const indentPluginKey = new PluginKey('indent')

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      listItemTypes: ['listItem', 'taskItem'],
      bypassAncestors: ['tableCell', 'tableHeader'],
      minLevel: 0,
      maxLevel: 8,
      useStyle: false,
      indentUnit: 24,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) =>
              parseIndentFromElement(
                element,
                this.options.minLevel,
                this.options.maxLevel,
                this.options.indentUnit,
              ),
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0
              if (level === 0) return {}
              const attrs: Record<string, string> = {
                'data-indent': String(level),
                style: `--tt-indent-level: ${level}`,
              }
              if (this.options.useStyle && this.options.indentUnit > 0) {
                attrs.style = `--tt-indent-level: ${level}; margin-left: ${level * this.options.indentUnit}px`
              }
              return attrs
            },
          },
        },
      },
    ]
  },

  addCommands() {
    const listItemTypes = new Set(this.options.listItemTypes)
    const applyIndent = (
      { state, tr }: { state: EditorState; tr: import('@tiptap/pm/state').Transaction },
      change: (current: number) => number,
    ) => {
      const nodes = getSelectedNodesOfType(state.selection, this.options.types)
      if (nodes.length === 0) return false
      return updateNodesAttr(tr, nodes, 'indent', (current: unknown) =>
        clamp(change(Number(current) || 0), this.options.minLevel, this.options.maxLevel),
      )
    }

    return {
      indent: () => (context) => {
        const listItemType = findListItemAncestor(context.state, listItemTypes)
        if (listItemType && 'sinkListItem' in context.commands) {
          return context.commands.sinkListItem(listItemType)
        }
        return applyIndent(context, (current) => current + 1)
      },
      outdent: () => (context) => {
        const listItemType = findListItemAncestor(context.state, listItemTypes)
        if (listItemType && 'liftListItem' in context.commands) {
          return context.commands.liftListItem(listItemType)
        }
        return applyIndent(context, (current) => current - 1)
      },
      setIndent: (level: number) => (context) => applyIndent(context, () => level),
      unsetIndent: () => (context) => applyIndent(context, () => 0),
    }
  },

  addProseMirrorPlugins() {
    const types = this.options.types
    return [
      new Plugin({
        key: indentPluginKey,
        // после drop выравнивает indent перемещённых блоков по соседнему блоку
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.getMeta('uiEvent') === 'drop')) return null

          const { doc, selection } = newState
          const { $from, $to } = selection
          const depth = $from.depth > 0 ? $from.depth : 1
          const before = $from.before(depth)
          const $before = doc.resolve(before)
          const parent = $before.node($before.depth)
          const index = $before.index($before.depth)

          let targetIndent = 0
          if (index > 0) {
            targetIndent = parent.child(index - 1).attrs.indent || 0
          } else {
            const toDepth = $to.depth > 0 ? $to.depth : 1
            const after = $to.after(toDepth)
            const $after = doc.resolve(after)
            const afterIndex = $after.indexAfter($after.depth)
            const afterParent = $after.node($after.depth)
            if (afterIndex < afterParent.childCount) {
              targetIndent = afterParent.child(afterIndex).attrs.indent || 0
            }
          }

          const { tr } = newState
          let changed = false
          doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (!types.includes(node.type.name)) return true
            if ((node.attrs.indent || 0) !== targetIndent) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: targetIndent }, node.marks)
              changed = true
            }
            return false
          })
          return changed ? tr : null
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    const listItemTypes = new Set(this.options.listItemTypes)
    const bypassAncestors = new Set(this.options.bypassAncestors)

    const canHandleTab = () => {
      const state = this.editor.state
      const isInsideBypassAncestor = (() => {
        if (bypassAncestors.size === 0) return false
        const { $from } = state.selection
        for (let depth = $from.depth; depth > 0; depth--) {
          if (bypassAncestors.has($from.node(depth).type.name)) return true
        }
        return false
      })()
      if (isInsideBypassAncestor) return false
      if (findListItemAncestor(state, listItemTypes) !== null) return true
      const { $from } = state.selection
      return this.options.types.includes($from.parent.type.name)
    }

    return {
      Tab: () => {
        if (!canHandleTab()) return false
        this.editor.commands.indent()
        return true
      },
      'Shift-Tab': () => {
        if (!canHandleTab()) return false
        this.editor.commands.outdent()
        return true
      },
      Enter: ({ editor }) =>
        shouldAutoOutdent(editor.state, this.options.types, listItemTypes, { onlyIfEmpty: true }) &&
        editor.commands.outdent(),
      Backspace: ({ editor }) =>
        shouldAutoOutdent(editor.state, this.options.types, listItemTypes, {
          onlyIfEmpty: false,
        }) && editor.commands.outdent(),
    }
  },
})
