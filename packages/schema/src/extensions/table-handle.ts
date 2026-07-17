/**
 * Public compatibility facade for table-handle behavior.
 */
export { colDragStart, dragEnd, rowDragStart } from './table-handle/drag-and-drop'
export {
  TableHandleExtension,
  TableHandlePlugin,
  tableHandlePluginKey,
} from './table-handle/plugin'
export type {
  DraggedCellOrientation,
  TableDraggingState,
  TableHandleState,
} from './table-handle/types'
