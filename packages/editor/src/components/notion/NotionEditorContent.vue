<template>
  <EditorProvider
    v-if="ready"
    :provider="provider"
    :ydoc="ydoc"
    :content="props.content"
    :document-id="props.documentId"
    :placeholder="props.placeholder"
    :features="props.features"
    :toc-sidebar-sticky-top-offset="props.tocSidebarStickyTopOffset"
    :image-upload="props.imageUpload"
    :ai-token="aiToken"
    :development-diagnostics="props.developmentDiagnostics"
    @ready="emit('ready', $event)"
    @update="emit('update', $event)"
  />
  <LoadingSpinner v-else />
</template>

<script setup lang="ts">
/**
 * Гейт готовности ожидает только активные Cloud-сервисы. При ошибке
 * получения токена composables отключают соответствующий сервис, и
 * редактор запускается в локальном режиме.
 * Порт NotionEditorContent из чанка 3xpmbr0kqzhen. В отличие от
 * оригинала, при не сконфигурированных Cloud-сервисах (hasCollab/hasAi
 * = false) редактор запускается сразу в локальном режиме.
 */
import { computed } from 'vue'
import { useCollab, useAi } from '../../composables'

import type { JSONContent } from '@tiptap/core'
import EditorProvider from './EditorProvider.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import type {
  EditorFeatureFlags,
  ImageUploadAdapter,
  NotionEditorReadyPayload,
  NotionEditorUpdatePayload,
} from './public-api'

const props = withDefaults(
  defineProps<{
    documentId: string
    content?: JSONContent
    placeholder?: string
    features: EditorFeatureFlags
    tocSidebarStickyTopOffset?: number
    imageUpload?: ImageUploadAdapter
    developmentDiagnostics?: boolean
  }>(),
  { placeholder: 'Start writing...' },
)

const emit = defineEmits<{
  ready: [editor: NotionEditorReadyPayload]
  update: [payload: NotionEditorUpdatePayload]
}>()

const { hasCollab, provider: providerRef, ydoc } = useCollab()
const { hasAi, aiToken: aiTokenRef } = useAi()

const provider = computed(() => providerRef.value)
const aiToken = computed(() => aiTokenRef.value)

const ready = computed(() => {
  if (hasCollab.value && !provider.value) return false
  if (hasAi.value && !aiToken.value) return false
  return true
})
</script>
