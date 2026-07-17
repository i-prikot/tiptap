<template>
  <FloatingElement v-if="!hidden" :editor="editor" :should-show="shouldShow">
    <Toolbar variant="floating">
      <ToolbarGroup>
        <TurnIntoDropdown :editor="editor" hide-when-unavailable />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton :editor="editor" type="bold" hide-when-unavailable />
        <MarkButton :editor="editor" type="italic" hide-when-unavailable />
        <MarkButton :editor="editor" type="underline" hide-when-unavailable />
        <MarkButton :editor="editor" type="strike" hide-when-unavailable />
        <MarkButton :editor="editor" type="code" hide-when-unavailable />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageNodeFloating :editor="editor" />
      </ToolbarGroup>
      <ToolbarGroup>
        <LinkPopover :editor="editor" :auto-open-on-link-active="false" hide-when-unavailable />
        <ColorTextPopover :editor="editor" hide-when-unavailable />
      </ToolbarGroup>
      <template v-if="moreOptionsVisible">
        <ToolbarSeparator />
        <ToolbarGroup>
          <Popover>
            <template #trigger>
              <Button
                type="button"
                variant="ghost"
                role="button"
                :tabindex="-1"
                tooltip="More options"
              >
                <MoreVerticalIcon class="tiptap-button-icon" />
              </Button>
            </template>
            <Toolbar variant="floating" :tabindex="0">
              <ToolbarGroup>
                <MarkButton :editor="editor" type="superscript" />
                <MarkButton :editor="editor" type="subscript" />
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup>
                <TextAlignButton :editor="editor" align="left" />
                <TextAlignButton :editor="editor" align="center" />
                <TextAlignButton :editor="editor" align="right" />
                <TextAlignButton :editor="editor" align="justify" />
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup>
                <IndentButton :editor="editor" action="outdent" />
                <IndentButton :editor="editor" action="indent" />
              </ToolbarGroup>
            </Toolbar>
          </Popover>
        </ToolbarGroup>
      </template>
    </Toolbar>
  </FloatingElement>
</template>

<script setup lang="ts">
/**
 * Floating toolbar по текстовому выделению.
 * Порт NotionToolbarFloating (функции er/es) из чанка 3xpmbr0kqzhen.
 * AI ImproveDropdown не переносится (Tiptap Pro), скрыт как в оригинале
 * при отсутствии расширения `ai`.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import FloatingElement from './FloatingElement.vue'
import { Toolbar, ToolbarGroup, ToolbarSeparator, Popover, Button } from '../primitives'

import MarkButton from './MarkButton.vue'
import TextAlignButton from './TextAlignButton.vue'
import IndentButton from './IndentButton.vue'
import TurnIntoDropdown from './TurnIntoDropdown.vue'
import LinkPopover from './LinkPopover.vue'
import ColorTextPopover from './ColorTextPopover.vue'
import ImageNodeFloating from './ImageNodeFloating.vue'
import {
  useTiptapEditor,
  useUiEditorState,
  useIsBreakpoint,
  useEditorSelectionSignal,
  useFloatingToolbarVisibility,
  canToggleMark,
  canSetTextAlign,
  type TextAlign,
} from '../../composables'

import { isSelectionValid } from '../../utils/selection-utils'
import { MoreVerticalIcon } from '../../icons'

const props = withDefaults(defineProps<{ editor?: Editor | null; aiEnabled?: boolean }>(), {
  aiEnabled: false,
})

const editor = useTiptapEditor(computed(() => props.editor))
const uiState = useUiEditorState(editor)
const isMobile = useIsBreakpoint('max', 480)
const signal = useEditorSelectionSignal(editor)

const extraHideWhen = computed(
  () => !!((props.aiEnabled && uiState.aiGenerationActive) || uiState.commentInputVisible),
)
const { shouldShow } = useFloatingToolbarVisibility({ editor, isSelectionValid, extraHideWhen })

// isDragging: во время переноса блока за drag-handle тулбар полностью
// скрыт — иначе он всплывает под курсором (drag-handle выделяет блок,
// а dragover над самим тулбаром не доходит до редактора и не закрывает его)
//
// После переноса drag-handle оставляет блок выделенным — тулбар сам бы
// всплыл над ним, что выглядит как баг. Подавляем его до следующего
// реального действия пользователя (клик/клавиша в редакторе); сбрасывать
// по selectionUpdate нельзя — drag-handle диспатчит транзакции и после
// dragend (blur/focus-восстановление выделения).
const suppressedAfterDrag = ref(false)

watch(
  () => uiState.isDragging,
  (dragging, wasDragging) => {
    if (wasDragging && !dragging) suppressedAfterDrag.value = true
  },
)

let unbindSuppressReset: (() => void) | null = null
watch(
  editor,
  (instance) => {
    unbindSuppressReset?.()
    unbindSuppressReset = null
    if (!instance) return
    const clear = () => {
      suppressedAfterDrag.value = false
    }
    const dom = instance.view.dom
    dom.addEventListener('pointerdown', clear, true)
    dom.addEventListener('keydown', clear, true)
    unbindSuppressReset = () => {
      dom.removeEventListener('pointerdown', clear, true)
      dom.removeEventListener('keydown', clear, true)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => unbindSuppressReset?.())

const hidden = computed(
  () =>
    uiState.lockDragHandle || uiState.isDragging || suppressedAfterDrag.value || !!isMobile.value,
)

// «More options»: есть куда выравнивать или супер/подскрипт (es из оригинала)
const moreOptionsVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!instance.isActive('code')) {
    const aligns: TextAlign[] = ['left', 'center', 'right', 'justify']
    const canAlign = aligns.some((align) => canSetTextAlign(instance, align))
    const canScript = (['superscript', 'subscript'] as const).some((type) =>
      canToggleMark(instance, type),
    )
    return canScript || canAlign
  }
  return !!instance.isEditable
})
</script>
