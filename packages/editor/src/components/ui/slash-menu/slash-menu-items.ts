/**
 * Конфигурация пунктов слэш-меню: метаданные (заголовок, ключевые слова,
 * иконка, группа) + проверки доступности и действия.
 */
import type { Editor } from '@tiptap/core'
import type { FunctionalComponent } from 'vue'
import { isExtensionAvailable, isNodeInSchema } from '../../../utils/tiptap-utils'
import { findSelectionPosition, hasContentAbove } from '../../../utils/selection-utils'
import { addEmojiTrigger, addMentionTrigger } from '../../../utils/trigger-utils'
import type { SuggestionItem } from '../../../types/suggestion'
import type { EditorI18nContext } from '../../../composables/useEditorI18n'
import type { AiTextPromptOptions } from '../../../types/tiptap-augmentations'
import { ITEM_METADATA } from './slash-menu-item-metadata'

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

interface SlashMenuItemBehavior {
  check: (editor: Editor) => boolean
  action: (args: SlashMenuActionArgs) => void
}

function buildAiBehaviors(): Pick<
  Record<SlashMenuItemKey, SlashMenuItemBehavior>,
  'continue_writing' | 'ai_ask_button'
> {
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
          if (editor.isDestroyed) return
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
  }
}

function buildBehaviors(): Record<SlashMenuItemKey, SlashMenuItemBehavior> {
  return {
    ...buildAiBehaviors(),
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
  t: EditorI18nContext['t'],
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
        title: t(metadata.titleKey),
        subtext: t(metadata.descriptionKey),
        keywords: t(metadata.keywordsKey).split('|'),
        group: t(metadata.groupKey),
        badge: metadata.badge,
        onSelect: ({ editor: selectedEditor }) => behavior.action({ editor: selectedEditor }),
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
