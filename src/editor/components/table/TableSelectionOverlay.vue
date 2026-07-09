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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { CellSelection, cellAround, columnResizingPluginKey } from '@tiptap/pm/tables'
import { useFloating } from '@floating-ui/vue'
import type { VirtualElement } from '@floating-ui/vue'
import TableCellHandleMenu from './TableCellHandleMenu.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { domCellAround, getTable, rectEq } from '../../utils/table-utils'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const props = withDefaults(defineProps<{ showResizeHandles?: boolean }>(), {
  showResizeHandles: true,
})

const emit = defineEmits<{ menuOpenChange: [value: boolean] }>()

const editor = useTiptapEditor()

const visible = ref(true)
const selectionRect = ref<DOMRect | null>(null)
const activeCorner = ref<Corner | null>(null)
const menuOpen = ref(false)
const tableDom = ref<HTMLElement | null>(null)
const anchorCellPos = ref<number | null>(null)

const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

const overlayContainer = computed(
  () => tableDom.value?.querySelector<HTMLElement>('.table-selection-overlay-container') ?? null,
)

const floatingRef = ref<HTMLElement | null>(null)
const reference = ref<VirtualElement>({
  getBoundingClientRect: () => selectionRect.value ?? new DOMRect(),
})
const { floatingStyles, update } = useFloating(reference, floatingRef, { placement: 'top-start' })

watch([selectionRect, floatingRef], () => update())

/** Прямоугольник текущего выделения ячеек (union rect). */
function computeSelectionRect() {
  const instance = editor.value
  if (!instance) return
  const { selection } = instance.state
  if (selection instanceof CellSelection) {
    const domNodes: HTMLElement[] = []
    selection.forEachCell((_, pos) => {
      const dom = instance.view.nodeDOM(pos) as HTMLElement | null
      if (dom) domNodes.push(dom)
    })
    if (domNodes.length === 0) {
      visible.value = false
      if (selectionRect.value) selectionRect.value = null
      return
    }
    const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    domNodes.forEach((dom) => {
      const rect = dom.getBoundingClientRect()
      bounds.left = Math.min(bounds.left, rect.left)
      bounds.top = Math.min(bounds.top, rect.top)
      bounds.right = Math.max(bounds.right, rect.right)
      bounds.bottom = Math.max(bounds.bottom, rect.bottom)
    })
    const rect = new DOMRect(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
    )
    if (!rectEq(selectionRect.value, rect)) selectionRect.value = rect
    visible.value = true
    return
  }
  const $cell = cellAround(selection.$anchor)
  if ($cell) {
    const dom = instance.view.nodeDOM($cell.pos) as HTMLElement | null
    if (dom) {
      const domRect = dom.getBoundingClientRect()
      const rect = new DOMRect(domRect.left, domRect.top, domRect.width, domRect.height)
      if (!rectEq(selectionRect.value, rect)) selectionRect.value = rect
      visible.value = true
      return
    }
  }
  visible.value = false
  if (selectionRect.value) selectionRect.value = null
}

function updateTableDom() {
  const instance = editor.value
  if (!instance) {
    tableDom.value = null
    return
  }
  const table = getTable(instance)
  tableDom.value = table ? ((instance.view.nodeDOM(table.pos) as HTMLElement | null) ?? null) : null
}

// -------- слежение за ресайзом столбцов (rAF, пока тянется ручка)
let rafId: number | null = null

function stopResizeTracking() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function trackColumnResize() {
  if (rafId !== null) return
  const tick = () => {
    const instance = editor.value
    if (!instance) return
    const resizeState = columnResizingPluginKey.getState(instance.state)
    const dragging = !!(resizeState as { dragging?: unknown } | undefined)?.dragging
    computeSelectionRect()
    if (dragging) rafId = requestAnimationFrame(tick)
    else {
      stopResizeTracking()
      computeSelectionRect()
    }
  }
  rafId = requestAnimationFrame(tick)
}

// -------- подписки на редактор
let cleanups: Array<() => void> = []
watch(
  editor,
  (instance) => {
    cleanups.forEach((fn) => fn())
    cleanups = []
    if (!instance) return
    const onSelectionUpdate = () => {
      computeSelectionRect()
      updateTableDom()
    }
    const onTransaction = ({ transaction }: { transaction: { getMeta(key: unknown): any } }) => {
      computeSelectionRect()
      const meta = transaction.getMeta(columnResizingPluginKey)
      if (meta) {
        if (Object.prototype.hasOwnProperty.call(meta, 'setDragging') && meta.setDragging)
          trackColumnResize()
        if (Object.prototype.hasOwnProperty.call(meta, 'setDragging') && meta.setDragging == null) {
          stopResizeTracking()
          computeSelectionRect()
        }
        if (Object.prototype.hasOwnProperty.call(meta, 'setHandle')) computeSelectionRect()
      }
    }
    instance.on('selectionUpdate', onSelectionUpdate)
    instance.on('transaction', onTransaction as never)
    computeSelectionRect()
    updateTableDom()
    cleanups.push(() => {
      instance.off('selectionUpdate', onSelectionUpdate)
      instance.off('transaction', onTransaction as never)
      stopResizeTracking()
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => cleanups.forEach((fn) => fn()))

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
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onMenuOpenChange(open: boolean) {
  menuOpen.value = open
  emit('menuOpenChange', open)
}
</script>
