import type { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSlashMenuItems,
  type SlashMenuItemKey,
} from '../../../../src/editor/components/ui/slash-menu'

const keys: SlashMenuItemKey[] = [
  'continue_writing',
  'ai_ask_button',
  'text',
  'heading_1',
  'heading_2',
  'heading_3',
  'bullet_list',
  'ordered_list',
  'task_list',
  'quote',
  'code_block',
  'mention',
  'emoji',
  'divider',
  'toc',
  'table',
  'image',
]

function createEditor({ available = true }: { available?: boolean } = {}) {
  const commands: string[] = []
  const chain = new Proxy(
    {},
    {
      get(_target, property) {
        return (..._args: unknown[]) => {
          commands.push(String(property))
          return property === 'run' ? true : chain
        }
      },
    },
  )
  const extensionNames = available ? ['ai', 'mention', 'emoji'] : []
  const nodeNames = available
    ? [
        'paragraph',
        'heading',
        'bulletList',
        'orderedList',
        'taskList',
        'blockquote',
        'codeBlock',
        'horizontalRule',
        'tocNode',
        'table',
        'image',
      ]
    : []

  const editor = {
    chain: () => chain,
    extensionManager: { extensions: extensionNames.map((name) => ({ name })) },
    isEditable: true,
    schema: { spec: { nodes: new Map(nodeNames.map((name) => [name, {}])) } },
    state: {
      doc: { child: () => ({ textContent: 'Content above' }) },
      selection: {
        $anchor: { before: () => 1, node: () => ({}) },
        $from: { after: () => 1, index: () => 1 },
        empty: true,
      },
    },
  } as unknown as Editor

  return { commands, editor }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('slash menu items', () => {
  it('excludes AI items by default even when requested', () => {
    const { editor } = createEditor()
    const items = getSlashMenuItems(editor, { enabledItems: keys })

    expect(items).toHaveLength(keys.length - 2)
    expect(items.map((item) => item.title)).not.toContain('Ask AI')
    expect(items.map((item) => item.title)).not.toContain('Continue Writing')
    expect(items.map((item) => item.group)).not.toContain('AI')
  })

  it('creates and executes every available editor command item when AI is enabled', () => {
    const { commands, editor } = createEditor()
    const items = getSlashMenuItems(editor, { enabledItems: keys }, true)

    expect(items).toHaveLength(keys.length)
    expect(items.map((item) => item.group)).toEqual([
      'AI',
      'AI',
      'Style',
      'Style',
      'Style',
      'Style',
      'Style',
      'Style',
      'Style',
      'Style',
      'Style',
      'Insert',
      'Insert',
      'Insert',
      'Insert',
      'Insert',
      'Upload',
    ])

    for (const item of items) item.onSelect({ editor })

    expect(commands).toEqual(
      expect.arrayContaining([
        'aiGenerationShow',
        'focus',
        'insertContent',
        'insertTable',
        'insertTocNode',
        'setHorizontalRule',
        'setParagraph',
        'toggleBlockquote',
        'toggleBulletList',
        'toggleHeading',
        'toggleNode',
        'toggleOrderedList',
        'toggleTaskList',
      ]),
    )
  })

  it('honors unavailable items, custom items, and group overrides', () => {
    const unavailable = createEditor({ available: false })
    const customItem = {
      group: 'Custom',
      keywords: ['custom'],
      onSelect: vi.fn(),
      subtext: 'Custom coverage item',
      title: 'Custom',
    }

    const items = getSlashMenuItems(unavailable.editor, {
      customItems: [customItem],
      enabledItems: ['text', 'mention'],
      itemGroups: { text: 'Overridden' },
      showGroups: false,
    })

    expect(items).toEqual([expect.objectContaining({ group: '', title: 'Custom' })])
  })
})
