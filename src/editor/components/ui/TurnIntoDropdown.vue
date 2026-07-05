<template>
  <DropdownMenu v-if="isVisible" v-model:open="open">
    <DropdownMenuTrigger>
      <Button
        type="button"
        variant="ghost"
        role="button"
        :tabindex="-1"
        :disabled="!canToggle"
        :data-disabled="!canToggle"
        :aria-label="`Turn into (current: ${activeBlock.label})`"
        tooltip="Turn into"
      >
        <span class="tiptap-button-text">{{ activeBlock.label }}</span>
        <ChevronDownIcon class="tiptap-button-dropdown-small" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <TurnIntoDropdownContent :editor="editor" :block-types="blockTypes" />
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
/**
 * Дропдаун «Turn into» для floating тулбара.
 * Порт TurnIntoDropdown из чанка 34p294mqk5mqb (модуль 413941).
 */
import { computed, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import DropdownMenu from '../primitives/dropdown-menu/DropdownMenu.vue'
import DropdownMenuTrigger from '../primitives/dropdown-menu/DropdownMenuTrigger.vue'
import DropdownMenuContent from '../primitives/dropdown-menu/DropdownMenuContent.vue'
import Button from '../primitives/Button.vue'
import TurnIntoDropdownContent from './TurnIntoDropdownContent.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useEditorSelectionSignal } from '../../composables/useEditorSelectionSignal'
import { canTurnInto, getActiveTurnIntoBlock } from '../../composables/useTurnInto'
import type { TurnIntoBlockType } from '../../composables/useTurnInto'
import { ChevronDownIcon } from '../../icons'

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
const editor = computed(() => editorRef.value)
const signal = useEditorSelectionSignal(editorRef)

const open = ref(false)
watch(open, value => emit('openChange', value))

const canToggle = computed(() => (signal.value, canTurnInto(editorRef.value, props.blockTypes)))
const activeBlock = computed(() => (signal.value, getActiveTurnIntoBlock(editorRef.value, props.blockTypes)))
const isVisible = computed(() => {
  void signal.value
  const instance = editorRef.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return !!instance.isEditable && (!!instance.isActive('code') || canTurnInto(instance, props.blockTypes))
})
</script>
