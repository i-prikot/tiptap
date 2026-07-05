<template>
  <Menu v-if="canShow" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <PaintBucketIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ label }}</span>
          <Spacer />
          <ChevronRightIcon class="tiptap-button-icon" />
        </Button>
      </MenuItem>
    </template>
    <MenuContent>
      <div class="tiptap-combobox-list">
        <MenuGroup v-if="isInitialized && recentColors.length">
          <MenuGroupLabel>Recent colors</MenuGroupLabel>
          <MenuItem v-for="recent in recentItems" :key="`recent-${recent.type}-${recent.value}`" @select="recent.apply">
            <Button variant="ghost" :data-active-state="recent.isActive ? 'on' : 'off'">
              <span v-if="recent.type === 'text'" class="tiptap-button-color-text" :style="{ color: recent.value }">
                <TextColorSmallIcon class="tiptap-button-icon" :style="{ color: recent.value, flexGrow: 1 }" />
              </span>
              <span v-else class="tiptap-button-highlight" :style="{ '--highlight-color': recent.value }" />
              <span class="tiptap-button-text">{{ recent.label }}</span>
            </Button>
          </MenuItem>
          <Separator orientation="horizontal" />
        </MenuGroup>
        <MenuGroup>
          <MenuGroupLabel>Text color</MenuGroupLabel>
          <MenuItem v-for="item in textItems" :key="item.value" @select="item.apply">
            <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
              <span class="tiptap-button-color-text" :style="{ color: item.value }">
                <TextColorSmallIcon class="tiptap-button-icon" :style="{ color: item.value, flexGrow: 1 }" />
              </span>
              <span class="tiptap-button-text">{{ item.label }}</span>
            </Button>
          </MenuItem>
        </MenuGroup>
        <Separator orientation="horizontal" />
        <MenuGroup>
          <MenuGroupLabel>Background color</MenuGroupLabel>
          <MenuItem v-for="item in backgroundItems" :key="item.value" @select="item.apply">
            <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
              <span class="tiptap-button-highlight" :style="{ '--highlight-color': item.value }" />
              <span class="tiptap-button-text">{{ item.label }}</span>
            </Button>
          </MenuItem>
        </MenuGroup>
      </div>
    </MenuContent>
  </Menu>
</template>

<script setup lang="ts">
/**
 * Подменю «Color» (текст + фон блока) для DragContextMenu,
 * TableCellHandleMenu и мобильного дропдауна.
 * Порт ColorMenu из чанка 2yhkpc8fmweba (модуль 599213).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Menu from '../primitives/menu/Menu.vue'
import MenuContent from '../primitives/menu/MenuContent.vue'
import MenuGroup from '../primitives/menu/MenuGroup.vue'
import MenuGroupLabel from '../primitives/menu/MenuGroupLabel.vue'
import MenuItem from '../primitives/menu/MenuItem.vue'
import Button from '../primitives/Button.vue'
import Spacer from '../primitives/Spacer.vue'
import Separator from '../primitives/Separator.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useEditorSelectionSignal } from '../../composables/useEditorSelectionSignal'
import { TEXT_COLORS } from '../../composables/useColorText'
import { HIGHLIGHT_COLORS, canColorHighlight } from '../../composables/useColorHighlight'
import { useRecentColors, getColorByValue } from '../../composables/useRecentColors'
import { selectCurrentBlockContent } from '../../utils/tiptap-utils'
import { ChevronRightIcon, PaintBucketIcon, TextColorSmallIcon } from '../../icons'

const props = withDefaults(defineProps<{ editor?: Editor | null; label?: string }>(), { label: 'Color' })

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)
const { recentColors, addRecentColor, isInitialized } = useRecentColors()

const canShow = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  return (
    !!instance.can().setMark('textStyle') || !!instance.can().setMark('highlight') || canColorHighlight(instance, 'node')
  )
})

function applyTextColor(color: string, label: string) {
  const instance = editor.value
  if (!instance) return
  if (instance.state.storedMarks) {
    const markType = instance.schema.marks.textStyle
    if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
  }
  setTimeout(() => {
    selectCurrentBlockContent(instance)
    if (instance.chain().focus().toggleMark('textStyle', { color }).run()) {
      addRecentColor({ type: 'text', label, value: color })
    }
  }, 0)
}

function applyBackgroundColor(color: string, label: string) {
  const instance = editor.value
  if (!instance) return
  if (instance.chain().focus().toggleNodeBackgroundColor(color).run()) {
    addRecentColor({ type: 'highlight', label, value: color })
  }
}

function isTextColorActive(color: string): boolean {
  const instance = editor.value
  return !!instance && !!instance.isEditable && instance.isActive('textStyle', { color })
}

function isBackgroundActive(color: string): boolean {
  const instance = editor.value
  if (!instance || !instance.isEditable) return false
  try {
    const { $anchor } = instance.state.selection
    for (let depth = $anchor.depth; depth >= 0; depth--) {
      const node = $anchor.node(depth)
      if (node && node.attrs?.backgroundColor === color) return true
    }
    return false
  } catch {
    return false
  }
}

const textItems = computed(() => {
  void signal.value
  return TEXT_COLORS.map(color => ({
    value: color.value,
    label: color.label,
    isActive: isTextColorActive(color.value),
    apply: () => applyTextColor(color.value, color.label),
  }))
})

const backgroundItems = computed(() => {
  void signal.value
  return HIGHLIGHT_COLORS.map(color => ({
    value: color.value,
    label: color.label,
    isActive: isBackgroundActive(color.value),
    apply: () => applyBackgroundColor(color.value, color.label),
  }))
})

const recentItems = computed(() => {
  void signal.value
  return recentColors.value.map(recent => {
    const palette = recent.type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS
    const resolved = getColorByValue(recent.value, palette)
    return {
      type: recent.type,
      value: recent.value,
      label: resolved.label === resolved.value ? recent.label : resolved.label,
      isActive: recent.type === 'text' ? isTextColorActive(recent.value) : isBackgroundActive(recent.value),
      apply: () =>
        recent.type === 'text'
          ? applyTextColor(recent.value, recent.label)
          : applyBackgroundColor(recent.value, recent.label),
    }
  })
})
</script>
