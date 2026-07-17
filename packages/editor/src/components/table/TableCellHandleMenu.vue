<template>
  <Menu :open="open" placement="bottom-start" @update:open="onOpenChange">
    <template #trigger>
      <button
        type="button"
        :class="['expandable-menu-button', open && 'menu-opened']"
        aria-label="Table cells option"
        aria-haspopup="menu"
        :aria-expanded="open"
        @mousedown="emit('resizeStart', $event)"
      >
        <Grip4Icon class="tiptap-button-icon" />
      </button>
    </template>
    <MenuContent @close="onOpenChange(false)">
      <div class="tiptap-combobox-list" :style="{ minWidth: '15rem' }">
        <MenuGroup v-if="mergeAvailable || splitAvailable">
          <MenuItem v-if="mergeAvailable" @select="runMergeSplit('merge')">
            <Button variant="ghost" data-active-state="off">
              <TableCellMergeIcon class="tiptap-button-icon" />
              <span class="tiptap-button-text">{{ MERGE_SPLIT_LABELS.merge }}</span>
            </Button>
          </MenuItem>
          <MenuItem v-if="splitAvailable" @select="runMergeSplit('split')">
            <Button variant="ghost" data-active-state="off">
              <TableCellSplitIcon class="tiptap-button-icon" />
              <span class="tiptap-button-text">{{ MERGE_SPLIT_LABELS.split }}</span>
            </Button>
          </MenuItem>
          <Separator orientation="horizontal" />
        </MenuGroup>
        <MenuGroup>
          <ColorMenu />
          <TableAlignMenu />
          <MenuItem v-if="clearAvailable" @select="runClear">
            <Button variant="ghost" data-active-state="off">
              <SquareXIcon class="tiptap-button-icon" />
              <span class="tiptap-button-text">Clear contents</span>
            </Button>
          </MenuItem>
        </MenuGroup>
      </div>
    </MenuContent>
  </Menu>
</template>

<script setup lang="ts">
/**
 * Грип-меню выделенных ячеек (на рамке TableSelectionOverlay):
 * merge/split, цвет, выравнивание, очистка содержимого.
 * Порт TableCellHandleMenu из чанка 34p294mqk5mqb (модуль 9148).
 */
import { computed, ref } from 'vue'
import { Menu, MenuContent, MenuGroup, MenuItem, Button, Separator } from '../primitives'

import { ColorMenu, TableAlignMenu } from '../ui'

import { useTiptapEditor, useEditorSelectionSignal } from '../../composables'

import {
  MERGE_SPLIT_LABELS,
  canClearRowColumnContent,
  canMergeCells,
  canSplitCell,
  clearRowColumnContent,
  mergeSplitCells,
} from '../../utils/table-actions'
import type { MergeSplitAction } from '../../utils/table-actions'
import { Grip4Icon, SquareXIcon, TableCellMergeIcon, TableCellSplitIcon } from '../../icons'

const emit = defineEmits<{ openChange: [value: boolean]; resizeStart: [event: MouseEvent] }>()

const editor = useTiptapEditor()
const signal = useEditorSelectionSignal(editor)

const open = ref(false)

const mergeAvailable = computed(() => (signal.value, canMergeCells(editor.value)))
const splitAvailable = computed(() => (signal.value, canSplitCell(editor.value)))
const clearAvailable = computed(
  () => (signal.value, canClearRowColumnContent({ editor: editor.value })),
)

function onOpenChange(value: boolean) {
  if (open.value === value) return
  open.value = value
  emit('openChange', value)
  const instance = editor.value
  if (!instance) return
  if (value) instance.commands.freezeHandles()
  else instance.commands.unfreezeHandles()
}

function runMergeSplit(action: MergeSplitAction) {
  mergeSplitCells(editor.value, action)
}

function runClear() {
  clearRowColumnContent({ editor: editor.value, resetAttrs: true })
}
</script>
