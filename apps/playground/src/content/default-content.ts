import type { JSONContent } from '@tiptap/core'
import { customizationContent } from './default-content/customization'
import { developerNotesContent } from './default-content/developer-notes'
import { introductionContent } from './default-content/introduction'
import { mediaAndTableIntroContent } from './default-content/media-and-table-intro'
import { navigationAndChecklistContent } from './default-content/navigation-and-checklist'
import { tableContent } from './default-content/table'

export const defaultContent: JSONContent = {
  type: 'doc',
  content: [
    ...introductionContent,
    ...customizationContent,
    ...mediaAndTableIntroContent,
    tableContent,
    ...navigationAndChecklistContent,
    ...developerNotesContent,
  ],
}
