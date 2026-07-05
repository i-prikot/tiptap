<template>
  <template v-if="isImageSelected">
    <ImageAlignButton align="left" />
    <ImageAlignButton align="center" />
    <ImageAlignButton align="right" />
    <Separator />
    <ImageCaptionButton />
    <Separator />
    <ImageDownloadButton />
    <ImageUploadButton :icon="RefreshCcwIcon" tooltip="Replace" />
    <Separator />
    <DeleteNodeButton />
  </template>
</template>

<script setup lang="ts">
// Набор кнопок для выделенного изображения в floating тулбаре
// (порт ImageNodeFloating из чанка 34p294mqk5mqb, модуль 590748).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Separator from '../primitives/Separator.vue'
import ImageAlignButton from './ImageAlignButton.vue'
import ImageCaptionButton from './ImageCaptionButton.vue'
import ImageDownloadButton from './ImageDownloadButton.vue'
import ImageUploadButton from './ImageUploadButton.vue'
import DeleteNodeButton from './DeleteNodeButton.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useEditorSelectionSignal } from '../../composables/useEditorSelectionSignal'
import { isNodeTypeSelected } from '../../utils/tiptap-utils'
import { RefreshCcwIcon } from '../../icons'

const props = defineProps<{ editor?: Editor | null }>()

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)

const isImageSelected = computed(
  () => (signal.value, !!editor.value && isNodeTypeSelected(editor.value, ['image'])),
)
</script>
