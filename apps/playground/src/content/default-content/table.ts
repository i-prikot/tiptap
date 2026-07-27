import type { JSONContent } from '@tiptap/core'
import { tableRows1 } from './table-rows-1'
import { tableRows2 } from './table-rows-2'
import { tableRows3 } from './table-rows-3'

export const tableContent: JSONContent = {
  type: 'table',
  attrs: {
    id: 'df3debd5-fd7c-4df4-a258-9e13a6eb0d8c',
  },
  content: [...tableRows1, ...tableRows2, ...tableRows3],
}
