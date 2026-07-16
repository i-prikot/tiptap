<template>
  <template v-if="editor">
    <EditorContent
      :editor="editor"
      role="presentation"
      class="notion-like-editor-content"
      :style="{ cursor: uiState.isDragging ? 'grabbing' : 'auto' }"
    />
    <!-- выпадающие меню телепортируются в body, здесь только их setup -->
    <template v-if="props.features.floatingMenus">
      <DragContextMenu :ai-enabled="props.features.ai" />
      <EmojiDropdownMenu />
      <MentionDropdownMenu />
      <SlashDropdownMenu :ai-enabled="props.features.ai" />
      <NotionToolbarFloating :editor="editor" :ai-enabled="props.features.ai" />
    </template>
    <MobileToolbar v-if="props.features.mobileToolbar" :editor="editor" />
  </template>
</template>

<script setup lang="ts">
/**
 * Область контента: EditorContent + автопринятие AI-результата при
 * завершении генерации по выделению + скролл к hash.
 * Внутри этой области монтируются выпадающие меню (slash/emoji/mention)
 * и drag-меню — они добавляются по мере переноса соответствующих модулей.
 * Порт EditorContentArea из чанка 3xpmbr0kqzhen.
 */
import { watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import { useTiptapEditor, useUiEditorState, useScrollToHash } from '@/editor/composables'

import {
  DragContextMenu,
  EmojiDropdownMenu,
  MentionDropdownMenu,
  SlashDropdownMenu,
  NotionToolbarFloating,
  MobileToolbar,
} from '@/editor/components/ui'

import { defaultEditorFeatureFlags, type EditorFeatureFlags } from './public-api'

const props = withDefaults(defineProps<{ features?: EditorFeatureFlags }>(), {
  features: () => ({ ...defaultEditorFeatureFlags }),
})

const editor = useTiptapEditor()
const uiState = useUiEditorState(editor)

useScrollToHash(editor)

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
