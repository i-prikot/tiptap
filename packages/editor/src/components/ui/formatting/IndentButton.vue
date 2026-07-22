<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    :disabled="!canIndent"
    :data-disabled="!canIndent"
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
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка indent/outdent (порт IndentButton из чанка 3xpmbr0kqzhen).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'

import { useIndent, useTiptapEditor } from '../../../composables'

import { parseShortcutKeys } from '../../../utils/tiptap-utils'

type IndentAction = 'indent' | 'outdent'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    action: IndentAction
    text?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ indented: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { canIndent, isVisible, execute, label, shortcutKeys, icon } = useIndent(
  editor,
  computed(() => props.action),
  computed(() => props.hideWhenUnavailable),
)
const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: shortcutKeys.value }).join(''),
)

function handleClick() {
  if (execute()) emit('indented')
}
</script>
