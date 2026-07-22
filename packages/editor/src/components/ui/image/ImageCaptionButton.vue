<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :data-active-state="isActive ? 'on' : 'off'"
    :disabled="!canToggle"
    :data-disabled="!canToggle"
    aria-label="Caption"
    tooltip="Caption"
    @click="handleClick"
  >
    <slot>
      <ImageCaptionIcon class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button } from '../../primitives'
import { useImageCaption, useTiptapEditor } from '../../../composables'
import { ImageCaptionIcon } from '../../../icons'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    text?: string
    hideWhenUnavailable?: boolean
  }>(),
  { hideWhenUnavailable: false },
)

const emit = defineEmits<{ set: [] }>()
const editor = useTiptapEditor(computed(() => props.editor))
const { canToggle, isActive, isVisible, execute } = useImageCaption(
  editor,
  computed(() => props.hideWhenUnavailable),
)

function handleClick() {
  if (execute()) emit('set')
}
</script>
