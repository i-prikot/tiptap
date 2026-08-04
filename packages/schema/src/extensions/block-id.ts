import { isChangeOrigin } from '@tiptap/extension-collaboration'
import { UniqueID } from '@tiptap/extension-unique-id'

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

/**
 * The shared UniqueID configuration used by both interactive and renderer kits.
 * Keep the extension's default `id` attribute to preserve persisted documents.
 */
export const BlockId = UniqueID.configure({
  attributeName: BLOCK_ID_ATTRIBUTE,
  types: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
  filterTransaction: (transaction) => !isChangeOrigin(transaction),
})
