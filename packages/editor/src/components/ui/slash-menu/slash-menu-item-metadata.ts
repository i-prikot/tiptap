import type { FunctionalComponent } from 'vue'
import type { EditorMessageKey } from '../../../i18n/types'
import type { SlashMenuItemKey } from './slash-menu-items'
import {
  AiSparklesIcon,
  AtSignIcon,
  BlockquoteIcon,
  CodeBlockIcon,
  HeadingOneIcon,
  HeadingThreeIcon,
  HeadingTwoIcon,
  ImageIcon,
  ListIcon,
  ListIndentedIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MinusIcon,
  SmilePlusIcon,
  TableIcon,
  TypeIcon,
} from '../../../icons'

interface SlashMenuItemMetadata {
  badge: FunctionalComponent
}

export const ITEM_METADATA: Record<
  SlashMenuItemKey,
  SlashMenuItemMetadata & {
    titleKey: EditorMessageKey
    descriptionKey: EditorMessageKey
    keywordsKey: EditorMessageKey
    groupKey: EditorMessageKey
  }
> = {
  continue_writing: {
    titleKey: 'menus.slash.continueWriting.title',
    descriptionKey: 'menus.slash.continueWriting.description',
    keywordsKey: 'menus.slash.continueWriting.keywords',
    groupKey: 'menus.groups.ai',
    badge: AiSparklesIcon,
  },
  ai_ask_button: {
    titleKey: 'menus.slash.askAi.title',
    descriptionKey: 'menus.slash.askAi.description',
    keywordsKey: 'menus.slash.askAi.keywords',
    groupKey: 'menus.groups.ai',
    badge: AiSparklesIcon,
  },
  text: {
    titleKey: 'menus.slash.text.title',
    descriptionKey: 'menus.slash.text.description',
    keywordsKey: 'menus.slash.text.keywords',
    groupKey: 'menus.groups.style',
    badge: TypeIcon,
  },
  heading_1: {
    titleKey: 'menus.slash.heading1.title',
    descriptionKey: 'menus.slash.heading1.description',
    keywordsKey: 'menus.slash.heading1.keywords',
    groupKey: 'menus.groups.style',
    badge: HeadingOneIcon,
  },
  heading_2: {
    titleKey: 'menus.slash.heading2.title',
    descriptionKey: 'menus.slash.heading2.description',
    keywordsKey: 'menus.slash.heading2.keywords',
    groupKey: 'menus.groups.style',
    badge: HeadingTwoIcon,
  },
  heading_3: {
    titleKey: 'menus.slash.heading3.title',
    descriptionKey: 'menus.slash.heading3.description',
    keywordsKey: 'menus.slash.heading3.keywords',
    groupKey: 'menus.groups.style',
    badge: HeadingThreeIcon,
  },
  bullet_list: {
    titleKey: 'menus.slash.bulletList.title',
    descriptionKey: 'menus.slash.bulletList.description',
    keywordsKey: 'menus.slash.bulletList.keywords',
    groupKey: 'menus.groups.style',
    badge: ListIcon,
  },
  ordered_list: {
    titleKey: 'menus.slash.orderedList.title',
    descriptionKey: 'menus.slash.orderedList.description',
    keywordsKey: 'menus.slash.orderedList.keywords',
    groupKey: 'menus.groups.style',
    badge: ListOrderedIcon,
  },
  task_list: {
    titleKey: 'menus.slash.taskList.title',
    descriptionKey: 'menus.slash.taskList.description',
    keywordsKey: 'menus.slash.taskList.keywords',
    groupKey: 'menus.groups.style',
    badge: ListTodoIcon,
  },
  quote: {
    titleKey: 'menus.slash.quote.title',
    descriptionKey: 'menus.slash.quote.description',
    keywordsKey: 'menus.slash.quote.keywords',
    groupKey: 'menus.groups.style',
    badge: BlockquoteIcon,
  },
  code_block: {
    titleKey: 'menus.slash.codeBlock.title',
    descriptionKey: 'menus.slash.codeBlock.description',
    keywordsKey: 'menus.slash.codeBlock.keywords',
    groupKey: 'menus.groups.style',
    badge: CodeBlockIcon,
  },
  mention: {
    titleKey: 'menus.slash.mention.title',
    descriptionKey: 'menus.slash.mention.description',
    keywordsKey: 'menus.slash.mention.keywords',
    groupKey: 'menus.groups.insert',
    badge: AtSignIcon,
  },
  emoji: {
    titleKey: 'menus.slash.emoji.title',
    descriptionKey: 'menus.slash.emoji.description',
    keywordsKey: 'menus.slash.emoji.keywords',
    groupKey: 'menus.groups.insert',
    badge: SmilePlusIcon,
  },
  table: {
    titleKey: 'menus.slash.table.title',
    descriptionKey: 'menus.slash.table.description',
    keywordsKey: 'menus.slash.table.keywords',
    groupKey: 'menus.groups.insert',
    badge: TableIcon,
  },
  divider: {
    titleKey: 'menus.slash.divider.title',
    descriptionKey: 'menus.slash.divider.description',
    keywordsKey: 'menus.slash.divider.keywords',
    groupKey: 'menus.groups.insert',
    badge: MinusIcon,
  },
  toc: {
    titleKey: 'menus.slash.toc.title',
    descriptionKey: 'menus.slash.toc.description',
    keywordsKey: 'menus.slash.toc.keywords',
    groupKey: 'menus.groups.insert',
    badge: ListIndentedIcon,
  },
  image: {
    titleKey: 'menus.slash.image.title',
    descriptionKey: 'menus.slash.image.description',
    keywordsKey: 'menus.slash.image.keywords',
    groupKey: 'menus.groups.upload',
    badge: ImageIcon,
  },
}
