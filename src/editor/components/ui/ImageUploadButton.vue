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
    aria-label="Add image"
    :aria-pressed="isActive"
    :tooltip="tooltip ?? 'Add image'"
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
// Кнопка вставки imageUpload-узла (порт ImageUploadButton из чанка 3jdxmcvhjtoe-).
import { computed } from 'vue'
import type { FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '@/editor/components/primitives'

import { useTiptapEditor, useEditorSelectionSignal } from '@/editor/composables'

import { isExtensionAvailable, parseShortcutKeys } from '../../utils/tiptap-utils'
import { ImagePlusIcon } from '../../icons'

export interface ImageUploadButtonProps {
  editor?: Editor | null
  text?: string
  tooltip?: string
  icon?: FunctionalComponent
  hideWhenUnavailable?: boolean
  showShortcut?: boolean
}

const IMAGE_UPLOAD_SHORTCUT_KEY = 'mod+shift+i'

const props = withDefaults(defineProps<ImageUploadButtonProps>(), {
  hideWhenUnavailable: false,
  showShortcut: false,
})

const emit = defineEmits<{ inserted: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)

function canInsertImageUpload(instance: Editor | null): boolean {
  return (
    !!instance &&
    !!instance.isEditable &&
    !!isExtensionAvailable(instance, 'imageUpload') &&
    instance.can().insertContent({ type: 'imageUpload' })
  )
}

const canInsert = computed(() => (signal.value, canInsertImageUpload(editor.value)))
const isActive = computed(
  () => (
    signal.value,
    !!editor.value && !!editor.value.isEditable && editor.value.isActive('imageUpload')
  ),
)
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance || !instance.isEditable) return false
  if (!props.hideWhenUnavailable) return true
  return (
    !!isExtensionAvailable(instance, 'imageUpload') &&
    (!!instance.isActive('code') || canInsertImageUpload(instance))
  )
})

const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: IMAGE_UPLOAD_SHORTCUT_KEY }).join(''),
)

function handleClick() {
  const instance = editor.value
  if (!instance || !canInsertImageUpload(instance)) return
  try {
    if (instance.chain().focus().insertContent({ type: 'imageUpload' }).run()) emit('inserted')
  } catch {
    /* insertContent может бросить на невалидной позиции */
  }
}
</script>
