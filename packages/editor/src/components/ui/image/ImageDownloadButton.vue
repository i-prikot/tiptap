<template>
  <Button
    v-if="download.canDownload.value"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :aria-label="download.label"
    :tooltip="download.label"
    @click="download.handleDownload"
  >
    <slot>
      <component :is="download.Icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка скачивания изображения (порт ImageDownloadButton из чанка 34p294mqk5mqb).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button } from '../../primitives'
import { useTiptapEditor, useImageDownload } from '../../../composables'

const props = defineProps<{ editor?: Editor | null; text?: string }>()

const editor = useTiptapEditor(computed(() => props.editor))
const download = useImageDownload(editor)
</script>
