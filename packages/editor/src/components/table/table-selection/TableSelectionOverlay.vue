<template>
  <Teleport v-if="visible && selectionRect && overlayContainer" :to="overlayContainer">
    <div ref="floatingRef" :style="{ ...floatingStyles, pointerEvents: 'none', zIndex: 10 }">
      <div class="tiptap-table-selection-overlay">
        <div
          :style="{
            position: 'absolute',
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            zIndex: 2,
            /*borderRadius: '2px',*/ /* TODO: убрать радиус, если в таблице нет border-radius */
            top: 0,
            left: 0,
          }"
        />
        <div
          :style="{
            position: 'absolute',
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            border: '2px solid var(--tt-brand-color-400)',
            /*borderRadius: '2px',*/ /* TODO: убрать радиус, если в таблице нет border-radius */
            zIndex: 3,
            top: 0,
            left: 0,
          }"
        >
          <span style="pointer-events: auto" @mousedown.stop>
            <TableCellHandleMenu
              @open-change="onMenuOpenChange"
              @resize-start="startResize('br', $event)"
            />
          </span>
          <template v-if="showResizeHandles">
            <div
              v-for="corner in corners"
              :key="corner"
              :style="cornerStyle(corner)"
              @mousedown="startResize(corner, $event)"
            />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Рамка вокруг выделенных ячеек таблицы с угловыми точками ресайза
 * выделения и грип-меню ячейки. Телепортируется в
 * .table-selection-overlay-container внутри NodeView таблицы.
 * Порт TableSelectionOverlay из чанка 34p294mqk5mqb (модуль 41674).
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { CellSelection, cellAround, columnResizingPluginKey } from '@tiptap/pm/tables'
import { useFloating } from '@floating-ui/vue'
import type { VirtualElement } from '@floating-ui/vue'
import { TableCellHandleMenu } from '../table-cell-handle'
import { useRafLoop, useTableSelectionRect, useTiptapEditor } from '../../../composables'
import { domCellAround } from '../../../utils/table-utils'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

interface ColumnResizeTransactionPayload {
  transaction: {
    getMeta(key: typeof columnResizingPluginKey): unknown
  }
}

interface ColumnResizePluginMeta {
  setDragging?: unknown | null
  setHandle?: unknown | null
}

function isColumnResizePluginMeta(meta: unknown): meta is ColumnResizePluginMeta {
  return typeof meta === 'object' && meta !== null
}

const props = withDefaults(defineProps<{ showResizeHandles?: boolean }>(), {
  showResizeHandles: true,
})

const emit = defineEmits<{ menuOpenChange: [value: boolean] }>()

const editor = useTiptapEditor()

const {
  visible,
  selectionRect,
  tableDom,
  refresh: refreshTableSelection,
} = useTableSelectionRect(editor)
const activeCorner = ref<Corner | null>(null)
const menuOpen = ref(false)
const anchorCellPos = ref<number | null>(null)
let stopCornerResize: (() => void) | null = null

const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

const overlayContainer = computed(
  () => tableDom.value?.querySelector<HTMLElement>('.table-selection-overlay-container') ?? null,
)

const floatingRef = shallowRef<HTMLElement | null>(null)
const reference = shallowRef<VirtualElement>({
  getBoundingClientRect: () => selectionRect.value ?? new DOMRect(),
})
const { floatingStyles, update } = useFloating(reference, floatingRef, { placement: 'top-start' })

watch([selectionRect, floatingRef], () => update(), { flush: 'post' })

const { start: startResizeTracking, stop: stopResizeTracking } = useRafLoop(() => {
  const instance = editor.value
  if (!instance) return false

  refreshTableSelection()
  const resizeState = columnResizingPluginKey.getState(instance.state)
  return !!(resizeState as { dragging?: unknown } | undefined)?.dragging
})

// -------- подписки на редактор
let cleanup: (() => void) | null = null
watch(
  editor,
  (instance) => {
    stopResizeTracking()
    cleanup?.()
    cleanup = null
    if (!instance) {
      refreshTableSelection()
      return
    }
    const onSelectionUpdate = () => refreshTableSelection()
    const onTransaction = ({ transaction }: ColumnResizeTransactionPayload) => {
      refreshTableSelection()
      const meta = transaction.getMeta(columnResizingPluginKey)
      if (isColumnResizePluginMeta(meta)) {
        if (Object.prototype.hasOwnProperty.call(meta, 'setDragging') && meta.setDragging)
          startResizeTracking()
        if (Object.prototype.hasOwnProperty.call(meta, 'setDragging') && meta.setDragging == null) {
          stopResizeTracking()
          refreshTableSelection()
        }
        if (Object.prototype.hasOwnProperty.call(meta, 'setHandle')) refreshTableSelection()
      }
    }
    instance.on('selectionUpdate', onSelectionUpdate)
    instance.on('transaction', onTransaction as never)
    refreshTableSelection()
    cleanup = () => {
      instance.off('selectionUpdate', onSelectionUpdate)
      instance.off('transaction', onTransaction as never)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  cleanup?.()
  stopResizeTracking()
  stopCornerResize?.()
  stopCornerResize = null
})

// -------- угловые точки: ресайз выделения перетаскиванием
function cornerStyle(corner: Corner): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    zIndex: 10,
  }
  const positions: Record<Corner, CSSProperties> = {
    tl: { top: '-7.5px', left: '-7.5px', cursor: menuOpen.value ? 'default' : 'nwse-resize' },
    tr: { top: '-7.5px', right: '-7.5px', cursor: menuOpen.value ? 'default' : 'nesw-resize' },
    bl: { bottom: '-7.5px', left: '-7.5px', cursor: menuOpen.value ? 'default' : 'nesw-resize' },
    br: { bottom: '-7.5px', right: '-7.5px', cursor: menuOpen.value ? 'default' : 'nwse-resize' },
  }
  const highlighted = !activeCorner.value || activeCorner.value === corner
  return {
    ...base,
    ...positions[corner],
    opacity: menuOpen.value ? 0.3 : highlighted ? 1 : 0.5,
    pointerEvents: menuOpen.value ? 'none' : 'auto',
  }
}

/** Позиция противоположного угла выделения — якорь при ресайзе. */
function findAnchorCell(corner: Corner): number | null {
  const instance = editor.value
  const rect = selectionRect.value
  if (!instance || !rect) return null
  const { selection } = instance.state
  let cellSelection: CellSelection | null = null
  if (selection instanceof CellSelection) cellSelection = selection
  else {
    const $cell = cellAround(selection.$anchor)
    if ($cell) {
      try {
        cellSelection = CellSelection.create(instance.state.doc, $cell.pos, $cell.pos)
      } catch (error) {
        console.warn('Could not create single cell selection for resize:', error)
        return null
      }
    }
  }
  if (!cellSelection) return null
  const cornersFound: Record<string, number | null> = {
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
  }
  const near = (a: number, b: number) => Math.abs(a - b) < 5
  cellSelection.forEachCell((_, pos) => {
    const dom = instance.view.nodeDOM(pos) as HTMLElement | null
    if (!dom) return
    const cellRect = dom.getBoundingClientRect()
    if (near(cellRect.left, rect.left) && near(cellRect.top, rect.top)) cornersFound.topLeft = pos
    if (near(cellRect.right, rect.right) && near(cellRect.top, rect.top))
      cornersFound.topRight = pos
    if (near(cellRect.left, rect.left) && near(cellRect.bottom, rect.bottom))
      cornersFound.bottomLeft = pos
    if (near(cellRect.right, rect.right) && near(cellRect.bottom, rect.bottom))
      cornersFound.bottomRight = pos
  })
  const opposite: Record<Corner, string> = {
    tl: 'bottomRight',
    tr: 'bottomLeft',
    bl: 'topRight',
    br: 'topLeft',
  }
  return cornersFound[opposite[corner]]
}

function startResize(corner: Corner, event: MouseEvent) {
  const instance = editor.value
  if (!instance || !selectionRect.value || menuOpen.value || !props.showResizeHandles) return
  stopCornerResize?.()
  stopCornerResize = null
  event.preventDefault()
  event.stopPropagation()
  const anchor = findAnchorCell(corner)
  if (anchor === null) return
  activeCorner.value = corner
  anchorCellPos.value = anchor

  const onMove = (moveEvent: MouseEvent) => {
    if (!instance || anchorCellPos.value == null) return
    const cellInfo = domCellAround(moveEvent.target)
    if (!cellInfo || cellInfo.type !== 'cell') return
    const coords = instance.view.posAtCoords({ left: moveEvent.clientX, top: moveEvent.clientY })
    if (coords == null) return
    const $pos = instance.state.doc.resolve(coords.pos)
    const $cell = cellAround($pos)
    if (!$cell) return
    try {
      const cellSelection = CellSelection.create(instance.state.doc, anchorCellPos.value, $cell.pos)
      instance.view.dispatch(instance.state.tr.setSelection(cellSelection))
    } catch {
      /* невалидная пара ячеек — игнорируем */
    }
  }
  const onUp = () => {
    activeCorner.value = null
    anchorCellPos.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    stopCornerResize = null
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  stopCornerResize = onUp
}

function onMenuOpenChange(open: boolean) {
  menuOpen.value = open
  emit('menuOpenChange', open)
}
</script>
