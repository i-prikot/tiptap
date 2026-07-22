<template>
  <Button
    v-if="move.isVisible.value"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :aria-label="move.label"
    :tooltip="move.label"
    :disabled="!move.canMoveNode.value"
    @click="handleClick"
  >
    <slot>
      <component :is="move.Icon" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка перемещения блока вверх/вниз (порт MoveNodeButton из чанка 34p294mqk5mqb).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'

import { useTiptapEditor, useMoveNode, type MoveDirection } from '../../../composables'

import { parseShortcutKeys } from '../../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    direction: MoveDirection
    text?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ moved: [direction: MoveDirection] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const move = useMoveNode(editor, props.direction, props.hideWhenUnavailable, (direction) =>
  emit('moved', direction),
)

const shortcutText = computed(() => parseShortcutKeys({ shortcutKeys: move.shortcutKeys }).join(''))

function handleClick() {
  move.handleMoveNode()
}
</script>
