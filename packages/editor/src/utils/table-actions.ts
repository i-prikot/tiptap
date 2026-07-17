/**
 * Stable public table-action API. Focused implementations live in the
 * adjacent `table-actions/` modules so consumer import paths stay unchanged.
 */
export {
  ADD_COLUMN_LABELS,
  ADD_ROW_LABELS,
  DELETE_LABELS,
  DUPLICATE_LABELS,
  addRowColumn,
  canAddRowColumn,
  canDeleteRowColumn,
  canDuplicateRowColumn,
  deleteRowColumn,
  duplicateRowColumn,
} from './table-actions/add-delete'
export {
  HEADER_LABELS,
  canToggleHeaderRowColumn,
  isHeaderRowColumnActive,
  toggleHeaderRowColumn,
} from './table-actions/headers'
export {
  MERGE_SPLIT_LABELS,
  canMergeCells,
  canSplitCell,
  mergeSplitCells,
} from './table-actions/merge-split'
export {
  MOVE_LABELS,
  canMoveRowColumn,
  isMoveDirectionValid,
  moveRowColumn,
} from './table-actions/movement'
export {
  CLEAR_ALL_LABEL,
  CLEAR_LABELS,
  canClearAllTableContent,
  canClearRowColumnContent,
  clearAllTableContent,
  clearRowColumnContent,
  isClearRowColumnVisible,
} from './table-actions/clearing'
export { SORT_LABELS, canSortRowColumn, sortRowColumn } from './table-actions/sorting'
export type {
  AddSide,
  MergeSplitAction,
  MoveDirection,
  RowColumnArgs,
  SortDirection,
} from './table-actions/shared'
