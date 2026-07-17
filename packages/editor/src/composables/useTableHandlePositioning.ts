/**
 * Позиционирование ручек строк/столбцов и extend-кнопок таблицы на
 * floating-ui с виртуальным reference по rect'ам из TableHandleState.
 * Порт useTableHandlePositioning (чанк 3gf8l96fmxb-u, модуль 783422) и
 * позиционирования extend-кнопок (чанк 34p294mqk5mqb, модуль 976237).
 */
import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { offset, size, useFloating } from '@floating-ui/vue'
import type { VirtualElement } from '@floating-ui/vue'
import { clamp } from '../utils/table-utils'
import type { TableDraggingState } from '../extensions/table-handle'

export type HandleOrientation = 'row' | 'col'

export interface HandlePositioning {
  floatingRef: Ref<HTMLElement | null>
  style: ComputedRef<Record<string, string>>
}

function handleReferenceRect(
  orientation: HandleOrientation,
  cell: DOMRect,
  table: DOMRect,
  dragging?: TableDraggingState | null,
): DOMRect {
  switch (orientation) {
    case 'row': {
      if (dragging?.draggedCellOrientation === 'row') {
        const pos = dragging.mousePos + (dragging.initialOffset ?? 0)
        const y = clamp(pos, table.y, table.bottom - cell.height)
        return new DOMRect(table.x, y, table.width, cell.height)
      }
      return new DOMRect(table.x, cell.y, table.width, cell.height)
    }
    case 'col': {
      if (dragging?.draggedCellOrientation === 'col') {
        const pos = dragging.mousePos + (dragging.initialOffset ?? 0)
        return new DOMRect(
          clamp(pos, table.x, table.right - cell.width),
          table.y,
          cell.width,
          table.height,
        )
      }
      return new DOMRect(cell.x, table.y, cell.width, table.height)
    }
  }
}

/** Ручка строки (слева) или столбца (сверху). */
export function useTableHandlePosition(
  orientation: HandleOrientation,
  open: ComputedRef<boolean>,
  cellRect: ComputedRef<DOMRect | null | undefined>,
  tableRect: ComputedRef<DOMRect | null | undefined>,
  draggingState: ComputedRef<TableDraggingState | null | undefined>,
): HandlePositioning {
  const floatingRef = ref<HTMLElement | null>(null)
  const reference = ref<VirtualElement>({
    getBoundingClientRect: () => {
      const cell = cellRect.value
      const table = tableRect.value
      if (!cell || !table) return new DOMRect()
      return handleReferenceRect(orientation, cell, table, draggingState.value)
    },
  })

  const { floatingStyles, update } = useFloating(reference, floatingRef, {
    open,
    placement: orientation === 'row' ? 'left' : 'top',
    middleware: [
      offset(4),
      size({
        apply({ rects, elements }) {
          if (!elements.floating) return
          const cell = cellRect.value
          const table = tableRect.value
          const width =
            (orientation === 'col' ? (cell?.width ?? table?.width) : table?.width) ??
            rects.reference.width
          const height =
            (orientation === 'row' ? (cell?.height ?? table?.height) : table?.height) ??
            rects.reference.height
          elements.floating.style.setProperty('--table-handle-ref-width', `${width}px`)
          elements.floating.style.setProperty('--table-handle-ref-height', `${height}px`)
          elements.floating.style.setProperty(
            '--table-handle-available-size',
            `${orientation === 'row' ? height : width}px`,
          )
        },
      }),
    ],
  })

  watch([open, cellRect, tableRect, draggingState, floatingRef], () => update())

  const style = computed<Record<string, string>>(() => ({
    display: 'flex',
    ...(floatingStyles.value as Record<string, string>),
  }))
  return { floatingRef, style }
}

/** Кнопка расширения: строка — под таблицей, столбец — справа. */
export function useTableExtendPosition(
  orientation: 'row' | 'column',
  open: ComputedRef<boolean>,
  tableRect: ComputedRef<DOMRect | null | undefined>,
): HandlePositioning {
  const floatingRef = ref<HTMLElement | null>(null)
  const reference = ref<VirtualElement>({
    getBoundingClientRect: () => tableRect.value ?? new DOMRect(),
  })
  const sizeProperty = orientation === 'row' ? 'width' : 'height'

  const { floatingStyles, update } = useFloating(reference, floatingRef, {
    open,
    placement: orientation === 'row' ? 'bottom' : 'right',
    middleware: [
      offset(4),
      size({
        apply({ rects, elements }) {
          if (!elements.floating) return
          elements.floating.style[sizeProperty] = `${rects.reference[sizeProperty]}px`
        },
      }),
    ],
  })

  watch([open, tableRect, floatingRef], () => update())

  const style = computed<Record<string, string>>(() => ({
    display: 'flex',
    ...(floatingStyles.value as Record<string, string>),
  }))
  return { floatingRef, style }
}
