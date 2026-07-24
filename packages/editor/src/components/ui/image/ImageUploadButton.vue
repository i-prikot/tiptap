<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :data-active-state="isActive ? 'on' : 'off'"
    :disabled="!canInsert"
    :data-disabled="!canInsert"
    :aria-label="t('image.add')"
    :aria-pressed="isActive"
    :tooltip="tooltip ?? t('image.add')"
    @click="handleClick"
  >
    <slot>
      <component :is="icon ?? ImagePlusIcon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'
import { useEditorI18n, useImageUploadButton, useTiptapEditor } from '../../../composables'
import { parseShortcutKeys } from '../../../utils/tiptap-utils'
import { ImagePlusIcon } from '../../../icons'

export interface ImageUploadButtonProps {
  editor?: Editor | null
  text?: string
  tooltip?: string
  icon?: FunctionalComponent
  hideWhenUnavailable?: boolean
  showShortcut?: boolean
}

const imageUploadShortcutKey = 'mod+shift+i'
const props = withDefaults(defineProps<ImageUploadButtonProps>(), {
  hideWhenUnavailable: false,
  showShortcut: false,
})
const emit = defineEmits<{ inserted: [] }>()
const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const { canInsert, isActive, isVisible, execute } = useImageUploadButton(
  editor,
  computed(() => props.hideWhenUnavailable),
)
const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: imageUploadShortcutKey }).join(''),
)

function handleClick() {
  if (execute()) emit('inserted')
}
</script>
