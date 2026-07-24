<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :disabled="!canAddTrigger"
    :data-disabled="!canAddTrigger"
    :aria-label="t('toolbar.insertSlashCommand')"
    :tooltip="t('toolbar.insertSlashCommand')"
    :shortcut-keys="SLASH_TRIGGER_SHORTCUT_KEY"
    v-bind="$attrs"
    @click="handleClick"
  >
    <slot>
      <PlusIcon class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    </slot>
  </Button>
</template>

<script setup lang="ts">
/**
 * Кнопка «+»: вставляет триггер `/` (слэш-меню) в текущую позицию либо
 * после указанного узла.
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Button } from '../../primitives'
import { PlusIcon } from '../../../icons'
import { useEditorI18n, useTiptapEditor, useEditorSelectionSignal } from '../../../composables'

import { findNodePosition, isNodeTypeSelected, isValidPosition } from '../../../utils/tiptap-utils'
import { addSlashTrigger } from '../../../utils/trigger-utils'

const SLASH_TRIGGER_SHORTCUT_KEY = 'mod+/'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  editor?: Editor | null
  node?: ProseMirrorNode | null
  nodePos?: number | null
  text?: string
  hideWhenUnavailable?: boolean
}>()

const emit = defineEmits<{ triggerApplied: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const signal = useEditorSelectionSignal(editor)

function canAdd(instance: Editor | null): boolean {
  if (!instance || !instance.isEditable || isNodeTypeSelected(instance, ['image'])) return false
  if (props.node || isValidPosition(props.nodePos)) {
    if (isValidPosition(props.nodePos) && props.nodePos! >= 0) return true
    if (props.node) return findNodePosition({ editor: instance, node: props.node }) !== null
  }
  return true
}

const canAddTrigger = computed(() => (signal.value, canAdd(editor.value)))
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return !!instance.isEditable && (!!instance.isActive('code') || canAdd(instance))
})

function handleClick() {
  const instance = editor.value
  if (!instance) return
  if (addSlashTrigger(instance, '/', props.node, props.nodePos)) emit('triggerApplied')
}
</script>
