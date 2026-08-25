import type { AnyExtension, Extension, Extensions } from '@tiptap/core'
import type * as Y from 'yjs'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder, Selection } from '@tiptap/extensions'
import { TextAlign } from '@tiptap/extension-text-align'
import Collaboration from '@tiptap/extension-collaboration'
import {
  CollaborationCaret,
  type CollaborationCaretOptions,
} from '@tiptap/extension-collaboration-caret'
import { Mention } from '@tiptap/extension-mention'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Highlight } from '@tiptap/extension-highlight'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import {
  TableOfContents,
  getHierarchicalIndexes,
  type TableOfContentData,
} from '@tiptap/extension-table-of-contents'
import { Typography } from '@tiptap/extension-typography'

import { HorizontalRule } from './horizontal-rule.js'
import { BlockId } from './block-id.js'
import { BlockRole, CANONICAL_BLOCK_ROLES } from './block-role.js'
import { Indent } from './indent.js'
import { ListNormalization } from './list-normalization.js'
import { Mathematics } from './mathematics.js'
import { TripleClickBlockSelection } from './triple-click-block-selection.js'
import { NodeBackground } from './node-background.js'
import { NodeAlignment } from './node-alignment.js'
import { UiState } from './ui-state.js'
import { TableKit } from './table-kit.js'
import { TableHandleExtension } from './table-handle.js'
import { Image } from '../nodes/image/image.js'
import { ImageUploadNode } from '../nodes/image-upload/image-upload.js'
import { TocNode } from '../nodes/toc/toc.js'
import type { ImageUploadAdapter } from '../types/image-upload.js'
import type { CollabUser } from '../types/user.js'
import { MAX_FILE_SIZE } from '../utils/tiptap-utils.js'

const nodeBackgroundTypes = [
  'paragraph',
  'heading',
  'blockquote',
  'taskList',
  'bulletList',
  'orderedList',
  'tableCell',
  'tableHeader',
  'tocNode',
]

export interface ExtensionKitFeatureFlags {
  tocSidebar: boolean
  floatingMenus: boolean
  mobileToolbar: boolean
  tableControls: boolean
}

export type ExtensionKitPlaceholder = string | (() => string)

export interface ExtensionKitNodeOverrides {
  image?: typeof Image
  imageUpload?: typeof ImageUploadNode
  mathematics?: Extension
  toc?: typeof TocNode
}

export type CollaborationProvider = CollaborationCaretOptions['provider']

export interface ExtensionKitOptions {
  provider: CollaborationProvider | null
  ydoc: Y.Doc
  placeholder: ExtensionKitPlaceholder
  user: CollabUser
  features: ExtensionKitFeatureFlags
  imageUpload: ImageUploadAdapter
  blockRoles?: readonly string[]
  onImageUploadError: (error: Error) => void
  onTableOfContentsUpdate: (content: TableOfContentData) => void
}

async function createInteractiveEmojiExtension(): Promise<AnyExtension> {
  const { Emoji, gitHubEmojis } = await import('@tiptap/extension-emoji')

  return Emoji.configure({
    emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes('regional')),
    forceFallbackImages: true,
  })
}

export function createRendererExtensionKitWithEmoji(emojiExtension: AnyExtension): Extensions {
  return [
    StarterKit.configure({
      horizontalRule: false,
      link: { openOnClick: false },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Mention,
    emojiExtension,
    Table.configure({ resizable: false, cellMinWidth: 120 }),
    TableCell,
    TableHeader,
    TableRow,
    NodeBackground.configure({ types: nodeBackgroundTypes }),
    NodeAlignment,
    TextStyle,
    Mathematics,
    Superscript,
    Subscript,
    Indent,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Image,
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: () => undefined,
    }),
    ImageUploadNode.configure({
      accept: 'image/*',
      maxSize: MAX_FILE_SIZE,
      limit: 3,
    }),
    TocNode.configure({ topOffset: 48 }),
    BlockId.configure({ updateDocument: false }),
    BlockRole.configure({ roles: CANONICAL_BLOCK_ROLES }),
    Typography,
  ]
}

export async function createExtensionKit(
  options: ExtensionKitOptions,
  nodeOverrides: ExtensionKitNodeOverrides = {},
): Promise<Extensions> {
  const emojiExtension = await createInteractiveEmojiExtension()
  const collaborationExtensions = options.provider
    ? [
        Collaboration.configure({ document: options.ydoc }),
        CollaborationCaret.configure({
          provider: options.provider,
          user: { id: options.user.id, name: options.user.name, color: options.user.color },
        }),
      ]
    : []

  return [
    StarterKit.configure({
      undoRedo: options.provider ? false : undefined,
      horizontalRule: false,
      dropcursor: { width: 2 },
      link: { openOnClick: false },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ...collaborationExtensions,
    Placeholder.configure({
      placeholder: options.placeholder,
      emptyNodeClass: 'is-empty with-slash',
    }),
    Mention,
    emojiExtension,
    TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } }),
    NodeBackground.configure({
      types: nodeBackgroundTypes,
    }),
    NodeAlignment,
    TextStyle,
    nodeOverrides.mathematics ?? Mathematics,
    Superscript,
    Subscript,
    Indent,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Selection,
    nodeOverrides.image ?? Image,
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: options.onTableOfContentsUpdate,
    }),
    TableHandleExtension,
    ListNormalization,
    TripleClickBlockSelection,
    (nodeOverrides.imageUpload ?? ImageUploadNode).configure({
      accept: 'image/*',
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: options.imageUpload,
      onError: options.onImageUploadError,
    }),
    (nodeOverrides.toc ?? TocNode).configure({ topOffset: 48 }),
    BlockId,
    BlockRole.configure({ roles: options.blockRoles ?? CANONICAL_BLOCK_ROLES }),
    Typography,
    UiState,
  ]
}
