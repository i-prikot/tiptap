<template>
  <div v-if="editor" class="notion-like-editor-wrapper">
    <NotionEditorHeader />
    <div class="notion-like-editor-layout">
      <EditorContentArea />
      <TocSidebar :top-offset="48" />
    </div>
    <TableExtendRowColumnButtons />
    <TableHandle />
    <TableSelectionOverlay :show-resize-handles="true" />
    <CtaPopup />
  </div>
  <LoadingSpinner v-else />
</template>

<script setup lang="ts">
/**
 * Создание редактора со всем набором расширений и предоставление его
 * дереву компонентов. Порт EditorProvider из чанка 3xpmbr0kqzhen.
 *
 * Отличия от оригинала (см. docs/ARCHITECTURE.md §8):
 * - Collaboration/CollaborationCaret подключаются только при наличии
 *   provider (Tiptap Cloud); без него включается локальный undo/redo;
 * - расширение Ai (Tiptap Pro) недоступно в порте — AI-элементы UI
 *   скрываются штатной проверкой isExtensionAvailable.
 */
import { onBeforeUnmount, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder, Selection } from '@tiptap/extensions'
import { TextAlign } from '@tiptap/extension-text-align'
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Mention } from '@tiptap/extension-mention'
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Highlight } from '@tiptap/extension-highlight'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { UniqueID } from '@tiptap/extension-unique-id'
import { Typography } from '@tiptap/extension-typography'
import type { TiptapCollabProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'

import { HorizontalRule } from '../../extensions/horizontal-rule'
import { Indent } from '../../extensions/indent'
import { ListNormalization } from '../../extensions/list-normalization'
import { TripleClickBlockSelection } from '../../extensions/triple-click-block-selection'
import { NodeBackground } from '../../extensions/node-background'
import { NodeAlignment } from '../../extensions/node-alignment'
import { UiState } from '../../extensions/ui-state'
import { TableKit } from '../../extensions/table-kit'
import { TableHandleExtension } from '../../extensions/table-handle'
import { Image } from '../../nodes/image/image-node'
import { ImageUploadNode } from '../../nodes/image-upload/image-upload-node'
import { TocNode } from '../../nodes/toc/toc-node'
import { defaultContent } from '../../content/default-content'
import { MAX_FILE_SIZE, handleImageUpload } from '../../utils/tiptap-utils'
import { useUser } from '../../composables/useUser'
import { useToc } from '../../composables/useToc'
import { provideTiptapEditor } from '../../composables/useTiptapEditor'
import { getDocumentId } from '../../utils/document-id'

import NotionEditorHeader from './NotionEditorHeader.vue'
import EditorContentArea from './EditorContentArea.vue'
import TocSidebar from './TocSidebar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import CtaPopup from './CtaPopup.vue'
import TableHandle from '../table/TableHandle.vue'
import TableSelectionOverlay from '../table/TableSelectionOverlay.vue'
import TableExtendRowColumnButtons from '../table/TableExtendRowColumnButtons.vue'

const props = withDefaults(
  defineProps<{
    provider?: TiptapCollabProvider | null
    ydoc: Y.Doc
    placeholder?: string
    aiToken?: string | null
  }>(),
  { provider: null, placeholder: 'Start writing...', aiToken: null },
)

const { user } = useUser()
const { setTocContent } = useToc()

/**
 * Первичное наполнение документа: если документ пуст и пользователь ещё
 * не взаимодействовал с ним (localStorage hasInteracted-<docId>) —
 * вставить дефолтный контент без записи в history.
 */
function seedDefaultContent(editorInstance: import('@tiptap/core').Editor) {
  const documentId = getDocumentId()
  const storageKey = `hasInteracted-${documentId}`
  const hasInteracted = localStorage.getItem(storageKey) === 'true'

  const insertIfEmpty = () => {
    if (editorInstance.isEmpty && defaultContent && !hasInteracted) {
      editorInstance.chain().setMeta('addToHistory', false).setContent(defaultContent).run()
      editorInstance.chain().focus('start', { scrollIntoView: true }).run()
    }
  }

  if (props.provider && !props.provider.isSynced) {
    props.provider.on('synced', () => {
      setTimeout(insertIfEmpty, 0)
    })
  } else {
    insertIfEmpty()
  }

  editorInstance.on('update', () => {
    if (!editorInstance.isEmpty && !hasInteracted) localStorage.setItem(storageKey, 'true')
  })
}

const collabExtensions = props.provider
  ? [
      Collaboration.configure({ document: props.ydoc }),
      CollaborationCaret.configure({
        provider: props.provider,
        user: { id: user.id, name: user.name, color: user.color },
      }),
    ]
  : []

const editor = useEditor({
  editorProps: {
    attributes: { class: 'notion-like-editor' },
  },
  onCreate: ({ editor: editorInstance }) => {
    seedDefaultContent(editorInstance)
  },
  extensions: [
    StarterKit.configure({
      // при коллаборации история управляется yjs
      undoRedo: props.provider ? false : undefined,
      horizontalRule: false,
      dropcursor: { width: 2 },
      link: { openOnClick: false },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ...collabExtensions,
    Placeholder.configure({
      placeholder: props.placeholder,
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
    Image,
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate(content) {
        setTocContent(content)
      },
    }),
    TableHandleExtension,
    ListNormalization,
    TripleClickBlockSelection,
    ImageUploadNode.configure({
      accept: 'image/*',
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error) => console.error('Upload failed:', error),
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
    TocNode.configure({ topOffset: 48 }),
  ],
})

provideTiptapEditor(editor)

// сбрасываем TOC при уничтожении редактора
watch(editor, (instance) => {
  if (!instance) setTocContent(null)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>
