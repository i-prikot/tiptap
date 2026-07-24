<template>
  <Menu v-if="visible" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <AlignmentIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ t('table.alignment') }}</span>
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
            :key="item.labelKey"
            :disabled="!item.control.canAlignCell.value"
            @select="item.control.handleAlign"
          >
            <Button
              variant="ghost"
              :data-active-state="item.control.isActive.value ? 'on' : 'off'"
              :disabled="!item.control.canAlignCell.value"
            >
              <component :is="item.control.Icon" class="tiptap-button-icon" />
              <span class="tiptap-button-text">{{ t(item.labelKey) }}</span>
            </Button>
          </MenuItem>
          <Separator orientation="horizontal" />
          <MenuItem
            v-for="item in verticalAligns"
            :key="item.labelKey"
            :disabled="!item.control.canAlignCell.value"
            @select="item.control.handleAlign"
          >
            <Button
              variant="ghost"
              :data-active-state="item.control.isActive.value ? 'on' : 'off'"
              :disabled="!item.control.canAlignCell.value"
            >
              <component :is="item.control.Icon" class="tiptap-button-icon" />
              <span class="tiptap-button-text">{{ t(item.labelKey) }}</span>
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
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Menu, MenuContent, MenuGroup, MenuItem, Button, Spacer, Separator } from '../../primitives'

import { useEditorI18n, useTiptapEditor, useTableAlignCell } from '../../../composables'

import type { Orientation } from '../../../utils/table-utils'
import { AlignmentIcon, ChevronRightIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null; index?: number; orientation?: Orientation }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()

const shared = { editor, index: props.index, orientation: props.orientation }

const textAligns = [
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'left' }),
    labelKey: 'table.alignLeft' as const,
  },
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'center' }),
    labelKey: 'table.alignCenter' as const,
  },
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'text', alignment: 'right' }),
    labelKey: 'table.alignRight' as const,
  },
]
const verticalAligns = [
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'top' }),
    labelKey: 'table.alignTop' as const,
  },
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'middle' }),
    labelKey: 'table.alignMiddle' as const,
  },
  {
    control: useTableAlignCell({ ...shared, alignmentType: 'vertical', alignment: 'bottom' }),
    labelKey: 'table.alignBottom' as const,
  },
]

const visible = computed(() => textAligns[0].control.canAlignCell.value)
</script>
