import type { Extensions } from '@tiptap/core'
import type * as Y from 'yjs'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder, Selection } from '@tiptap/extensions'
import { TextAlign } from '@tiptap/extension-text-align'
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
import {
  CollaborationCaret,
  type CollaborationCaretOptions,
} from '@tiptap/extension-collaboration-caret'
import { Mention } from '@tiptap/extension-mention'
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Highlight } from '@tiptap/extension-highlight'
import {
  TableOfContents,
  getHierarchicalIndexes,
  type TableOfContentData,
} from '@tiptap/extension-table-of-contents'
import { UniqueID } from '@tiptap/extension-unique-id'
import { Typography } from '@tiptap/extension-typography'

import { HorizontalRule } from './horizontal-rule.js'
import { Indent } from './indent.js'
import { ListNormalization } from './list-normalization.js'
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
  onImageUploadError: (error: Error) => void
  onTableOfContentsUpdate: (content: TableOfContentData) => void
}

export function createExtensionKit(
  options: ExtensionKitOptions,
  nodeOverrides: ExtensionKitNodeOverrides = {},
): Extensions {
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
    Emoji.configure({
      emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes('regional')),
      forceFallbackImages: true,
    }),
    TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } }),
    NodeBackground.configure({
      types: [
        'paragraph',
        'heading',
        'blockquote',
        'taskList',
        'bulletList',
        'orderedList',
        'tableCell',
        'tableHeader',
        'tocNode',
      ],
    }),
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
    UniqueID.configure({
      types: [
        'table',
        'paragraph',
        'bulletList',
        'orderedList',
        'taskList',
        'heading',
        'blockquote',
        'codeBlock',
        'tocNode',
      ],
      filterTransaction: (transaction) => !isChangeOrigin(transaction),
    }),
    Typography,
    UiState,
    (nodeOverrides.toc ?? TocNode).configure({ topOffset: 48 }),
  ]
}
