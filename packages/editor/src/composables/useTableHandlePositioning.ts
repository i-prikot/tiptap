/**
 * Позиционирование ручек строк/столбцов и extend-кнопок таблицы на floating-ui.
 *
 * Обе composable-функции используют virtual reference из DOMRect, полученных
 * через `TableHandleState`, поэтому не требуют реального anchor-элемента. При
 * отсутствии геометрии возвращается пустой прямоугольник: UI может оставаться
 * смонтированным, но не должен интерпретировать его как валидную позицию таблицы.
 */
import { computed, shallowRef, watch } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { offset, size, useFloating } from '@floating-ui/vue'
import type { VirtualElement } from '@floating-ui/vue'
import { clamp } from '../utils/table-utils'
import type { TableDraggingState } from '../extensions/table-handle'

export type HandleOrientation = 'row' | 'col'

export interface HandlePositioning {
  floatingRef: ShallowRef<HTMLElement | null>
  style: ComputedRef<Record<string, string>>
}

/**
 * Строит virtual reference для ручки из текущих rect ячейки и таблицы.
 *
 * Во время drag используется позиция указателя вместе с `initialOffset`, но
 * координата ограничивается границами таблицы так, чтобы размер ручки не вышел
 * за `tbody`. В остальных ветках геометрия берётся из текущей ячейки под
 * указателем: drag-over обновляет её rect и индексы строки и столбца.
 */
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

/**
 * Возвращает refs и стили floating-ui для ручки строки (слева) или столбца
 * (сверху).
 *
 * Middleware `size` передаёт вычисленные размеры reference через CSS custom
 * properties, а не задаёт размеры компонента напрямую. Watch с `flush: 'post'`
 * вызывает `update()` после рендера при смене видимости, DOMRect, drag-state
 * или floating-элемента — это необходимо, потому что rect реактивен, но не
 * является DOM reference, отслеживаемым floating-ui автоматически.
 */
export function useTableHandlePosition(
  orientation: HandleOrientation,
  open: ComputedRef<boolean>,
  cellRect: ComputedRef<DOMRect | null | undefined>,
  tableRect: ComputedRef<DOMRect | null | undefined>,
  draggingState: ComputedRef<TableDraggingState | null | undefined>,
): HandlePositioning {
  const floatingRef = shallowRef<HTMLElement | null>(null)
  const reference = shallowRef<VirtualElement>({
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
        /**
         * Экспортирует размеры virtual reference в CSS. Fallback на `rects.reference`
         * сохраняет предсказуемую геометрию, если свежий cell/table rect ещё
         * недоступен после транзакции или DOM-обновления.
         */
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

  watch([open, cellRect, tableRect, draggingState, floatingRef], () => update(), { flush: 'post' })

  const style = computed<Record<string, string>>(() => ({
    display: 'flex',
    ...(floatingStyles.value as Record<string, string>),
  }))
  return { floatingRef, style }
}

/**
 * Возвращает positioning для кнопки расширения: строка — под таблицей, столбец
 * — справа.
 *
 * Виртуальный reference равен rect всей таблицы; при его отсутствии используется
 * пустой прямоугольник. Middleware синхронизирует ширину или высоту кнопки с
 * reference, а post-render watcher пересчитывает позицию после появления
 * floating-элемента и изменений таблицы.
 */
export function useTableExtendPosition(
  orientation: 'row' | 'column',
  open: ComputedRef<boolean>,
  tableRect: ComputedRef<DOMRect | null | undefined>,
): HandlePositioning {
  const floatingRef = shallowRef<HTMLElement | null>(null)
  const reference = shallowRef<VirtualElement>({
    getBoundingClientRect: () => tableRect.value ?? new DOMRect(),
  })
  const sizeProperty = orientation === 'row' ? 'width' : 'height'

  const { floatingStyles, update } = useFloating(reference, floatingRef, {
    open,
    placement: orientation === 'row' ? 'bottom' : 'right',
    middleware: [
      offset(4),
      size({
        /**
         * Сохраняет размер extend-кнопки равным соответствующей стороне таблицы.
         */
        apply({ rects, elements }) {
          if (!elements.floating) return
          elements.floating.style[sizeProperty] = `${rects.reference[sizeProperty]}px`
        },
      }),
    ],
  })

  watch([open, tableRect, floatingRef], () => update(), { flush: 'post' })

  const style = computed<Record<string, string>>(() => ({
    display: 'flex',
    ...(floatingStyles.value as Record<string, string>),
  }))
  return { floatingRef, style }
}
