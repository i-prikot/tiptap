<template>
  <template v-if="isImageSelected">
    <ImageAlignButton :editor="editor" align="left" />
    <ImageAlignButton :editor="editor" align="center" />
    <ImageAlignButton :editor="editor" align="right" />
    <Separator />
    <ImageCaptionButton :editor="editor" />
    <Separator />
    <ImageDownloadButton :editor="editor" />
    <ImageUploadButton :editor="editor" :icon="RefreshCcwIcon" :tooltip="t('image.replace')" />
    <Separator />
    <DeleteNodeButton :editor="editor" />
  </template>
</template>

<script setup lang="ts">
// Набор кнопок для выделенного изображения в floating тулбаре
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Separator } from '../../primitives'
import ImageAlignButton from './ImageAlignButton.vue'
import ImageCaptionButton from './ImageCaptionButton.vue'
import ImageDownloadButton from './ImageDownloadButton.vue'
import ImageUploadButton from './ImageUploadButton.vue'
import { DeleteNodeButton } from '../formatting'
import { useEditorI18n, useTiptapEditor, useEditorSelectionSignal } from '../../../composables'

import { isNodeTypeSelected } from '../../../utils/tiptap-utils'
import { RefreshCcwIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const signal = useEditorSelectionSignal(editor)

const isImageSelected = computed(
  () => (signal.value, !!editor.value && isNodeTypeSelected(editor.value, ['image'])),
)
</script>
