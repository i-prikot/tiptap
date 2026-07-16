<template>
  <div v-if="editor" class="notion-like-editor-wrapper">
    <div class="notion-like-editor-layout">
      <EditorContentArea :features="props.features" />
      <TocSidebar
        v-if="props.features.tocSidebar"
        :sticky-top-offset="props.tocSidebarStickyTopOffset"
      />
    </div>
    <div ref="overlayTarget" data-tiptap-overlay-root=""></div>
    <template v-if="props.features.tableControls">
      <TableExtendRowColumnButtons />
      <TableHandle />
      <TableSelectionOverlay :show-resize-handles="true" />
    </template>
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
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import type { Editor, JSONContent } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import type { TiptapCollabProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'
import { createExtensionKit } from '../../extensions/extension-kit'
import {
  useUser,
  useToc,
  provideTiptapEditor,
  provideEditorOverlayTarget,
} from '@/editor/composables'

import { CANCEL_PENDING_UPDATE_META } from './editor-lifecycle-signals'

import EditorContentArea from './EditorContentArea.vue'
import TocSidebar from './TocSidebar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
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
    documentId: string
    ydoc: Y.Doc
    content?: JSONContent
    placeholder?: string
    features?: EditorFeatureFlags
    tocSidebarStickyTopOffset?: number
    imageUpload?: ImageUploadAdapter
    aiToken?: string | null
    developmentDiagnostics?: boolean
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

const overlayTarget = shallowRef<HTMLElement | null>(null)
provideEditorOverlayTarget(overlayTarget)

const { user } = useUser()
const { setTocContent } = useToc()

function debugEditor(event: string, details: Record<string, unknown> = {}) {
  if (props.developmentDiagnostics) {
    // eslint-disable-next-line no-console
    console.debug(`[EditorProvider] ${event}`, details)
  }
}

const uploadImage: ImageUploadAdapter = (file, callbacks) => {
  const imageUploadAdapter = props.imageUpload
  if (!imageUploadAdapter) {
    return Promise.reject(new Error('image upload adapter is not configured'))
  }
  return imageUploadAdapter(file, callbacks)
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
  const applyHostContent = () => {
    if (props.content !== undefined) {
      applyExternalContent(editorInstance, props.content)
    }
  }

  if (props.provider && !props.provider.isSynced) {
    collabSyncedListener = () => {
      props.provider?.off('synced', collabSyncedListener)
      collabSyncedListener = undefined
      setTimeout(() => {
        if (isTearingDown) return
        applyHostContent()
        onInitialized()
      }, 0)
    }
    props.provider.on('synced', collabSyncedListener)
  } else {
    applyHostContent()
    onInitialized()
  }
}

debugEditor('image-upload-config', { configured: Boolean(props.imageUpload) })

const editor = useEditor({
  editorProps: {
    attributes: { class: 'notion-like-editor' },
  },
  onCreate: ({ editor: editorInstance }) => {
    initializeContent(editorInstance, () => {
      emitReady(editorInstance)
    })
  },
  extensions: createExtensionKit({
    provider: props.provider,
    ydoc: props.ydoc,
    placeholder: () => props.placeholder,
    user,
    features: props.features,
    imageUpload: uploadImage,
    onImageUploadError: () => console.error('[EditorProvider] image upload failed'),
    onTableOfContentsUpdate: setTocContent,
  }),
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
  if (editorInstance && pendingUpdateCancellationListener) {
    editorInstance.off('transaction', pendingUpdateCancellationListener)
  }
  if (collabSyncedListener) props.provider?.off('synced', collabSyncedListener)
  debugEditor('teardown', { scheduledUpdateCount, emittedUpdateCount })
  editor.value?.destroy()
})
</script>
