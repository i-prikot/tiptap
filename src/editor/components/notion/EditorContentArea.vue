<template>
  <template v-if="editor">
    <EditorContent
      :editor="editor"
      role="presentation"
      class="notion-like-editor-content"
      :style="{ cursor: uiState.isDragging ? 'grabbing' : 'auto' }"
    />
    <!-- выпадающие меню телепортируются в body, здесь только их setup -->
    <DragContextMenu />
    <EmojiDropdownMenu />
    <MentionDropdownMenu />
    <SlashDropdownMenu />
    <NotionToolbarFloating />
    <MobileToolbar />
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
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useUiEditorState } from '../../composables/useUiEditorState'
import { useScrollToHash } from '../../composables/useScrollToHash'
import DragContextMenu from '../ui/DragContextMenu.vue'
import EmojiDropdownMenu from '../ui/EmojiDropdownMenu.vue'
import MentionDropdownMenu from '../ui/MentionDropdownMenu.vue'
import SlashDropdownMenu from '../ui/SlashDropdownMenu.vue'
import NotionToolbarFloating from '../ui/NotionToolbarFloating.vue'
import MobileToolbar from '../ui/MobileToolbar.vue'

const editor = useTiptapEditor()
const uiState = useUiEditorState(editor)

useScrollToHash(editor)

// как только AI-генерация по выделению завершилась сообщением — принять её
watch(
  () => [uiState.aiGenerationHasMessage, uiState.aiGenerationIsLoading, uiState.aiGenerationIsSelection] as const,
  ([hasMessage, isLoading, isSelection]) => {
    const instance = editor.value
    if (instance && !isLoading && isSelection && hasMessage) {
      ;(instance.chain().focus() as any).aiAccept().run()
      instance.commands.resetUiState()
    }
  },
)
</script>
