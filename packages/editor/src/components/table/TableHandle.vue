<template>
  <Teleport v-if="state && state.widgetContainer" :to="state.widgetContainer">
    <!-- Ручка строки -->
    <div v-if="showRowHandle" :ref="rowPosition.floatingRef" :style="rowPosition.style.value">
      <Menu
        :open="openHandle === 'row'"
        placement="top-start"
        @update:open="(value) => onMenuToggle('row', value)"
      >
        <template #trigger>
          <button
            type="button"
            :class="[
              'tiptap-table-handle-menu',
              'row',
              openHandle === 'row' && 'menu-opened',
              draggingRow && 'is-dragging',
            ]"
            draggable="true"
            aria-label="Row actions"
            aria-haspopup="menu"
            :aria-expanded="openHandle === 'row'"
            @dragstart="onRowDragStart"
            @dragend="onDragEnd"
          >
            <MoreVerticalIcon class="tiptap-button-icon" />
          </button>
        </template>
        <MenuContent @close="onMenuToggle('row', false)">
          <TableHandleMenuContent
            v-if="typeof state.rowIndex === 'number'"
            :index="state.rowIndex"
            orientation="row"
            :table-pos="state.blockPos"
          />
        </MenuContent>
      </Menu>
    </div>

    <!-- Ручка столбца -->
    <div v-if="showColHandle" :ref="colPosition.floatingRef" :style="colPosition.style.value">
      <Menu
        :open="openHandle === 'column'"
        placement="bottom-start"
        @update:open="(value) => onMenuToggle('column', value)"
      >
        <template #trigger>
          <button
            type="button"
            :class="[
              'tiptap-table-handle-menu',
              'column',
              openHandle === 'column' && 'menu-opened',
              draggingCol && 'is-dragging',
            ]"
            draggable="true"
            aria-label="Column actions"
            aria-haspopup="menu"
            :aria-expanded="openHandle === 'column'"
            @dragstart="onColDragStart"
            @dragend="onDragEnd"
          >
            <MoreVerticalIcon class="tiptap-button-icon" />
          </button>
        </template>
        <MenuContent @close="onMenuToggle('column', false)">
          <TableHandleMenuContent
            v-if="typeof state.colIndex === 'number'"
            :index="state.colIndex"
            orientation="column"
            :table-pos="state.blockPos"
          />
        </MenuContent>
      </Menu>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Ручки строки/столбца таблицы: позиционируются по hover-состоянию
 * TableHandleExtension, тянутся (drag&drop перестановка) и открывают
 * меню действий. Порт TableHandle из чанка 3gf8l96fmxb-u (функции O/B/I).
 */
import { computed, ref, watch } from 'vue'
import { TableMap } from '@tiptap/pm/tables'
import { Menu, MenuContent } from '../primitives'

import TableHandleMenuContent from './TableHandleMenuContent.vue'
import { useTiptapEditor, useTableHandleState, useTableHandlePosition } from '../../composables'

import { colDragStart, dragEnd, rowDragStart } from '../../extensions/table-handle'
import { selectCellsByCoords } from '../../utils/table-utils'
import { isValidPosition } from '../../utils/tiptap-utils'
import { MoreVerticalIcon } from '../../icons'

const editor = useTiptapEditor()
const state = useTableHandleState(editor)

const openHandle = ref<'row' | 'column' | null>(null)
const draggingRow = ref(false)
const draggingCol = ref(false)

const cellRect = computed(() => state.value?.referencePosCell ?? null)
const tableRect = computed(() => state.value?.referencePosTable ?? null)
const draggingState = computed(() => state.value?.draggingState ?? null)
const show = computed(() => state.value?.show ?? false)

const rowPosition = useTableHandlePosition('row', show, cellRect, tableRect, draggingState)
const colPosition = useTableHandlePosition('col', show, cellRect, tableRect, draggingState)

const showRowHandle = computed(
  () =>
    (show.value && typeof state.value?.rowIndex === 'number' && openHandle.value !== 'column') ||
    openHandle.value === 'row',
)
const showColHandle = computed(
  () =>
    (show.value && typeof state.value?.colIndex === 'number' && openHandle.value !== 'row') ||
    openHandle.value === 'column',
)

/** Открытие меню: заморозить ручки и выделить строку/столбец целиком. */
function selectLine(orientation: 'row' | 'column') {
  const instance = editor.value
  const current = state.value
  if (!instance || !current?.block || !isValidPosition(current.blockPos)) return
  const index = orientation === 'row' ? current.rowIndex : current.colIndex
  if (!isValidPosition(index)) return
  try {
    const { width, height } = TableMap.get(current.block)
    const from = orientation === 'row' ? { row: index!, col: 0 } : { row: 0, col: index! }
    const to =
      orientation === 'row' ? { row: index!, col: width - 1 } : { row: height - 1, col: index! }
    selectCellsByCoords(instance, current.blockPos, [from, to], {
      mode: 'dispatch',
      dispatch: instance.view.dispatch.bind(instance.view),
    })
  } catch (error) {
    console.warn('Failed to select row/column:', error)
  }
}

function onMenuToggle(orientation: 'row' | 'column', open: boolean) {
  const instance = editor.value
  if (!instance) return
  if (open) {
    openHandle.value = orientation
    instance.commands.freezeHandles()
    selectLine(orientation)
  } else if (openHandle.value === orientation) {
    openHandle.value = null
    instance.commands.unfreezeHandles()
  }
}

function onRowDragStart(event: DragEvent) {
  draggingRow.value = true
  rowDragStart(event)
}

function onColDragStart(event: DragEvent) {
  draggingCol.value = true
  colDragStart(event)
}

function onDragEnd() {
  draggingRow.value = false
  draggingCol.value = false
  dragEnd()
}

// пропали ручки (state.show=false при закрытом меню) — сбросить драг-флаги
watch(show, (visible) => {
  if (!visible) {
    draggingRow.value = false
    draggingCol.value = false
  }
})
</script>
