/**
 * Конфигурация пунктов слэш-меню: метаданные (заголовок, ключевые слова,
 * иконка, группа) + проверки доступности и действия.
 * Порт из чанка 1_-l0xapy_wlh (модуль 204748).
 */
import type { Editor } from '@tiptap/core'
import type { FunctionalComponent } from 'vue'
import { isExtensionAvailable, isNodeInSchema } from '../../utils/tiptap-utils'
import { findSelectionPosition, hasContentAbove } from '../../utils/selection-utils'
import { addEmojiTrigger, addMentionTrigger } from '../../utils/trigger-utils'
import type { SuggestionItem } from '../../types/suggestion'
import type { AiTextPromptOptions } from '../../types/tiptap-augmentations'
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
} from '../../icons'

export interface SlashMenuConfig {
  enabledItems?: SlashMenuItemKey[]
  showGroups?: boolean
  itemGroups?: Partial<Record<SlashMenuItemKey, string>>
  customItems?: SlashMenuItem[]
}

export type SlashMenuItemKey =
  | 'continue_writing'
  | 'ai_ask_button'
  | 'text'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'ordered_list'
  | 'task_list'
  | 'quote'
  | 'code_block'
  | 'mention'
  | 'emoji'
  | 'table'
  | 'divider'
  | 'toc'
  | 'image'

const AI_SLASH_MENU_ITEM_KEYS = new Set<SlashMenuItemKey>(['continue_writing', 'ai_ask_button'])

interface SlashMenuItemMeta {
  title: string
  subtext: string
  keywords: string[]
  badge: FunctionalComponent
  group: string
}

export interface SlashMenuItemContext extends Record<string, unknown> {
  key?: SlashMenuItemKey
}

export interface SlashMenuSelectProps {
  editor: Editor
  range?: { from: number; to: number }
  context?: unknown
}

export interface SlashMenuActionArgs {
  editor: Editor
}

export type SlashMenuSelectHandler = {
  select(props: SlashMenuSelectProps): void
}['select']

export interface SlashMenuItem extends Omit<
  SuggestionItem<SlashMenuItemContext>,
  'badge' | 'onSelect'
> {
  badge?: FunctionalComponent
  onSelect: SlashMenuSelectHandler
}

interface SlashMenuTableInsertOptions {
  rows: number
  cols: number
  withHeaderRow: boolean
}

const ITEM_METADATA: Record<SlashMenuItemKey, SlashMenuItemMeta> = {
  continue_writing: {
    title: 'Continue Writing',
    subtext: 'Continue writing from the current position',
    keywords: ['continue', 'write', 'continue writing', 'ai'],
    badge: AiSparklesIcon,
    group: 'AI',
  },
  ai_ask_button: {
    title: 'Ask AI',
    subtext: 'Ask AI to generate content',
    keywords: ['ai', 'ask', 'generate'],
    badge: AiSparklesIcon,
    group: 'AI',
  },
  text: {
    title: 'Text',
    subtext: 'Regular text paragraph',
    keywords: ['p', 'paragraph', 'text'],
    badge: TypeIcon,
    group: 'Style',
  },
  heading_1: {
    title: 'Heading 1',
    subtext: 'Top-level heading',
    keywords: ['h', 'heading1', 'h1'],
    badge: HeadingOneIcon,
    group: 'Style',
  },
  heading_2: {
    title: 'Heading 2',
    subtext: 'Key section heading',
    keywords: ['h2', 'heading2', 'subheading'],
    badge: HeadingTwoIcon,
    group: 'Style',
  },
  heading_3: {
    title: 'Heading 3',
    subtext: 'Subsection and group heading',
    keywords: ['h3', 'heading3', 'subheading'],
    badge: HeadingThreeIcon,
    group: 'Style',
  },
  bullet_list: {
    title: 'Bullet List',
    subtext: 'List with unordered items',
    keywords: ['ul', 'li', 'list', 'bulletlist', 'bullet list'],
    badge: ListIcon,
    group: 'Style',
  },
  ordered_list: {
    title: 'Numbered List',
    subtext: 'List with ordered items',
    keywords: ['ol', 'li', 'list', 'numberedlist', 'numbered list'],
    badge: ListOrderedIcon,
    group: 'Style',
  },
  task_list: {
    title: 'To-do list',
    subtext: 'List with tasks',
    keywords: ['tasklist', 'task list', 'todo', 'checklist'],
    badge: ListTodoIcon,
    group: 'Style',
  },
  quote: {
    title: 'Blockquote',
    subtext: 'Blockquote block',
    keywords: ['quote', 'blockquote'],
    badge: BlockquoteIcon,
    group: 'Style',
  },
  code_block: {
    title: 'Code Block',
    subtext: 'Code block with syntax highlighting',
    keywords: ['code', 'pre'],
    badge: CodeBlockIcon,
    group: 'Style',
  },
  mention: {
    title: 'Mention',
    subtext: 'Mention a user or item',
    keywords: ['mention', 'user', 'item', 'tag'],
    badge: AtSignIcon,
    group: 'Insert',
  },
  emoji: {
    title: 'Emoji',
    subtext: 'Insert an emoji',
    keywords: ['emoji', 'emoticon', 'smiley'],
    badge: SmilePlusIcon,
    group: 'Insert',
  },
  table: {
    title: 'Table',
    subtext: 'Insert a table',
    keywords: ['table', 'insertTable'],
    badge: TableIcon,
    group: 'Insert',
  },
  divider: {
    title: 'Separator',
    subtext: 'Horizontal line to separate content',
    keywords: ['hr', 'horizontalRule', 'line', 'separator'],
    badge: MinusIcon,
    group: 'Insert',
  },
  toc: {
    title: 'Table of contents',
    subtext: 'Insert a table of contents',
    keywords: ['toc', 'tableofcontents', 'table of contents'],
    badge: ListIndentedIcon,
    group: 'Insert',
  },
  image: {
    title: 'Image',
    subtext: 'Resizable image with caption',
    keywords: ['image', 'imageUpload', 'upload', 'img', 'picture', 'media', 'url'],
    badge: ImageIcon,
    group: 'Upload',
  },
}

interface SlashMenuItemBehavior {
  check: (editor: Editor) => boolean
  action: (args: SlashMenuActionArgs) => void
}

function buildBehaviors(): Record<SlashMenuItemKey, SlashMenuItemBehavior> {
  return {
    continue_writing: {
      check: (editor) => {
        const { hasContent } = hasContentAbove(editor)
        return isExtensionAvailable(editor, ['ai', 'aiAdvanced']) && hasContent
      },
      action: ({ editor }) => {
        const chain = editor.chain().focus()
        const pos = findSelectionPosition({ editor })
        if (pos !== null) chain.setNodeSelection(pos)
        chain.run()
        editor.chain().focus().aiGenerationShow().run()
        requestAnimationFrame(() => {
          const { hasContent, content } = hasContentAbove(editor)
          const context = content.length > 500 ? `...${content.slice(-500)}` : content
          const prompt = hasContent
            ? `Context: ${context}\n\nContinue writing from where the text above ends. Write ONLY ONE SENTENCE. DONT REPEAT THE TEXT.`
            : 'Start writing a new paragraph. Write ONLY ONE SENTENCE.'
          const promptOptions: AiTextPromptOptions = {
            stream: true,
            format: 'rich-text',
            text: prompt,
          }
          editor.chain().focus().aiTextPrompt(promptOptions).run()
        })
      },
    },
    ai_ask_button: {
      check: (editor) => isExtensionAvailable(editor, ['ai', 'aiAdvanced']),
      action: ({ editor }) => {
        const chain = editor.chain().focus()
        const pos = findSelectionPosition({ editor })
        if (pos !== null) chain.setNodeSelection(pos)
        chain.run()
        editor.chain().focus().aiGenerationShow().run()
      },
    },
    text: {
      check: (editor) => isNodeInSchema('paragraph', editor),
      action: ({ editor }) => {
        editor.chain().focus().setParagraph().run()
      },
    },
    heading_1: {
      check: (editor) => isNodeInSchema('heading', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    heading_2: {
      check: (editor) => isNodeInSchema('heading', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    heading_3: {
      check: (editor) => isNodeInSchema('heading', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
    },
    bullet_list: {
      check: (editor) => isNodeInSchema('bulletList', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    ordered_list: {
      check: (editor) => isNodeInSchema('orderedList', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    task_list: {
      check: (editor) => isNodeInSchema('taskList', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleTaskList().run()
      },
    },
    quote: {
      check: (editor) => isNodeInSchema('blockquote', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleBlockquote().run()
      },
    },
    code_block: {
      check: (editor) => isNodeInSchema('codeBlock', editor),
      action: ({ editor }) => {
        editor.chain().focus().toggleNode('codeBlock', 'paragraph').run()
      },
    },
    mention: {
      check: (editor) => isExtensionAvailable(editor, ['mention', 'mentionAdvanced']),
      action: ({ editor }) => addMentionTrigger(editor),
    },
    emoji: {
      check: (editor) => isExtensionAvailable(editor, ['emoji', 'emojiPicker']),
      action: ({ editor }) => addEmojiTrigger(editor),
    },
    divider: {
      check: (editor) => isNodeInSchema('horizontalRule', editor),
      action: ({ editor }) => {
        editor.chain().focus().setHorizontalRule().run()
      },
    },
    toc: {
      check: (editor) => isNodeInSchema('tocNode', editor),
      action: ({ editor }) => {
        editor.chain().focus().insertTocNode().run()
      },
    },
    table: {
      check: (editor) => isNodeInSchema('table', editor),
      action: ({ editor }) => {
        const tableOptions: SlashMenuTableInsertOptions = {
          rows: 3,
          cols: 3,
          withHeaderRow: false,
        }
        editor.chain().focus().insertTable(tableOptions).run()
      },
    },
    image: {
      check: (editor) => isNodeInSchema('image', editor),
      action: ({ editor }) => {
        editor.chain().focus().insertContent({ type: 'imageUpload' }).run()
      },
    },
  }
}

/** Собирает доступные пункты слэш-меню для текущего редактора. */
export function getSlashMenuItems(
  editor: Editor,
  config?: SlashMenuConfig,
  aiEnabled = false,
): SlashMenuItem[] {
  const items: SlashMenuItem[] = []
  const requestedKeys = config?.enabledItems || (Object.keys(ITEM_METADATA) as SlashMenuItemKey[])
  const enabledKeys = aiEnabled
    ? requestedKeys
    : requestedKeys.filter((key) => !AI_SLASH_MENU_ITEM_KEYS.has(key))
  const showGroups = config?.showGroups !== false
  const behaviors = buildBehaviors()

  enabledKeys.forEach((key) => {
    const behavior = behaviors[key]
    const metadata = ITEM_METADATA[key]
    if (behavior && metadata && behavior.check(editor)) {
      const item: SlashMenuItem = {
        onSelect: ({ editor: selectedEditor }) => behavior.action({ editor: selectedEditor }),
        ...metadata,
      }
      if (config?.itemGroups?.[key]) item.group = config.itemGroups[key]
      else if (!showGroups) item.group = ''
      items.push(item)
    }
  })

  if (config?.customItems) items.push(...config.customItems)
  if (!showGroups) return items.map((item) => ({ ...item, group: '' }))

  // стабильная сортировка по группам с сохранением порядка внутри группы
  const grouped = new Map<string, SlashMenuItem[]>()
  items.forEach((item) => {
    const group = item.group || ''
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group)!.push(item)
  })
  const result: SlashMenuItem[] = []
  grouped.forEach((groupItems) => result.push(...groupItems))
  return result
}
