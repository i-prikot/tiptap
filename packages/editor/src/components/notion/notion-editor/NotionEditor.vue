<template>
  <NotionEditorContent
    :content="props.content"
    :document-id="props.documentId"
    :placeholder="props.placeholder"
    :features="resolvedFeatures"
    :toc-sidebar-sticky-top-offset="props.tocSidebarStickyTopOffset"
    :image-upload="props.imageUpload"
    :development-diagnostics="props.developmentDiagnostics"
    @ready="handleReady"
    @update="emit('update', $event)"
  />
</template>

<script setup lang="ts">
/**
 * Корень Notion-like редактора: цепочка провайдеров
 * EditorI18n → User → Collab(documentId) → Ai → Toc, затем контент.
 * React-провайдеры заменены на provide/inject через composables.
 */
import { createLogger } from '@i-prikot/editor-schema'
import { computed, onBeforeUnmount, shallowRef, toRef, watch } from 'vue'
import type { Editor, JSONContent } from '@tiptap/core'
import {
  provideUser,
  provideCollab,
  provideAi,
  provideToc,
  provideAnchorNavigation,
  provideEditorI18n,
  provideEditorOperationError,
} from '../../../composables'
import { createDevelopmentDiagnostics } from '../../../utils/development-diagnostics'

import NotionEditorContent from './NotionEditorContent.vue'
import { cancelPendingUpdate } from './editor-lifecycle-signals'
import {
  defaultEditorFeatureFlags,
  type EditorFeatureFlags,
  type NotionEditorAnchorId,
  type NotionEditorExpose,
  type NotionEditorOperationErrorPayload,
  type NotionEditorProps,
  type NotionEditorReadyPayload,
  type NotionEditorSetContentOptions,
  type NotionEditorUpdatePayload,
} from './public-api'

const logger = createLogger('NotionEditor')

const props = withDefaults(defineProps<NotionEditorProps>(), {
  tocSidebarStickyTopOffset: 0,
})

const resolvedFeatures = computed<EditorFeatureFlags>(() => ({
  ...defaultEditorFeatureFlags,
  ...props.features,
}))

const emit = defineEmits<{
  ready: [editor: NotionEditorReadyPayload]
  update: [payload: NotionEditorUpdatePayload]
  'anchor-change': [anchor: NotionEditorAnchorId]
  'operation-error': [payload: NotionEditorOperationErrorPayload]
}>()

const editorRef = shallowRef<Editor | null>(null)

const diagnostics = createDevelopmentDiagnostics('NotionEditor', {
  isEnabled: () => props.developmentDiagnostics === true,
})

function handleReady(editor: Editor) {
  editorRef.value = editor
  emit('ready', editor)
  diagnostics.debug('ready', {})
}

function getJSON(): JSONContent | null {
  const editor = editorRef.value
  if (!editor) {
    diagnostics.debug('get-json-unavailable', {})
    return null
  }
  return editor.getJSON()
}

function getHTML(): string | null {
  const editor = editorRef.value
  if (!editor) {
    diagnostics.debug('get-html-unavailable', {})
    return null
  }
  return editor.getHTML()
}

function focus(): boolean {
  const editor = editorRef.value
  if (!editor) {
    diagnostics.debug('focus-unavailable', {})
    return false
  }
  diagnostics.debug('focus', {})
  return editor.commands.focus()
}

function setContent(
  content: JSONContent,
  { emitUpdate = true }: NotionEditorSetContentOptions = {},
): boolean {
  const editor = editorRef.value
  if (!editor) {
    diagnostics.debug('set-content-unavailable', {})
    return false
  }

  try {
    if (!emitUpdate) cancelPendingUpdate(editor)
    const updated = editor.commands.setContent(content, { emitUpdate })
    diagnostics.debug('set-content', { emitUpdate })
    return updated
  } catch {
    logger.error('imperative content update failed')
    return false
  }
}

defineExpose<NotionEditorExpose>({
  get editor() {
    return editorRef.value
  },
  getJSON,
  getHTML,
  focus,
  setContent,
})

const identityPersistenceMode =
  props.identityStorage === false ? 'disabled' : props.identityStorage ? 'custom' : 'default'

provideEditorI18n(
  toRef(props, 'locale'),
  toRef(props, 'messages'),
  computed(() => props.developmentDiagnostics === true),
)
provideEditorOperationError(
  (payload) => emit('operation-error', payload),
  computed(() => props.developmentDiagnostics === true),
)
provideUser(props.identityStorage)
diagnostics.debug('identity-persistence', { mode: identityPersistenceMode })
provideCollab(props.documentId, props.collaboration)
watch(
  () => resolvedFeatures.value.ai,
  (enabled) => {
    diagnostics.debug('ai-configuration', {
      enabled,
      configured: Boolean(props.ai?.appId),
    })
  },
  { immediate: true },
)
provideAi(props.ai, () => resolvedFeatures.value.ai)
const anchorNavigation = provideAnchorNavigation(
  computed(() => props.baseUrl),
  computed(() => props.currentAnchor),
  (anchor) => emit('anchor-change', anchor),
)
provideToc(anchorNavigation)

onBeforeUnmount(() => {
  editorRef.value = null
  diagnostics.debug('teardown', {})
})
</script>
