import { columnResizingPluginKey } from '@tiptap/pm/tables'

export interface ColumnResizeTransactionPayload {
  transaction: {
    docChanged: boolean
    getMeta(key: typeof columnResizingPluginKey): unknown
  }
}

interface ColumnResizePluginMeta {
  setDragging?: unknown | null
  setHandle?: unknown | null
}

export function isColumnResizePluginMeta(meta: unknown): meta is ColumnResizePluginMeta {
  return typeof meta === 'object' && meta !== null
}
