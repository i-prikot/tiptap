<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <Toolbar
      v-if="isMobile && editor && editor.isEditable"
      ref="toolbarRef"
      :style="{ bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)` }"
    >
      <MobileToolbarMain
        v-if="viewId === 'main'"
        :editor="editor"
        @open-highlighter="viewId = 'highlighter'"
        @open-link="viewId = 'link'"
      />
      <MobileToolbarHighlighter
        v-else-if="viewId === 'highlighter'"
        :editor="editor"
        @return-to-main="viewId = 'main'"
      />
      <MobileToolbarLink v-else :editor="editor" @return-to-main="viewId = 'main'" />
    </Toolbar>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
/**
 * Мобильный тулбар (≤480px), прижат к нижней границе видимой области;
 * маршрутизирует виды main/highlighter/link.
 * Порт MobileToolbar (функции et/t6/t3/t8/t5) из чанка 3xpmbr0kqzhen.
 * AI-пункты (ImproveDropdown, Ask AI) не переносятся (Tiptap Pro).
 */
import { computed, ref, shallowRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { EditorOverlayTeleport } from '../../primitives'
import { Toolbar } from '../../primitives'

import MobileToolbarHighlighter from './MobileToolbarHighlighter.vue'
import MobileToolbarLink from './MobileToolbarLink.vue'
import MobileToolbarMain from './MobileToolbarMain.vue'
import {
  useCursorVisibility,
  useEditorOverlayTarget,
  useIsBreakpoint,
  useTiptapEditor,
  useWindowSize,
} from '../../../composables'

type MobileToolbarView = 'main' | 'highlighter' | 'link'

const props = defineProps<{ editor?: Editor | null }>()

const editor = useTiptapEditor(computed(() => props.editor))
const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)
const isMobile = useIsBreakpoint('max', 480)
const viewId = ref<MobileToolbarView>('main')

watch(isMobile, (mobile) => {
  if (!mobile) viewId.value = 'main'
})

const toolbarRef = shallowRef<ComponentPublicInstance | null>(null)
const windowSize = useWindowSize()
const overlayHeight = computed(
  () => (toolbarRef.value?.$el as HTMLElement | null)?.getBoundingClientRect().height ?? 0,
)
const bodyRect = useCursorVisibility({ editor, overlayHeight })
</script>
