<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    :disabled="!canExecute"
    :data-disabled="!canExecute"
    role="button"
    :tabindex="-1"
    :aria-label="label"
    :tooltip="label"
    :shortcut-keys="shortcutKeys"
    @click="handleClick"
  >
    <slot>
      <component :is="icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ parsedShortcut.join('') }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
/**
 * Кнопка Undo/Redo: скрывается при hideWhenUnavailable, дизейблится,
 * когда действие невозможно (в т.ч. при выделенном image-узле).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { parseShortcutKeys } from '../../../utils/tiptap-utils'
import { useTiptapEditor, useUndoRedo } from '../../../composables'
import { Button, Badge } from '../../primitives'

type UndoRedoAction = 'undo' | 'redo'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    action: UndoRedoAction
    text?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ executed: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))

const { canExecute, isVisible, execute, label, shortcutKeys, icon } = useUndoRedo(
  editor,
  computed(() => props.action),
  computed(() => props.hideWhenUnavailable),
)
const parsedShortcut = computed(() => parseShortcutKeys({ shortcutKeys: shortcutKeys.value }))

function handleClick() {
  if (execute()) emit('executed')
}
</script>
