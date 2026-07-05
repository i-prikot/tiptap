<template>
  <NotionEditorContent :placeholder="placeholder" />
</template>

<script setup lang="ts">
/**
 * Корень Notion-like редактора: цепочка провайдеров
 * User → Collab(room) → Ai → Toc, затем контент.
 * Порт NotionEditor из чанка 3xpmbr0kqzhen (React-провайдеры заменены
 * на provide/inject через composables).
 */
import { provideUser } from '../../composables/useUser'
import { provideCollab } from '../../composables/useCollab'
import { provideAi } from '../../composables/useAi'
import { provideToc } from '../../composables/useToc'
import NotionEditorContent from './NotionEditorContent.vue'

const props = withDefaults(defineProps<{ room?: string; placeholder?: string }>(), {
  room: '',
  placeholder: 'Start writing...',
})

provideUser()
provideCollab(props.room)
provideAi()
provideToc()
</script>
