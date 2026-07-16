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
 * Порт UndoRedoButton из чанка 3jdxmcvhjtoe-.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isNodeTypeSelected, parseShortcutKeys } from '../../utils/tiptap-utils'
import { useTiptapEditor } from '@/editor/composables'
import { Redo2Icon, Undo2Icon } from '../../icons'
import { Button, Badge } from '@/editor/components/primitives'

type UndoRedoAction = 'undo' | 'redo'

const SHORTCUT_KEYS: Record<UndoRedoAction, string> = { undo: 'mod+z', redo: 'mod+shift+z' }
const LABELS: Record<UndoRedoAction, string> = { undo: 'Undo', redo: 'Redo' }
const ICONS = { undo: Undo2Icon, redo: Redo2Icon }

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

function canExecuteAction(instance: Editor | null, action: UndoRedoAction): boolean {
  if (!instance || !instance.isEditable || isNodeTypeSelected(instance, ['image'])) return false
  return action === 'undo' ? instance.can().undo() : instance.can().redo()
}

const isVisible = ref(true)
const canExecute = ref(false)

let unsubscribe: (() => void) | null = null
watch(
  [editor, () => props.action, () => props.hideWhenUnavailable],
  ([instance]) => {
    unsubscribe?.()
    unsubscribe = null
    if (!instance) return
    const update = () => {
      canExecute.value = canExecuteAction(instance, props.action)
      isVisible.value =
        !props.hideWhenUnavailable ||
        (!!instance.isEditable &&
          (!!instance.isActive('code') || canExecuteAction(instance, props.action)))
    }
    update()
    instance.on('transaction', update)
    unsubscribe = () => instance.off('transaction', update)
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubscribe?.())

const label = computed(() => LABELS[props.action])
const shortcutKeys = computed(() => SHORTCUT_KEYS[props.action])
const icon = computed(() => ICONS[props.action])
const parsedShortcut = computed(() => parseShortcutKeys({ shortcutKeys: shortcutKeys.value }))

function handleClick() {
  const instance = editor.value
  if (!instance || !instance.isEditable || !canExecuteAction(instance, props.action)) return
  const chain = instance.chain().focus()
  const executed = props.action === 'undo' ? chain.undo().run() : chain.redo().run()
  if (executed) emit('executed')
}
</script>
