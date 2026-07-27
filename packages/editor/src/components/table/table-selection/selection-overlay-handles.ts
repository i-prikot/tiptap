import type { CSSProperties } from 'vue'

export type TableSelectionCorner = 'tl' | 'tr' | 'bl' | 'br'

export const tableSelectionCorners: TableSelectionCorner[] = ['tl', 'tr', 'bl', 'br']

const baseHandleStyle: CSSProperties = {
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

const handlePositions: Record<TableSelectionCorner, CSSProperties> = {
  tl: { top: '-7.5px', left: '-7.5px', cursor: 'nwse-resize' },
  tr: { top: '-7.5px', right: '-7.5px', cursor: 'nesw-resize' },
  bl: { bottom: '-7.5px', left: '-7.5px', cursor: 'nesw-resize' },
  br: { bottom: '-7.5px', right: '-7.5px', cursor: 'nwse-resize' },
}

export function getTableSelectionHandleStyle(
  corner: TableSelectionCorner,
  activeCorner: TableSelectionCorner | null,
  menuOpen: boolean,
): CSSProperties {
  const highlighted = !activeCorner || activeCorner === corner

  return {
    ...baseHandleStyle,
    ...handlePositions[corner],
    cursor: menuOpen ? 'default' : handlePositions[corner].cursor,
    opacity: menuOpen ? 0.3 : highlighted ? 1 : 0.5,
    pointerEvents: menuOpen ? 'none' : 'auto',
  }
}
