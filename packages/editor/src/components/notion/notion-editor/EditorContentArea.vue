<template>
  <template v-if="editor">
    <EditorContent
      :editor="editor"
      role="presentation"
      class="notion-like-editor-content"
      :style="{ cursor: uiState.isDragging ? 'grabbing' : 'auto' }"
      @pointerenter="activateDragContextMenu"
      @pointermove="activateDragContextMenu"
      @focusin="activateDragContextMenu"
    />
    <!-- выпадающие меню телепортируются в body, здесь только их setup -->
    <template v-if="props.features.floatingMenus">
      <DragContextMenu v-if="isDragContextMenuActivated" :ai-enabled="props.features.ai" />
      <EmojiDropdownMenu />
      <MentionDropdownMenu />
      <SlashDropdownMenu :ai-enabled="props.features.ai" />
      <NotionToolbarFloating :editor="editor" :ai-enabled="props.features.ai" />
    </template>
    <MobileToolbar
      v-if="props.features.mobileToolbar && isMobileToolbarActivated"
      :editor="editor"
    />
  </template>
</template>

<script setup lang="ts">
/**
 * Область контента: EditorContent + автопринятие AI-результата при
 * завершении генерации по выделению + скролл к hash.
 * Внутри этой области монтируются выпадающие меню (slash/emoji/mention)
 * и drag-меню — они добавляются по мере переноса соответствующих модулей.
 */
import { defineAsyncComponent, ref, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import {
  useTiptapEditor,
  useUiEditorState,
  useScrollToHash,
  useIsBreakpoint,
} from '../../../composables'

import EmojiDropdownMenu from '../../ui/emoji-menu/EmojiDropdownMenu.vue'
import MentionDropdownMenu from '../../ui/mention-menu/MentionDropdownMenu.vue'
import SlashDropdownMenu from '../../ui/slash-menu/SlashDropdownMenu.vue'
import NotionToolbarFloating from '../../ui/toolbar/NotionToolbarFloating.vue'

import { defaultEditorFeatureFlags, type EditorFeatureFlags } from './public-api'

const props = withDefaults(defineProps<{ features?: EditorFeatureFlags }>(), {
  features: () => ({ ...defaultEditorFeatureFlags }),
})

const editor = useTiptapEditor()
const uiState = useUiEditorState(editor, [
  'isDragging',
  'aiGenerationHasMessage',
  'aiGenerationIsLoading',
  'aiGenerationIsSelection',
] as const)
const isMobile = useIsBreakpoint('max', 480)
const isDragContextMenuMobile = useIsBreakpoint('max', 768)
const isMobileToolbarActivated = ref(false)
const isDragContextMenuActivated = ref(false)

const MobileToolbar = defineAsyncComponent(
  () => import('../../ui/mobile-toolbar/MobileToolbar.vue'),
)
const DragContextMenu = defineAsyncComponent(
  () => import('../../ui/drag-context-menu/DragContextMenu.vue'),
)

useScrollToHash(editor)

watch(
  [isMobile, () => props.features.mobileToolbar],
  ([isMobileViewport, isEnabled]) => {
    if (!isEnabled) {
      isMobileToolbarActivated.value = false
      return
    }
    if (isMobileViewport) isMobileToolbarActivated.value = true
  },
  { immediate: true },
)

function activateDragContextMenu() {
  if (props.features.floatingMenus && !isDragContextMenuMobile.value) {
    isDragContextMenuActivated.value = true
  }
}

watch(
  () => props.features.floatingMenus,
  (isEnabled) => {
    if (!isEnabled) isDragContextMenuActivated.value = false
  },
)

// как только AI-генерация по выделению завершилась сообщением — принять её
watch(
  () =>
    [
      uiState.aiGenerationHasMessage,
      uiState.aiGenerationIsLoading,
      uiState.aiGenerationIsSelection,
    ] as const,
  ([hasMessage, isLoading, isSelection]) => {
    const instance = editor.value
    if (props.features.ai && instance && !isLoading && isSelection && hasMessage) {
      instance.chain().focus().aiAccept().run()
      instance.commands.resetUiState()
    }
  },
)
</script>
