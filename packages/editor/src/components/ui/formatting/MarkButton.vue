<template>
  <Button
    v-if="mark.isVisible.value"
    type="button"
    variant="ghost"
    :disabled="!mark.canToggle.value"
    :data-active-state="mark.isActive.value ? 'on' : 'off'"
    :data-disabled="!mark.canToggle.value"
    role="button"
    :tabindex="-1"
    :aria-label="mark.label.value"
    :aria-pressed="mark.isActive.value"
    :tooltip="mark.label.value"
    :shortcut-keys="mark.shortcutKeys"
    @click="handleClick"
  >
    <slot>
      <component :is="mark.Icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'

import { useTiptapEditor, useMark, type MarkType } from '../../../composables'

import { parseShortcutKeys } from '../../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    type: MarkType
    text?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ toggled: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const mark = useMark(editor, props.type, props.hideWhenUnavailable)

const shortcutText = computed(() => parseShortcutKeys({ shortcutKeys: mark.shortcutKeys }).join(''))

function handleClick() {
  if (mark.handleMark()) emit('toggled')
}
</script>
