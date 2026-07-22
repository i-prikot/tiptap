<template>
  <Menu v-if="visible" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <AlignmentIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">Alignment</span>
          <Spacer />
          <ChevronRightIcon class="tiptap-button-icon" />
        </Button>
      </MenuItem>
    </template>
    <MenuContent>
      <div class="tiptap-combobox-list">
        <MenuGroup>
          <MenuItem
            v-for="item in textAligns"
            :key="item.label"
            :disabled="!item.canAlignCell.value"
            @select="item.handleAlign"
          >
            <Button
              variant="ghost"
              :data-active-state="item.isActive.value ? 'on' : 'off'"
              :disabled="!item.canAlignCell.value"
            >
              <component :is="item.Icon" class="tiptap-button-icon" />
              <span class="tiptap-button-text">{{ item.label }}</span>
            </Button>
          </MenuItem>
          <Separator orientation="horizontal" />
          <MenuItem
            v-for="item in verticalAligns"
            :key="item.label"
            :disabled="!item.canAlignCell.value"
            @select="item.handleAlign"
          >
            <Button
              variant="ghost"
              :data-active-state="item.isActive.value ? 'on' : 'off'"
              :disabled="!item.canAlignCell.value"
            >
              <component :is="item.Icon" class="tiptap-button-icon" />
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
 * Подменю «Alignment» ячеек таблицы (текст + вертикаль).
 * Порт TableAlignMenu из чанка 2yhkpc8fmweba (модуль 479042).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Menu, MenuContent, MenuGroup, MenuItem, Button, Spacer, Separator } from '../../primitives'

import { useTiptapEditor, useTableAlignCell } from '../../../composables'

import type { Orientation } from '../../../utils/table-utils'
import { AlignmentIcon, ChevronRightIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null; index?: number; orientation?: Orientation }>()

const editor = useTiptapEditor(computed(() => props.editor))

const shared = { editor, index: props.index, orientation: props.orientation }

const textAligns = [
  useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'left' }),
  useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'center' }),
  useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'right' }),
]
const verticalAligns = [
  useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'top' }),
  useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'middle' }),
  useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'bottom' }),
]

const visible = computed(() => textAligns[0].canAlignCell.value)
</script>
