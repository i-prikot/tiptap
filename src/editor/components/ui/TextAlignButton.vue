<template>
  <Button
    v-if="alignApi.isVisible.value"
    type="button"
    variant="ghost"
    :disabled="!alignApi.canAlign.value"
    :data-active-state="alignApi.isActive.value ? 'on' : 'off'"
    :data-disabled="!alignApi.canAlign.value"
    role="button"
    :tabindex="-1"
    :aria-label="alignApi.label"
    :aria-pressed="alignApi.isActive.value"
    :tooltip="alignApi.label"
    :shortcut-keys="alignApi.shortcutKeys"
    @click="handleClick"
  >
    <slot>
      <component :is="alignApi.Icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка выравнивания (порт TextAlignButton из чанка 1mpndbcfk3lik).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Button from '../primitives/Button.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useTextAlign } from '../../composables/useTextAlign'
import type { TextAlign } from '../../composables/useTextAlign'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    align: TextAlign
    text?: string
    hideWhenUnavailable?: boolean
  }>(),
  { hideWhenUnavailable: false },
)

const emit = defineEmits<{ aligned: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const alignApi = useTextAlign(editor, props.align, props.hideWhenUnavailable)

function handleClick() {
  if (alignApi.handleTextAlign()) emit('aligned')
}
</script>
