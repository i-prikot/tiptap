import { isChangeOrigin } from '@tiptap/extension-collaboration'
import { UniqueID } from '@tiptap/extension-unique-id'
import { Extension, type Editor } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { createLogger } from '../utils/logger.js'

/** Persisted UniqueID attribute name shared with consuming hosts. */
export const BLOCK_ID_ATTRIBUTE = 'id'

/** Node types that may carry the canonical UniqueID attribute. */
export const TOP_LEVEL_BLOCK_ID_NODE_TYPES = [
  'table',
  'paragraph',
  'bulletList',
  'orderedList',
  'taskList',
  'heading',
  'blockquote',
  'codeBlock',
  'tocNode',
] as const

const BLOCK_ID_NORMALIZED_META = 'blockId:normalized'
const blockIdPluginKey = new PluginKey('blockIdTopLevel')
const supportedNodeTypes = new Set<string>(TOP_LEVEL_BLOCK_ID_NODE_TYPES)
const logger = createLogger('BlockId', { minLevel: 'debug' })

interface BlockIdNormalization {
  transaction: Transaction
  strippedNested: number
}

function createNormalizationTransaction(state: EditorState): BlockIdNormalization | null {
  const transaction = state.tr
  let strippedNested = 0

  state.doc.descendants((node, pos) => {
    if (!supportedNodeTypes.has(node.type.name) || node.attrs[BLOCK_ID_ATTRIBUTE] == null) {
      return true
    }
    if (state.doc.resolve(pos).depth === 0) return true

    transaction.setNodeMarkup(
      pos,
      undefined,
      { ...node.attrs, [BLOCK_ID_ATTRIBUTE]: null },
      node.marks,
    )
    strippedNested += 1
    return true
  })

  if (strippedNested === 0) return null
  transaction.setMeta(BLOCK_ID_NORMALIZED_META, true)
  transaction.setMeta('addToHistory', false)
  return { transaction, strippedNested }
}

function dispatchNormalization(editor: Pick<Editor, 'state' | 'view'>): void {
  const normalization = createNormalizationTransaction(editor.state)
  if (!normalization) return
  editor.view.dispatch(normalization.transaction)
  logger.debug('normalize document', { strippedNested: normalization.strippedNested })
}

function scheduleNormalization(editor: Editor): void {
  queueMicrotask(() => {
    if (!editor.isDestroyed) dispatchNormalization(editor)
  })
}

/**
 * The shared UniqueID configuration used by both interactive and renderer kits.
 * IDs are generated only for supported blocks and nested persisted IDs are removed.
 */
export const BlockId = UniqueID.configure({
  attributeName: BLOCK_ID_ATTRIBUTE,
  types: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
  filterTransaction: (transaction) =>
    !isChangeOrigin(transaction) && !transaction.getMeta(BLOCK_ID_NORMALIZED_META),
})

/** Keeps the UniqueID attribute limited to supported direct document children. */
export const BlockIdTopLevel = Extension.create({
  name: 'blockIdTopLevel',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockIdPluginKey,
        view: () => {
          scheduleNormalization(this.editor)
          return {}
        },
        appendTransaction(transactions, _oldState, newState) {
          if (transactions.some((transaction) => transaction.getMeta(BLOCK_ID_NORMALIZED_META))) {
            return null
          }
          const normalization = createNormalizationTransaction(newState)
          if (!normalization) return null
          logger.debug('normalize document', { strippedNested: normalization.strippedNested })
          return normalization.transaction
        },
      }),
    ]
  },
})
