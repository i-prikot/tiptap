<template>
  <div class="tiptap-combobox-list" :style="{ minWidth: '15rem' }">
    <TableHandleMenuActionGroup :actions="headerItems" :show-separator="true" />
    <TableHandleMenuActionGroup :actions="moveItems" :show-separator="true" />
    <TableHandleMenuActionGroup :actions="addItems" :show-separator="true" />
    <TableHandleMenuActionGroup :actions="sortItems" :show-separator="true" />

    <MenuGroup>
      <ColorMenu />
      <TableAlignMenu :index="index" :orientation="orientation" />
      <TableHandleMenuAction v-if="clearAction" :action="clearAction" />
    </MenuGroup>
    <Separator orientation="horizontal" />

    <TableHandleMenuActionGroup :actions="footerItems" />
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
import { MenuGroup, Separator } from '../../primitives'

import { ColorMenu } from '../../ui'
import { TableAlignMenu } from '../table-align'

import TableHandleMenuAction from './TableHandleMenuAction.vue'
import TableHandleMenuActionGroup from './TableHandleMenuActionGroup.vue'
import { useTiptapEditor, useEditorSelectionSignal } from '../../../composables'

import type { Orientation } from '../../../utils/table-utils'
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
} from '../../../utils/table-actions'
import type { AddSide, MoveDirection, SortDirection } from '../../../utils/table-actions'
import type { EditorMenuActionItem } from '../../../types/menu'
import { getTableSelectionType } from '../../../utils/table-utils'
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
} from '../../../icons'

type TableHandleMenuActionRecord = EditorMenuActionItem & {
  id: string
  isActive?: boolean
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

const headerItems = computed<TableHandleMenuActionRecord[]>(() => {
  const base = args.value
  const canToggle = canToggleHeaderRowColumn(base)
  if (!canToggle || props.index !== 0) return []
  return [
    {
      id: 'toggle-header',
      icon: props.orientation === 'row' ? TableHeaderRowIcon : TableHeaderColumnIcon,
      label: HEADER_LABELS[props.orientation],
      disabled: !canToggle,
      isActive: isHeaderRowColumnActive(base),
      onClick: () => toggleHeaderRowColumn(base),
    },
  ]
})

const MOVE_ICONS: Record<MoveDirection, FunctionalComponent> = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
}

const moveItems = computed<TableHandleMenuActionRecord[]>(() => {
  const base = args.value
  const directions: MoveDirection[] =
    props.orientation === 'row' ? ['up', 'down'] : ['left', 'right']
  return directions
    .map((direction): TableHandleMenuActionRecord | null => {
      const can = canMoveRowColumn({ ...base, direction })
      return can
        ? {
            id: `move-${direction}`,
            icon: MOVE_ICONS[direction],
            label: MOVE_LABELS[props.orientation][direction],
            disabled: !can,
            onClick: () => moveRowColumn({ ...base, direction }),
          }
        : null
    })
    .filter((item): item is TableHandleMenuActionRecord => !!item)
})

const addItems = computed<TableHandleMenuActionRecord[]>(() => {
  const base = args.value
  const sides: AddSide[] = props.orientation === 'row' ? ['above', 'below'] : ['left', 'right']
  return sides
    .map((side): TableHandleMenuActionRecord | null => {
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
      return {
        id: `add-${side}`,
        icon,
        label,
        disabled: !can,
        onClick: () => addRowColumn({ ...base, side }),
      }
    })
    .filter((item): item is TableHandleMenuActionRecord => !!item)
})

const sortItems = computed<TableHandleMenuActionRecord[]>(() => {
  const base = args.value
  const canSort = canSortRowColumn(base)
  if (!canSort) return []
  const directions: SortDirection[] = ['asc', 'desc']
  return directions.map((direction) => ({
    id: `sort-${direction}`,
    icon: direction === 'asc' ? ArrowDownAZIcon : ArrowDownZAIcon,
    label: SORT_LABELS[props.orientation][direction],
    disabled: !canSort,
    onClick: () => sortRowColumn({ ...base, direction }),
  }))
})

const clearAction = computed<TableHandleMenuActionRecord | null>(() => {
  const base = args.value
  const can = canClearRowColumnContent(base)
  if (!isClearRowColumnVisible(base) || !can) return null
  const selectionType = getTableSelectionType(
    editor.value,
    props.index,
    props.orientation,
    props.tablePos,
  )
  return {
    id: 'clear-contents',
    icon: SquareXIcon,
    label: selectionType ? CLEAR_LABELS[selectionType.orientation] : 'Clear contents',
    disabled: !can,
    onClick: () => clearRowColumnContent({ ...base, resetAttrs: true }),
  }
})

const footerItems = computed<TableHandleMenuActionRecord[]>(() => {
  const base = args.value
  const canDuplicate = canDuplicateRowColumn(base)
  const canDelete = canDeleteRowColumn(base)
  return [
    {
      id: 'duplicate',
      icon: CopyIcon,
      label: DUPLICATE_LABELS[props.orientation],
      disabled: !canDuplicate,
      onClick: () => duplicateRowColumn(base),
    },
    {
      id: 'delete',
      icon: TrashIcon,
      label: DELETE_LABELS[props.orientation],
      disabled: !canDelete,
      onClick: () => deleteRowColumn(base),
    },
  ]
})
</script>
