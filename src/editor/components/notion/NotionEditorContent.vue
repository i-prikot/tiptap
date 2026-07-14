<template>
  <SetupError
    v-if="collabSetupError || aiSetupError"
    :collab-setup-error="collabSetupError"
    :ai-setup-error="aiSetupError"
  />
  <EditorProvider
    v-else-if="ready"
    :provider="provider"
    :ydoc="ydoc"
    :content="props.content"
    :placeholder="props.placeholder"
    :features="props.features"
    :image-upload="props.imageUpload"
    :ai-token="aiToken"
    @ready="emit('ready', $event)"
    @update="emit('update', $event)"
  />
  <LoadingSpinner v-else />
</template>

<script setup lang="ts">
/**
 * Гейт готовности: ошибка настройки Cloud → SetupError; ожидание
 * provider/токена → спиннер; иначе — редактор.
 * Порт NotionEditorContent из чанка 3xpmbr0kqzhen. В отличие от
 * оригинала, при не сконфигурированных Cloud-сервисах (hasCollab/hasAi
 * = false) редактор запускается сразу в локальном режиме.
 */
import { computed } from 'vue'
import { useCollab } from '../../composables/useCollab'
import { useAi } from '../../composables/useAi'
import type { JSONContent } from '@tiptap/core'
import EditorProvider from './EditorProvider.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import SetupError from './SetupError.vue'
import type {
  EditorFeatureFlags,
  ImageUploadAdapter,
  NotionEditorReadyPayload,
  NotionEditorUpdatePayload,
} from './public-api'

const props = withDefaults(
  defineProps<{
    content?: JSONContent
    placeholder?: string
    features: EditorFeatureFlags
    imageUpload?: ImageUploadAdapter
  }>(),
  { placeholder: 'Start writing...' },
)

const emit = defineEmits<{
  ready: [editor: NotionEditorReadyPayload]
  update: [payload: NotionEditorUpdatePayload]
}>()

const { hasCollab, provider: providerRef, ydoc, setupError: collabError } = useCollab()
const { hasAi, aiToken: aiTokenRef, setupError: aiError } = useAi()

const collabSetupError = computed(() => collabError.value)
const aiSetupError = computed(() => aiError.value)

const provider = computed(() => providerRef.value)
const aiToken = computed(() => aiTokenRef.value)

const ready = computed(() => {
  if (hasCollab.value && !provider.value) return false
  if (hasAi.value && !aiToken.value) return false
  return true
})
</script>
