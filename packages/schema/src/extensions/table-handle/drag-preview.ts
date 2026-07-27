import type { DraggedCellOrientation, TableHandleDragContext } from './types.js'

const CLONED_STYLE_PROPS = [
  'boxSizing',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textDecoration',
  'textAlign',
  'verticalAlign',
  'whiteSpace',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'backgroundClip',
]

const toKebab = (value: string) => value.replace(/[A-Z]/g, (char) => '-' + char.toLowerCase())

/**
 * Клонирует DOM для drag preview и переносит ограниченный набор computed styles.
 *
 * Клон нужен только браузерному drag image: он не синхронизируется обратно в
 * редактор, а нормализация переполнения и пробелов предотвращает разрастание
 * превью за границы исходной строки/столбца.
 */
function cloneWithStyles(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  const queue: Array<{ src: Element; dst: Element }> = [{ src: source, dst: clone }]
  while (queue.length) {
    const { src, dst } = queue.shift()!
    if (src instanceof HTMLElement && dst instanceof HTMLElement) {
      const computed = getComputedStyle(src)
      for (const prop of CLONED_STYLE_PROPS) {
        const value = computed.getPropertyValue(toKebab(prop))
        if (value) dst.style.setProperty(toKebab(prop), value)
      }
      dst.style.overflow = 'hidden'
      dst.style.textOverflow = 'ellipsis'
      if (computed.whiteSpace === '' || computed.whiteSpace === 'normal')
        dst.style.whiteSpace = 'nowrap'
    }
    const srcChildren = Array.from(src.children)
    const dstChildren = Array.from(dst.children)
    const count = Math.min(srcChildren.length, dstChildren.length)
    for (let index = 0; index < count; index++)
      queue.push({ src: srcChildren[index], dst: dstChildren[index] })
  }
  return clone
}

function copyTableStyles(source: HTMLElement, target: HTMLTableElement) {
  const computed = getComputedStyle(source)
  target.style.borderCollapse = computed.borderCollapse
  target.style.borderSpacing = computed.borderSpacing
  target.style.tableLayout = 'fixed'
  target.className = source.className
}

function copyCellWidth(source: HTMLElement, target: HTMLElement) {
  const rect = source.getBoundingClientRect()
  if (rect.width > 0) {
    target.style.width = `${rect.width}px`
    target.style.maxWidth = `${rect.width}px`
  }
}

/**
 * Собирает изолированное preview выбранной строки с ширинами исходных ячеек.
 * Возвращает `null`, если DOM таблицы или индекс больше не валидны.
 */
function buildRowPreview(table: HTMLElement, rowIndex: number): HTMLTableElement | null {
  const tbody = (table as HTMLTableElement).tBodies?.[0] ?? table.querySelector('tbody')
  if (!tbody) return null
  const row = tbody.rows?.[rowIndex]
  if (!row) return null
  const previewTable = document.createElement('table')
  const previewBody = document.createElement('tbody')
  const clonedRow = cloneWithStyles(row) as HTMLTableRowElement
  copyTableStyles(table, previewTable)
  for (let index = 0; index < row.cells.length; index++) {
    const sourceCell = row.cells[index]
    const clonedCell = clonedRow.cells[index]
    if (clonedCell) copyCellWidth(sourceCell, clonedCell)
  }
  previewBody.appendChild(clonedRow)
  previewTable.appendChild(previewBody)
  return previewTable
}

/**
 * Собирает изолированное preview выбранного столбца с фиксированной шириной.
 * Возвращает `null`, если индекс нельзя сопоставить DOM-ячейкам.
 */
function buildColumnPreview(table: HTMLElement, colIndex: number): HTMLTableElement | null {
  const tbody = (table as HTMLTableElement).tBodies?.[0] ?? table.querySelector('tbody')
  if (!tbody) return null
  const previewTable = document.createElement('table')
  const previewBody = document.createElement('tbody')
  copyTableStyles(table, previewTable)
  let width = 0
  for (let index = 0; index < tbody.rows.length; index++) {
    const row = tbody.rows[index]
    if (!row) continue
    const cell = row.cells?.[colIndex]
    if (!cell) continue
    const previewRow = document.createElement('tr')
    const clonedCell = cloneWithStyles(cell)
    const rect = cell.getBoundingClientRect()
    if (!width && rect.width > 0) width = rect.width
    copyCellWidth(cell, clonedCell)
    previewRow.appendChild(clonedCell)
    previewBody.appendChild(previewRow)
  }
  if (width > 0) {
    previewTable.style.width = `${width}px`
    previewTable.style.maxWidth = `${width}px`
  }
  previewTable.appendChild(previewBody)
  return previewTable
}

/**
 * Создаёт временный off-screen DOM-элемент для native drag image.
 *
 * Превью ограничено шириной редактора, добавляется в `document.body` только
 * для измерения/передачи браузеру и удаляется слушателями `drop`/`dragend`,
 * зарегистрированными при старте drag. Отсутствие DOM таблицы не блокирует drag:
 * возвращается пустой контейнер с тем же cleanup-контрактом.
 */
export function createDragImage(
  context: TableHandleDragContext,
  orientation: DraggedCellOrientation,
  index: number,
  tablePos: number,
): HTMLElement {
  const editorRect = context.editor.view.dom.getBoundingClientRect()
  const maxWidth = Math.max(0, editorRect.width)
  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    pointerEvents: 'none',
    zIndex: '2147483647',
    maxWidth: `${maxWidth}px`,
    borderRadius: '12px',
    background: 'transparent',
    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))',
    overflow: 'hidden',
  })
  const tableDom = context.editor.view.nodeDOM(tablePos) as HTMLElement | null
  if (!tableDom) {
    document.body.appendChild(container)
    return container
  }
  const width = Math.min(tableDom.getBoundingClientRect().width, editorRect.width)
  container.style.width = `${width}px`
  const preview =
    orientation === 'row' ? buildRowPreview(tableDom, index) : buildColumnPreview(tableDom, index)
  if (preview) {
    const inner = document.createElement('div')
    Object.assign(inner.style, {
      background: 'var(--drag-image-bg, transparent)',
      overflow: 'hidden',
    })
    inner.appendChild(preview)
    container.appendChild(inner)
  }
  if (!container.isConnected) document.body.appendChild(container)
  const rect = container.getBoundingClientRect()
  if (rect.width > maxWidth && rect.width > 0) {
    const scale = maxWidth / rect.width
    container.style.transformOrigin = 'top left'
    container.style.transform = `scale(${scale})`
  }
  return container
}

/**
 * Инициализирует native drag строки или столбца из текущей hover-ручки.
 *
 * Источник определяется только по shared context и текущему индексу; без них
 * операция недопустима. При CellSelection сначала устанавливается TextSelection,
 * затем создаётся preview, фиксируются `originalIndex`, координата указателя и
 * начальное смещение. Freeze удерживает обычный hover-пересчёт до завершения.
 */
