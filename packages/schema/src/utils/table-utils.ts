/**
 * Утилиты таблиц: карта ячеек, выделение строк/столбцов, DOM-поиск.
 */
export { EMPTY_CELL_HEIGHT, EMPTY_CELL_WIDTH, RESIZE_MIN_WIDTH } from './table-utils/shared.js'
export type {
  DomCellInfo,
  IndexedCell,
  IndexedCells,
  Orientation,
  RowOrColumnCells,
  TableInfo,
} from './table-utils/shared.js'

export {
  countEmptyColumnsFromEnd,
  countEmptyRowsFromEnd,
  getColumnCells,
  getIndexCoordinates,
  getRowCells,
  getRowOrColumnCells,
  getTable,
} from './table-utils/table-map.js'

export {
  getTableSelectionType,
  runPreservingCursor,
  selectCellsByCoords,
  selectLastCell,
  setCellAttr,
  updateSelectionAfterAction,
} from './table-utils/cell-selection.js'
export type { SelectCellsMode } from './table-utils/cell-selection.js'

export {
  cellsOverlapRectangle,
  clamp,
  domCellAround,
  getCellIndicesFromDOM,
  getTableFromDOM,
  isCellEmpty,
  isHTMLElement,
  isTableNode,
  marginRound,
  rectEq,
  safeClosest,
} from './table-utils/table-calculations.js'
