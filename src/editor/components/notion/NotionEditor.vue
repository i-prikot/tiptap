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
 * User → Collab(documentId) → Ai → Toc, затем контент.
 * Порт NotionEditor из чанка 3xpmbr0kqzhen (React-провайдеры заменены
 * на provide/inject через composables).
 */
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { Editor, JSONContent } from '@tiptap/core'
import {
  provideUser,
  provideCollab,
  provideAi,
  provideToc,
  provideAnchorNavigation,
} from '@/editor/composables'

import NotionEditorContent from './NotionEditorContent.vue'
import { cancelPendingUpdate } from './editor-lifecycle-signals'
import {
  defaultEditorFeatureFlags,
  type EditorFeatureFlags,
  type NotionEditorAnchorId,
  type NotionEditorExpose,
  type NotionEditorProps,
  type NotionEditorReadyPayload,
  type NotionEditorSetContentOptions,
  type NotionEditorUpdatePayload,
} from './public-api'

const props = withDefaults(defineProps<NotionEditorProps>(), {
  placeholder: 'Start writing...',
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
}>()

const editorRef = shallowRef<Editor | null>(null)

function debugEditor(event: string, details: Record<string, unknown> = {}) {
  if (props.developmentDiagnostics) {
    // eslint-disable-next-line no-console
    console.debug(`[NotionEditor] ${event}`, details)
  }
}

function handleReady(editor: Editor) {
  editorRef.value = editor
  emit('ready', editor)
  debugEditor('ready')
}

function getJSON(): JSONContent | null {
  const editor = editorRef.value
  if (!editor) {
    debugEditor('get-json-unavailable')
    return null
  }
  return editor.getJSON()
}

function getHTML(): string | null {
  const editor = editorRef.value
  if (!editor) {
    debugEditor('get-html-unavailable')
    return null
  }
  return editor.getHTML()
}

function focus(): boolean {
  const editor = editorRef.value
  if (!editor) {
    debugEditor('focus-unavailable')
    return false
  }
  debugEditor('focus')
  return editor.commands.focus()
}

function setContent(
  content: JSONContent,
  { emitUpdate = true }: NotionEditorSetContentOptions = {},
): boolean {
  const editor = editorRef.value
  if (!editor) {
    debugEditor('set-content-unavailable')
    return false
  }

  try {
    if (!emitUpdate) cancelPendingUpdate(editor)
    const updated = editor.commands.setContent(content, { emitUpdate })
    debugEditor('set-content', { emitUpdate })
    return updated
  } catch {
    console.error('[NotionEditor] imperative content update failed')
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

provideUser(props.identityStorage)
debugEditor('identity-persistence', { mode: identityPersistenceMode })
provideCollab(props.documentId, props.collaboration)
watch(
  () => resolvedFeatures.value.ai,
  (enabled) => {
    debugEditor('ai-configuration', {
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
  debugEditor('teardown')
})
</script>
