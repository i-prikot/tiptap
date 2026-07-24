/**
 * Опции «Turn into» и проверка конвертируемости выделения.
 */
import type { Editor } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorMessageKey } from '../i18n/types'

export type TurnIntoBlockType =
  'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'codeBlock'

export interface TurnIntoBlock {
  type: TurnIntoBlockType
  messageKey: EditorMessageKey
  level?: number
  isActive: (editor: Editor) => boolean
}

export const TURN_INTO_BLOCK_TYPES: TurnIntoBlockType[] = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
]

export const TURN_INTO_BLOCKS: TurnIntoBlock[] = [
  {
    type: 'paragraph',
    messageKey: 'menus.slash.text.title',
    isActive: (editor) =>
      editor.isActive('paragraph') &&
      !editor.isActive('heading') &&
      !editor.isActive('bulletList') &&
      !editor.isActive('orderedList') &&
      !editor.isActive('taskList') &&
      !editor.isActive('blockquote') &&
      !editor.isActive('codeBlock'),
  },
  {
    type: 'heading',
    messageKey: 'menus.slash.heading1.title',
    level: 1,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    type: 'heading',
    messageKey: 'menus.slash.heading2.title',
    level: 2,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    type: 'heading',
    messageKey: 'menus.slash.heading3.title',
    level: 3,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
  },
  {
    type: 'bulletList',
    messageKey: 'menus.slash.bulletList.title',
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    type: 'orderedList',
    messageKey: 'menus.slash.orderedList.title',
    isActive: (editor) => editor.isActive('orderedList'),
  },
  {
    type: 'taskList',
    messageKey: 'menus.slash.taskList.title',
    isActive: (editor) => editor.isActive('taskList'),
  },
  {
    type: 'blockquote',
    messageKey: 'menus.slash.quote.title',
    isActive: (editor) => editor.isActive('blockquote'),
  },
  {
    type: 'codeBlock',
    messageKey: 'menus.slash.codeBlock.title',
    isActive: (editor) => editor.isActive('codeBlock'),
  },
]

export function getTurnIntoBlockMessageKey(
  block: Pick<TurnIntoBlock, 'messageKey'>,
): EditorMessageKey {
  return block.messageKey
}

export function canTurnInto(editor: Editor | null, blockTypes?: TurnIntoBlockType[]): boolean {
  if (!editor || !editor.isEditable) return false
  const allowed = blockTypes || TURN_INTO_BLOCK_TYPES
  const { selection } = editor.state
  if (selection instanceof NodeSelection)
    return allowed.includes(selection.node.type.name as TurnIntoBlockType)
  return allowed.includes(selection.$anchor.parent.type.name as TurnIntoBlockType)
}

export function filterTurnIntoBlocks(blockTypes?: TurnIntoBlockType[]): TurnIntoBlock[] {
  return blockTypes
    ? TURN_INTO_BLOCKS.filter((block) => blockTypes.includes(block.type))
    : TURN_INTO_BLOCKS
}

/** Активная (или первая) опция для подписи триггера. */
export function getActiveTurnIntoBlock(
  editor: Editor | null,
  blockTypes?: TurnIntoBlockType[],
): TurnIntoBlock {
  const options = filterTurnIntoBlocks(blockTypes)
  if (!editor) return options[0]
  return options.find((option) => option.isActive(editor)) || options[0]
}
