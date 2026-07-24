<template>
  <DropdownMenu v-if="isVisible" :open="open" @update:open="handleOpenChange">
    <DropdownMenuTrigger>
      <Button
        type="button"
        variant="ghost"
        role="button"
        :tabindex="-1"
        :disabled="!canToggle"
        :data-disabled="!canToggle"
        :aria-label="t('toolbar.turnIntoCurrent', { label: activeBlockLabel })"
        :tooltip="t('toolbar.turnInto')"
      >
        <span class="tiptap-button-text">{{ activeBlockLabel }}</span>
        <ChevronDownIcon class="tiptap-button-dropdown-small" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <TurnIntoDropdownContent :editor="activeEditor" :block-types="blockTypes" />
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
/**
 * Дропдаун «Turn into» для floating тулбара.
 */
import { computed, ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, Button } from '../../primitives'

import TurnIntoDropdownContent from './TurnIntoDropdownContent.vue'
import {
  useTiptapEditor,
  useEditorSelectionSignal,
  canTurnInto,
  getActiveTurnIntoBlock,
  getTurnIntoBlockMessageKey,
  type TurnIntoBlockType,
} from '../../../composables'
import { useEditorI18n } from '../../../composables/useEditorI18n'

import { ChevronDownIcon } from '../../../icons'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    blockTypes?: TurnIntoBlockType[]
    hideWhenUnavailable?: boolean
  }>(),
  { hideWhenUnavailable: false },
)

const emit = defineEmits<{ openChange: [value: boolean] }>()

const editorRef = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const activeEditor = computed(() => editorRef.value)
const signal = useEditorSelectionSignal(editorRef)

const open = ref(false)

function handleOpenChange(value: boolean) {
  open.value = value
  emit('openChange', value)
}

const canToggle = computed(() => (signal.value, canTurnInto(editorRef.value, props.blockTypes)))
const activeBlock = computed(
  () => (signal.value, getActiveTurnIntoBlock(editorRef.value, props.blockTypes)),
)
const activeBlockLabel = computed(() => t(getTurnIntoBlockMessageKey(activeBlock.value)))
const isVisible = computed(() => {
  void signal.value
  const instance = editorRef.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return (
    !!instance.isEditable &&
    (!!instance.isActive('code') || canTurnInto(instance, props.blockTypes))
  )
})
</script>
