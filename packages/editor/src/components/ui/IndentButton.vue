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
import { Button, Badge } from '../primitives'

import { useTiptapEditor, useEditorSelectionSignal } from '../../composables'

import { isExtensionAvailable, parseShortcutKeys } from '../../utils/tiptap-utils'
import { IndentDecreaseIcon, IndentIncreaseIcon } from '../../icons'

type IndentAction = 'indent' | 'outdent'

const SHORTCUTS: Record<IndentAction, string> = { indent: 'Tab', outdent: 'Shift-Tab' }
const LABELS: Record<IndentAction, string> = {
  indent: 'Increase indent',
  outdent: 'Decrease indent',
}
const ICONS = { indent: IndentIncreaseIcon, outdent: IndentDecreaseIcon }

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
const signal = useEditorSelectionSignal(editor)

function canIndentAction(instance: Editor | null): boolean {
  if (!instance || !instance.isEditable || !isExtensionAvailable(instance, 'indent')) return false
  return props.action === 'indent' ? instance.can().indent() : instance.can().outdent()
}

const canIndent = computed(() => (signal.value, canIndentAction(editor.value)))
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return (
    !!instance.isEditable && !!isExtensionAvailable(instance, 'indent') && canIndentAction(instance)
  )
})

const label = computed(() => LABELS[props.action])
const shortcutKeys = computed(() => SHORTCUTS[props.action])
const icon = computed(() => ICONS[props.action])
const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: shortcutKeys.value }).join(''),
)

function handleClick() {
  const instance = editor.value
  if (!instance || !instance.isEditable || !canIndentAction(instance)) return
  const done =
    props.action === 'indent'
      ? instance.chain().focus().indent().run()
      : instance.chain().focus().outdent().run()
  if (done) emit('indented')
}
</script>
