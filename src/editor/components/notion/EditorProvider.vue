<template>
  <div v-if="editor" class="notion-like-editor-wrapper">
    <NotionEditorHeader v-if="props.features.header" />
    <div class="notion-like-editor-layout">
      <EditorContentArea :features="props.features" />
      <TocSidebar v-if="props.features.tocSidebar" :top-offset="48" />
    </div>
    <template v-if="props.features.tableControls">
      <TableExtendRowColumnButtons />
      <TableHandle />
      <TableSelectionOverlay :show-resize-handles="true" />
    </template>
    <CtaPopup v-if="props.features.ctaPopup" />
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
import type { Editor, JSONContent } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
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
import { CANCEL_PENDING_UPDATE_META } from './editor-lifecycle-signals'

import NotionEditorHeader from './NotionEditorHeader.vue'
import EditorContentArea from './EditorContentArea.vue'
import TocSidebar from './TocSidebar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import CtaPopup from './CtaPopup.vue'
import TableHandle from '../table/TableHandle.vue'
import TableSelectionOverlay from '../table/TableSelectionOverlay.vue'
import TableExtendRowColumnButtons from '../table/TableExtendRowColumnButtons.vue'
import {
  EDITOR_UPDATE_DEBOUNCE_MS,
  defaultEditorFeatureFlags,
  type EditorFeatureFlags,
  type ImageUploadAdapter,
  type NotionEditorReadyPayload,
  type NotionEditorUpdatePayload,
} from './public-api'

const props = withDefaults(
  defineProps<{
    provider?: TiptapCollabProvider | null
    ydoc: Y.Doc
    content?: JSONContent
    placeholder?: string
    features?: EditorFeatureFlags
    imageUpload?: ImageUploadAdapter
    aiToken?: string | null
  }>(),
  {
    provider: null,
    placeholder: 'Start writing...',
    features: () => ({ ...defaultEditorFeatureFlags }),
    aiToken: null,
  },
)

const emit = defineEmits<{
  ready: [editor: NotionEditorReadyPayload]
  update: [payload: NotionEditorUpdatePayload]
}>()

const { user } = useUser()
const { setTocContent } = useToc()

/**
 * Первичное наполнение документа: если документ пуст и пользователь ещё
 * не взаимодействовал с ним (localStorage hasInteracted-<docId>) —
 * вставить дефолтный контент без записи в history.
 */
function debugEditor(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[EditorProvider] ${event}`, details)
  }
}

function hasEqualContent(left: JSONContent, right: JSONContent) {
  return JSON.stringify(left) === JSON.stringify(right)
}

let isApplyingExternalContent = false
let isTearingDown = false
let hasEmittedReady = false
let updateTimer: ReturnType<typeof setTimeout> | undefined
let scheduledUpdateCount = 0
let emittedUpdateCount = 0
let lifecycleUpdateListener: (() => void) | undefined
let interactionUpdateListener: (() => void) | undefined
let pendingUpdateCancellationListener: ((payload: { transaction: Transaction }) => void) | undefined
let collabSyncedListener: (() => void) | undefined

function applyExternalContent(editorInstance: Editor, content: JSONContent) {
  if (hasEqualContent(editorInstance.getJSON(), content)) {
    debugEditor('content-sync', { result: 'skipped-equal' })
    return false
  }

  isApplyingExternalContent = true
  try {
    cancelScheduledUpdate('content-sync')
    editorInstance.commands.setContent(content, { emitUpdate: false })
    debugEditor('content-sync', { result: 'applied' })
    return true
  } catch {
    console.error('[EditorProvider] content synchronization failed')
    return false
  } finally {
    isApplyingExternalContent = false
  }
}

const uploadImage: ImageUploadAdapter = async (file, onProgress, abortSignal) => {
  const imageUploadAdapter = props.imageUpload
  return (imageUploadAdapter ?? handleImageUpload)(file, onProgress, abortSignal)
}

function cancelScheduledUpdate(
  reason: 'content-sync' | 'imperative-silent-content' | 'teardown' | 'unready',
) {
  if (!updateTimer) return
  clearTimeout(updateTimer)
  updateTimer = undefined
  debugEditor('update-cancelled', { reason, scheduledUpdateCount, emittedUpdateCount })
}

function flushUpdate(editorInstance: Editor) {
  updateTimer = undefined

  if (isTearingDown || editorInstance.isDestroyed) {
    debugEditor('update-cancelled', {
      reason: 'unready',
      scheduledUpdateCount,
      emittedUpdateCount,
    })
    return
  }

  try {
    emit('update', { json: editorInstance.getJSON(), html: editorInstance.getHTML() })
    emittedUpdateCount += 1
    debugEditor('update-flushed', {
      debounceMs: EDITOR_UPDATE_DEBOUNCE_MS,
      scheduledUpdateCount,
      emittedUpdateCount,
    })
  } catch {
    console.error('[EditorProvider] document update serialization failed')
  }
}

function scheduleUpdate(editorInstance: Editor) {
  if (isTearingDown || isApplyingExternalContent) {
    debugEditor('update-cancelled', {
      reason: 'unready',
      scheduledUpdateCount,
      emittedUpdateCount,
    })
    return
  }

  if (updateTimer) clearTimeout(updateTimer)
  scheduledUpdateCount += 1
  debugEditor('update-scheduled', {
    debounceMs: EDITOR_UPDATE_DEBOUNCE_MS,
    scheduledUpdateCount,
    emittedUpdateCount,
  })
  updateTimer = setTimeout(() => flushUpdate(editorInstance), EDITOR_UPDATE_DEBOUNCE_MS)
}

function emitReady(editorInstance: Editor) {
  if (isTearingDown || hasEmittedReady) return

  lifecycleUpdateListener = () => scheduleUpdate(editorInstance)
  editorInstance.on('update', lifecycleUpdateListener)
  pendingUpdateCancellationListener = ({ transaction }) => {
    if (transaction.getMeta(CANCEL_PENDING_UPDATE_META) === true) {
      cancelScheduledUpdate('imperative-silent-content')
    }
  }
  editorInstance.on('transaction', pendingUpdateCancellationListener)
  hasEmittedReady = true
  emit('ready', editorInstance)
  debugEditor('ready', { debounceMs: EDITOR_UPDATE_DEBOUNCE_MS })
  debugEditor('features-resolved', { ...props.features })
}

function initializeContent(editorInstance: Editor, onInitialized: () => void) {
  const documentId = getDocumentId()
  const storageKey = `hasInteracted-${documentId}`
  const hasInteracted = localStorage.getItem(storageKey) === 'true'

  const insertIfEmpty = () => {
    if (props.content !== undefined) {
      applyExternalContent(editorInstance, props.content)
      debugEditor('initial-content', { source: 'consumer-content' })
      return
    }

    if (editorInstance.isEmpty && defaultContent && !hasInteracted) {
      editorInstance.chain().setMeta('addToHistory', false).setContent(defaultContent).run()
      editorInstance.chain().focus('start', { scrollIntoView: true }).run()
      debugEditor('initial-content', { source: 'default-content' })
      return
    }

    debugEditor('initial-content', { source: props.provider ? 'collaboration' : 'default-content' })
  }

  if (props.provider && !props.provider.isSynced) {
    collabSyncedListener = () => {
      props.provider?.off('synced', collabSyncedListener)
      collabSyncedListener = undefined
      setTimeout(() => {
        if (isTearingDown) return
        insertIfEmpty()
        onInitialized()
      }, 0)
    }
    props.provider.on('synced', collabSyncedListener)
  } else {
    insertIfEmpty()
    onInitialized()
  }

  interactionUpdateListener = () => {
    if (!isApplyingExternalContent && !editorInstance.isEmpty && !hasInteracted) {
      localStorage.setItem(storageKey, 'true')
    }
  }
  editorInstance.on('update', interactionUpdateListener)
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
    initializeContent(editorInstance, () => {
      emitReady(editorInstance)
    })
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
      placeholder: () => props.placeholder,
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
      upload: uploadImage,
      onError: () => console.error('[EditorProvider] image upload failed'),
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

watch(
  () => props.content,
  (content) => {
    if (content === undefined) return
    const editorInstance = editor.value
    if (!editorInstance) {
      debugEditor('content-sync', { result: 'skipped-unready' })
      return
    }
    applyExternalContent(editorInstance, content)
  },
)

watch(
  () => props.placeholder,
  () => {
    const editorInstance = editor.value
    if (!editorInstance || editorInstance.isDestroyed) {
      debugEditor('placeholder-refresh', { result: 'skipped-unready' })
      return
    }

    editorInstance.view.dispatch(
      editorInstance.state.tr
        .setSelection(editorInstance.state.selection)
        .setMeta('addToHistory', false)
        .setMeta('notion-editor:placeholder-refresh', true),
    )
    debugEditor('placeholder-refresh', { result: 'applied' })
  },
)

provideTiptapEditor(editor)

// сбрасываем TOC при уничтожении редактора
watch(editor, (instance) => {
  if (!instance) setTocContent(null)
})

onBeforeUnmount(() => {
  isTearingDown = true
  cancelScheduledUpdate('teardown')
  const editorInstance = editor.value
  if (editorInstance && lifecycleUpdateListener) {
    editorInstance.off('update', lifecycleUpdateListener)
  }
  if (editorInstance && interactionUpdateListener) {
    editorInstance.off('update', interactionUpdateListener)
  }
  if (editorInstance && pendingUpdateCancellationListener) {
    editorInstance.off('transaction', pendingUpdateCancellationListener)
  }
  if (collabSyncedListener) props.provider?.off('synced', collabSyncedListener)
  debugEditor('teardown', { scheduledUpdateCount, emittedUpdateCount })
  editor.value?.destroy()
})
</script>
