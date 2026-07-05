<template>
  <SetupError v-if="collabSetupError || aiSetupError" :collab-setup-error="collabSetupError" :ai-setup-error="aiSetupError" />
  <EditorProvider
    v-else-if="ready"
    :provider="provider"
    :ydoc="ydoc"
    :placeholder="placeholder"
    :ai-token="aiToken"
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
import EditorProvider from './EditorProvider.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import SetupError from './SetupError.vue'

withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Start writing...' })

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
