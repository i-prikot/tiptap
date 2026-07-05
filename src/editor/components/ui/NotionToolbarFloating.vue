<template>
  <FloatingElement v-if="!hidden" :should-show="shouldShow">
    <Toolbar variant="floating">
      <ToolbarGroup>
        <TurnIntoDropdown hide-when-unavailable />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" hide-when-unavailable />
        <MarkButton type="italic" hide-when-unavailable />
        <MarkButton type="underline" hide-when-unavailable />
        <MarkButton type="strike" hide-when-unavailable />
        <MarkButton type="code" hide-when-unavailable />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageNodeFloating />
      </ToolbarGroup>
      <ToolbarGroup>
        <LinkPopover :auto-open-on-link-active="false" hide-when-unavailable />
        <ColorTextPopover hide-when-unavailable />
      </ToolbarGroup>
      <template v-if="moreOptionsVisible">
        <ToolbarSeparator />
        <ToolbarGroup>
          <Popover>
            <template #trigger>
              <Button type="button" variant="ghost" role="button" :tabindex="-1" tooltip="More options">
                <MoreVerticalIcon class="tiptap-button-icon" />
              </Button>
            </template>
            <Toolbar variant="floating" :tabindex="0">
              <ToolbarGroup>
                <MarkButton type="superscript" />
                <MarkButton type="subscript" />
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup>
                <IndentButton action="outdent" />
                <IndentButton action="indent" />
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
import FloatingElement from './FloatingElement.vue'
import Toolbar from '../primitives/toolbar/Toolbar.vue'
import ToolbarGroup from '../primitives/toolbar/ToolbarGroup.vue'
import ToolbarSeparator from '../primitives/toolbar/ToolbarSeparator.vue'
import Popover from '../primitives/popover/Popover.vue'
import Button from '../primitives/Button.vue'
import MarkButton from './MarkButton.vue'
import TextAlignButton from './TextAlignButton.vue'
import IndentButton from './IndentButton.vue'
import TurnIntoDropdown from './TurnIntoDropdown.vue'
import LinkPopover from './LinkPopover.vue'
import ColorTextPopover from './ColorTextPopover.vue'
import ImageNodeFloating from './ImageNodeFloating.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useUiEditorState } from '../../composables/useUiEditorState'
import { useIsBreakpoint } from '../../composables/useIsBreakpoint'
import { useEditorSelectionSignal } from '../../composables/useEditorSelectionSignal'
import { useFloatingToolbarVisibility } from '../../composables/useFloatingToolbarVisibility'
import { canToggleMark } from '../../composables/useMark'
import { canSetTextAlign } from '../../composables/useTextAlign'
import type { TextAlign } from '../../composables/useTextAlign'
import { isSelectionValid } from '../../utils/selection-utils'
import { MoreVerticalIcon } from '../../icons'

const editor = useTiptapEditor()
const uiState = useUiEditorState(editor)
const isMobile = useIsBreakpoint('max', 480)
const signal = useEditorSelectionSignal(editor)

const extraHideWhen = computed(() => !!(uiState.aiGenerationActive || uiState.commentInputVisible))
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
  instance => {
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
  () => uiState.lockDragHandle || uiState.isDragging || suppressedAfterDrag.value || !!isMobile.value,
)

// «More options»: есть куда выравнивать или супер/подскрипт (es из оригинала)
const moreOptionsVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!instance.isActive('code')) {
    const aligns: TextAlign[] = ['left', 'center', 'right', 'justify']
    const canAlign = aligns.some(align => canSetTextAlign(instance, align))
    const canScript = (['superscript', 'subscript'] as const).some(type => canToggleMark(instance, type))
    return canScript || canAlign
  }
  return !!instance.isEditable
})
</script>
