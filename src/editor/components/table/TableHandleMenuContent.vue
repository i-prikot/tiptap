<template>
  <div class="tiptap-combobox-list" :style="{ minWidth: '15rem' }">
    <!-- Header row/column (только для index 0) -->
    <template v-if="header.visible">
      <MenuGroup>
        <MenuItem :disabled="!header.enabled" @select="header.toggle">
          <Button
            variant="ghost"
            :data-active-state="header.isActive ? 'on' : 'off'"
            :disabled="!header.enabled"
          >
            <component :is="header.icon" class="tiptap-button-icon" />
            <span class="tiptap-button-text">{{ header.label }}</span>
          </Button>
        </MenuItem>
      </MenuGroup>
      <Separator orientation="horizontal" />
    </template>

    <!-- Move -->
    <template v-if="moveItems.length">
      <MenuGroup>
        <MenuItem
          v-for="item in moveItems"
          :key="item.label"
          :disabled="item.disabled"
          @select="item.onClick"
        >
          <Button variant="ghost" data-active-state="off" :disabled="item.disabled">
            <component :is="item.icon" class="tiptap-button-icon" />
            <span class="tiptap-button-text">{{ item.label }}</span>
          </Button>
        </MenuItem>
      </MenuGroup>
      <Separator orientation="horizontal" />
    </template>

    <!-- Add -->
    <template v-if="addItems.length">
      <MenuGroup>
        <MenuItem
          v-for="item in addItems"
          :key="item.label"
          :disabled="item.disabled"
          @select="item.onClick"
        >
          <Button variant="ghost" data-active-state="off" :disabled="item.disabled">
            <component :is="item.icon" class="tiptap-button-icon" />
            <span class="tiptap-button-text">{{ item.label }}</span>
          </Button>
        </MenuItem>
      </MenuGroup>
      <Separator orientation="horizontal" />
    </template>

    <!-- Sort -->
    <template v-if="sortItems.length">
      <MenuGroup>
        <MenuItem
          v-for="item in sortItems"
          :key="item.label"
          :disabled="item.disabled"
          @select="item.onClick"
        >
          <Button variant="ghost" data-active-state="off" :disabled="item.disabled">
            <component :is="item.icon" class="tiptap-button-icon" />
            <span class="tiptap-button-text">{{ item.label }}</span>
          </Button>
        </MenuItem>
      </MenuGroup>
      <Separator orientation="horizontal" />
    </template>

    <!-- Color / Alignment / Clear -->
    <MenuGroup>
      <ColorMenu />
      <TableAlignMenu :index="index" :orientation="orientation" />
      <MenuItem v-if="clear.visible" :disabled="!clear.enabled" @select="clear.run">
        <Button variant="ghost" data-active-state="off" :disabled="!clear.enabled">
          <SquareXIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ clear.label }}</span>
        </Button>
      </MenuItem>
    </MenuGroup>
    <Separator orientation="horizontal" />

    <!-- Duplicate / Delete -->
    <MenuGroup>
      <MenuItem :disabled="!duplicate.enabled" @select="duplicate.run">
        <Button variant="ghost" data-active-state="off" :disabled="!duplicate.enabled">
          <CopyIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ duplicate.label }}</span>
        </Button>
      </MenuItem>
      <MenuItem :disabled="!del.enabled" @select="del.run">
        <Button variant="ghost" data-active-state="off" :disabled="!del.enabled">
          <TrashIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ del.label }}</span>
        </Button>
      </MenuItem>
    </MenuGroup>
  </div>
</template>

<script setup lang="ts">
/**
 * Пункты меню ручки строки/столбца: header, move, add, sort,
 * color/alignment/clear, duplicate/delete.
 * Порт TableHandleMenuContent (чанк 3gf8l96fmxb-u, функции k/D).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { FunctionalComponent } from 'vue'
import MenuGroup from '../primitives/menu/MenuGroup.vue'
import MenuItem from '../primitives/menu/MenuItem.vue'
import Button from '../primitives/Button.vue'
import Separator from '../primitives/Separator.vue'
import ColorMenu from '../ui/ColorMenu.vue'
import TableAlignMenu from '../ui/TableAlignMenu.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useEditorSelectionSignal } from '../../composables/useEditorSelectionSignal'
import type { Orientation } from '../../utils/table-utils'
import {
  ADD_COLUMN_LABELS,
  ADD_ROW_LABELS,
  CLEAR_LABELS,
  DELETE_LABELS,
  DUPLICATE_LABELS,
  HEADER_LABELS,
  MOVE_LABELS,
  SORT_LABELS,
  addRowColumn,
  canAddRowColumn,
  canClearRowColumnContent,
  canDeleteRowColumn,
  canDuplicateRowColumn,
  canMoveRowColumn,
  canSortRowColumn,
  canToggleHeaderRowColumn,
  clearRowColumnContent,
  deleteRowColumn,
  duplicateRowColumn,
  isClearRowColumnVisible,
  isHeaderRowColumnActive,
  moveRowColumn,
  sortRowColumn,
  toggleHeaderRowColumn,
} from '../../utils/table-actions'
import type { AddSide, MoveDirection, SortDirection } from '../../utils/table-actions'
import { getTableSelectionType } from '../../utils/table-utils'
import {
  AddColLeftIcon,
  AddColRightIcon,
  AddRowBottomIcon,
  AddRowTopIcon,
  ArrowDownAZIcon,
  ArrowDownIcon,
  ArrowDownZAIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CopyIcon,
  SquareXIcon,
  TableHeaderColumnIcon,
  TableHeaderRowIcon,
  TrashIcon,
} from '../../icons'

interface MenuActionItem {
  icon: FunctionalComponent
  label: string
  disabled: boolean
  onClick: () => unknown
}

const props = defineProps<{
  editor?: Editor | null
  index: number
  orientation: Orientation
  tablePos: number
}>()

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)

const args = computed(() => {
  void signal.value
  return {
    editor: editor.value,
    index: props.index,
    orientation: props.orientation,
    tablePos: props.tablePos,
  }
})

// -------- header (виден только для первой строки/столбца)
const header = computed(() => {
  const base = args.value
  const canToggle = canToggleHeaderRowColumn(base)
  return {
    visible: canToggle && props.index === 0,
    enabled: canToggle,
    isActive: isHeaderRowColumnActive(base),
    label: HEADER_LABELS[props.orientation],
    icon: props.orientation === 'row' ? TableHeaderRowIcon : TableHeaderColumnIcon,
    toggle: () => toggleHeaderRowColumn(base),
  }
})

// -------- move
const MOVE_ICONS: Record<MoveDirection, FunctionalComponent> = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
}

const moveItems = computed<MenuActionItem[]>(() => {
  const base = args.value
  const directions: MoveDirection[] =
    props.orientation === 'row' ? ['up', 'down'] : ['left', 'right']
  return directions
    .map((direction): MenuActionItem | null => {
      const can = canMoveRowColumn({ ...base, direction })
      return can
        ? {
            icon: MOVE_ICONS[direction],
            label: MOVE_LABELS[props.orientation][direction],
            disabled: !can,
            onClick: () => moveRowColumn({ ...base, direction }),
          }
        : null
    })
    .filter((item): item is MenuActionItem => !!item)
})

// -------- add
const addItems = computed<MenuActionItem[]>(() => {
  const base = args.value
  const sides: AddSide[] = props.orientation === 'row' ? ['above', 'below'] : ['left', 'right']
  return sides
    .map((side): MenuActionItem | null => {
      const can = canAddRowColumn({ ...base, side })
      if (!can) return null
      const label =
        props.orientation === 'row'
          ? ADD_ROW_LABELS[side as 'above' | 'below']
          : ADD_COLUMN_LABELS[side as 'left' | 'right']
      const icon =
        props.orientation === 'row'
          ? side === 'above'
            ? AddRowTopIcon
            : AddRowBottomIcon
          : side === 'left'
            ? AddColLeftIcon
            : AddColRightIcon
      return { icon, label, disabled: !can, onClick: () => addRowColumn({ ...base, side }) }
    })
    .filter((item): item is MenuActionItem => !!item)
})

// -------- sort
const sortItems = computed<MenuActionItem[]>(() => {
  const base = args.value
  const canSort = canSortRowColumn(base)
  if (!canSort) return []
  const directions: SortDirection[] = ['asc', 'desc']
  return directions.map((direction) => ({
    icon: direction === 'asc' ? ArrowDownAZIcon : ArrowDownZAIcon,
    label: SORT_LABELS[props.orientation][direction],
    disabled: !canSort,
    onClick: () => sortRowColumn({ ...base, direction }),
  }))
})

// -------- clear
const clear = computed(() => {
  const base = args.value
  const can = canClearRowColumnContent(base)
  const selectionType = getTableSelectionType(
    editor.value,
    props.index,
    props.orientation,
    props.tablePos,
  )
  return {
    visible: isClearRowColumnVisible(base) && can,
    enabled: can,
    label: selectionType ? CLEAR_LABELS[selectionType.orientation] : 'Clear contents',
    run: () => clearRowColumnContent({ ...base, resetAttrs: true }),
  }
})

// -------- duplicate / delete
const duplicate = computed(() => {
  const base = args.value
  return {
    enabled: canDuplicateRowColumn(base),
    label: DUPLICATE_LABELS[props.orientation],
    run: () => duplicateRowColumn(base),
  }
})

const del = computed(() => {
  const base = args.value
  return {
    enabled: canDeleteRowColumn(base),
    label: DELETE_LABELS[props.orientation],
    run: () => deleteRowColumn(base),
  }
})
</script>
