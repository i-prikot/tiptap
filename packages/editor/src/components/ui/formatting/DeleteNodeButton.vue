<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :aria-label="t('toolbar.delete')"
    :tooltip="t('toolbar.delete')"
    :disabled="!del.canDeleteNode.value"
    @click="handleClick"
  >
    <slot>
      <component :is="del.Icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка удаления блока (порт DeleteNodeButton из чанка 34p294mqk5mqb).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'

import { useEditorI18n, useTiptapEditor, useDeleteNode } from '../../../composables'

import { parseShortcutKeys } from '../../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    text?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ deleted: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const del = useDeleteNode(editor)

const isVisible = computed(() => {
  const instance = editor.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return !!instance.isEditable && (!!instance.isActive('code') || del.canDeleteNode.value)
})

const shortcutText = computed(() => parseShortcutKeys({ shortcutKeys: del.shortcutKeys }).join(''))

function handleClick() {
  if (del.handleDeleteNode()) emit('deleted')
}
</script>
