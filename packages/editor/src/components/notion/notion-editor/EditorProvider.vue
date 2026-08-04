<template>
  <div v-if="editor" class="notion-like-editor-wrapper">
    <div class="notion-like-editor-layout">
      <EditorContentArea :features="props.features" :block-roles="initialBlockRoles" />
      <TocSidebar
        v-if="props.features.tocSidebar"
        :sticky-top-offset="props.tocSidebarStickyTopOffset"
      />
    </div>
    <div ref="overlayTarget" data-tiptap-overlay-root=""></div>
    <TableOverlays v-if="props.features.tableControls" />
  </div>
  <LoadingSpinner v-else />
</template>

<script setup lang="ts">
/**
 * Создание редактора со всем набором расширений и предоставление его
 * дереву компонентов.
 *
 * Отличия от оригинала (см. docs/ARCHITECTURE.md §8):
 * - Collaboration/CollaborationCaret подключаются только при наличии
 *   provider (Tiptap Cloud); без него включается локальный undo/redo;
 * - расширение Ai (Tiptap Pro) недоступно в порте — AI-элементы UI
 *   скрываются штатной проверкой isExtensionAvailable.
 */
import { createLogger } from '@i-prikot/editor-schema'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { Editor as TiptapEditor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'
import type { BlockRoleOption } from '@i-prikot/editor-schema'
import type { TiptapCollabProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'
import { createExtensionKit } from '../../../extensions/extension-kit'
import {
  useUser,
  useToc,
  useEditorI18n,
  provideTiptapEditor,
  provideEditorOverlayTarget,
} from '../../../composables'
import { createDevelopmentDiagnostics } from '../../../utils/development-diagnostics'
import EditorContentArea from './EditorContentArea.vue'
import { TocSidebar } from '../toc'
import { LoadingSpinner } from '../feedback'
import TableOverlays from '../../table/table-overlays/TableOverlays.vue'
import {
  defaultEditorFeatureFlags,
  type EditorFeatureFlags,
  type ImageUploadAdapter,
  type NotionEditorReadyPayload,
  type NotionEditorUpdatePayload,
} from './public-api'
import { useEditorLifecycle } from './useEditorLifecycle'

const logger = createLogger('EditorProvider')

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
    blockRoles?: readonly BlockRoleOption[]
    aiToken?: string | null
    developmentDiagnostics?: boolean
  }>(),
  {
    provider: null,
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
const { t } = useEditorI18n()
const resolvedPlaceholder = computed(() => props.placeholder ?? t('editor.placeholder'))
const diagnostics = createDevelopmentDiagnostics('EditorProvider', {
  isEnabled: () => props.developmentDiagnostics === true,
})
const lifecycle = useEditorLifecycle({
  diagnostics,
  getContent: () => props.content,
  getFeatures: () => props.features,
  getProvider: () => props.provider,
  onReady: (editor) => emit('ready', editor),
  onUpdate: (payload) => emit('update', payload),
  onContentSyncError: () => logger.error('content synchronization failed'),
  onSerializationError: () => logger.error('document update serialization failed'),
})

const uploadImage: ImageUploadAdapter = (file, callbacks) => {
  const imageUploadAdapter = props.imageUpload
  if (!imageUploadAdapter) {
    return Promise.reject(new Error('image upload adapter is not configured'))
  }
  return imageUploadAdapter(file, callbacks)
}

diagnostics.debug('image-upload-config', { configured: Boolean(props.imageUpload) })

const editor = shallowRef<TiptapEditor>()
const initialBlockRoles = props.blockRoles?.map((role) => ({ ...role }))
let hasStartedEditorInitialization = false

function initializeEditor() {
  if (hasStartedEditorInitialization) {
    diagnostics.error('editor-initialization', { result: 'skipped-duplicate' })
    return
  }

  hasStartedEditorInitialization = true
  diagnostics.debug('emoji-load', { result: 'started' })
  void createExtensionKit({
    provider: props.provider,
    ydoc: props.ydoc,
    placeholder: () => resolvedPlaceholder.value,
    user,
    features: props.features,
    imageUpload: uploadImage,
    blockRoles: initialBlockRoles?.map((role) => role.value),
    onImageUploadError: () => logger.error('image upload failed'),
    onTableOfContentsUpdate: setTocContent,
  })
    .then((extensions) => {
      if (lifecycle.isTearingDown) {
        diagnostics.debug('emoji-load', { result: 'skipped-teardown' })
        return
      }

      diagnostics.debug('emoji-load', { result: 'completed' })
      const editorInstance = new TiptapEditor({
        editorProps: { attributes: { class: 'notion-like-editor' } },
        onCreate: ({ editor: createdEditor }) => {
          const initializedEditor = createdEditor as TiptapEditor
          lifecycle.initializeContent(initializedEditor, () =>
            lifecycle.emitReady(initializedEditor),
          )
        },
        extensions,
      })

      if (lifecycle.isTearingDown) {
        editorInstance.destroy()
        diagnostics.debug('editor-initialization', { result: 'destroyed-during-teardown' })
        return
      }

      editor.value = editorInstance
      diagnostics.debug('editor-initialization', { result: 'completed' })
    })
    .catch((error: unknown) => {
      if (lifecycle.isTearingDown) {
        diagnostics.debug('emoji-load', { result: 'failed-during-teardown' })
        return
      }

      diagnostics.error('emoji-load', {
        result: 'failed',
        failureType: error instanceof Error ? error.name : 'unknown',
      })
    })
}

initializeEditor()

watch(
  () => props.content,
  (content) => {
    if (content === undefined) return
    const editorInstance = editor.value
    if (!editorInstance) {
      diagnostics.debug('content-sync', { result: 'skipped-unready' })
      return
    }
    lifecycle.applyExternalContent(editorInstance, content)
  },
)

watch(resolvedPlaceholder, () => {
  const editorInstance = editor.value
  if (!editorInstance || editorInstance.isDestroyed) {
    diagnostics.debug('placeholder-refresh', { result: 'skipped-unready' })
    return
  }

  editorInstance.view.dispatch(
    editorInstance.state.tr
      .setSelection(editorInstance.state.selection)
      .setMeta('addToHistory', false)
      .setMeta('notion-editor:placeholder-refresh', true),
  )
  diagnostics.debug('placeholder-refresh', { result: 'applied' })
})

provideTiptapEditor(editor)

watch(editor, (instance) => {
  if (!instance) setTocContent(null)
})

onBeforeUnmount(() => lifecycle.teardown(editor.value))
</script>
