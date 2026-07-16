<template>
  <Teleport v-if="state && state.widgetContainer" :to="state.widgetContainer">
    <div :ref="rowPosition.floatingRef" :style="rowButtonStyle">
      <button
        v-if="editor?.isEditable"
        type="button"
        :class="[
          'tiptap-table-extend-row-column-button',
          'tiptap-table-row-end-add-remove',
          rowEditing && 'editing',
        ]"
        aria-label="Add or remove rows"
        @click="onClick('row')"
        @mousedown="onMouseDown('row', $event)"
      >
        <PlusSmallIcon class="tiptap-button-icon" />
      </button>
    </div>
    <div :ref="colPosition.floatingRef" :style="colButtonStyle">
      <button
        v-if="editor?.isEditable"
        type="button"
        :class="[
          'tiptap-table-extend-row-column-button',
          'tiptap-table-column-end-add-remove',
          colEditing && 'editing',
        ]"
        aria-label="Add or remove columns"
        @click="onClick('column')"
        @mousedown="onMouseDown('column', $event)"
      >
        <PlusSmallIcon class="tiptap-button-icon" />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Кнопки «+» у нижнего/правого края таблицы: клик добавляет строку или
 * столбец, перетаскивание — добавляет/убирает несколько (пустые с конца).
 * Порт TableExtendRowColumnButtons из чанка 34p294mqk5mqb (модуль 976237).
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { TableMap } from '@tiptap/pm/tables'
import { useTiptapEditor, useTableHandleState, useTableExtendPosition } from '@/editor/composables'

import {
  EMPTY_CELL_HEIGHT,
  EMPTY_CELL_WIDTH,
  countEmptyColumnsFromEnd,
  countEmptyRowsFromEnd,
  marginRound,
  runPreservingCursor,
  selectLastCell,
} from '../../utils/table-utils'
import { PlusSmallIcon } from '../../icons'

interface DragBase {
  startPos: number
  originalHeight: number
  originalWidth: number
}

const editor = useTiptapEditor()
const state = useTableHandleState(editor)

const tableRect = computed(() => state.value?.referencePosTable ?? null)
const showRow = computed(() => state.value?.showAddOrRemoveRowsButton ?? false)
const showCol = computed(() => state.value?.showAddOrRemoveColumnsButton ?? false)

const rowPosition = useTableExtendPosition('row', showRow, tableRect)
const colPosition = useTableExtendPosition('column', showCol, tableRect)

const rowDrag = ref<DragBase | null>(null)
const colDrag = ref<DragBase | null>(null)
const rowEditing = computed(() => !!rowDrag.value)
const colEditing = computed(() => !!colDrag.value)
// был ли mousemove с момента mousedown (тогда клик не добавляет)
let moved = false

const rowButtonStyle = computed(() => ({
  ...rowPosition.style.value,
  ...(showRow.value || rowEditing.value ? {} : { display: 'none' }),
}))
const colButtonStyle = computed(() => ({
  ...colPosition.style.value,
  ...(showCol.value || colEditing.value ? {} : { display: 'none' }),
}))

function onClick(orientation: 'row' | 'column') {
  const instance = editor.value
  const current = state.value
  if (moved || !instance || !current) return
  runPreservingCursor(instance, () => {
    selectLastCell(instance, current.block, current.blockPos, orientation)
    if (orientation === 'row') instance.commands.addRowAfter()
    else instance.commands.addColumnAfter()
  })
}

let cleanup: (() => void) | null = null

function onMouseDown(orientation: 'row' | 'column', event: MouseEvent) {
  const instance = editor.value
  const current = state.value
  if (!instance || !current) return
  const isRow = orientation === 'row'
  const map = TableMap.get(current.block)
  moved = false
  const drag: DragBase = {
    startPos: isRow ? event.clientY : event.clientX,
    originalHeight: map.height,
    originalWidth: map.width,
  }
  if (isRow) rowDrag.value = drag
  else colDrag.value = drag
  instance.commands.freezeHandles()
  event.preventDefault()

  const onMove = (moveEvent: MouseEvent) => {
    moved = true
    const delta = (isRow ? moveEvent.clientY : moveEvent.clientX) - drag.startPos
    const cellSize = isRow ? EMPTY_CELL_HEIGHT : EMPTY_CELL_WIDTH
    const currentMap = TableMap.get(state.value?.block ?? current.block)
    const currentCount = isRow ? currentMap.height : currentMap.width
    const targetCount = Math.max(
      1,
      (isRow ? drag.originalHeight : drag.originalWidth) + marginRound(delta / cellSize, 0.3),
    )
    const diff = targetCount - currentCount
    if (diff === 0) return
    const block = state.value?.block ?? current.block
    const blockPos = state.value?.blockPos ?? current.blockPos
    if (diff > 0) {
      runPreservingCursor(instance, () => {
        selectLastCell(instance, block, blockPos, orientation)
        for (let i = 0; i < diff; i++) {
          if (isRow) instance.commands.addRowAfter()
          else instance.commands.addColumnAfter()
        }
      })
    } else {
      runPreservingCursor(instance, () => {
        const removable = Math.min(
          Math.abs(diff),
          isRow
            ? countEmptyRowsFromEnd(instance, blockPos)
            : countEmptyColumnsFromEnd(instance, blockPos),
          currentCount - 1,
        )
        selectLastCell(instance, block, blockPos, orientation)
        for (let i = 0; i < removable; i++) {
          if (isRow) instance.commands.deleteRow()
          else instance.commands.deleteColumn()
        }
      })
    }
  }
  const onUp = () => {
    if (isRow) rowDrag.value = null
    else colDrag.value = null
    instance.commands.unfreezeHandles()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    cleanup = null
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  cleanup = onUp
}

onBeforeUnmount(() => cleanup?.())
</script>
