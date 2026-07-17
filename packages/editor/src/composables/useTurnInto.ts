/**
 * Опции «Turn into» и проверка конвертируемости выделения.
 * Порт списка a/canTurnInto из чанка 34p294mqk5mqb (модуль 413941).
 */
import type { Editor } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'

export type TurnIntoBlockType =
  'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'codeBlock'

export interface TurnIntoBlock {
  type: TurnIntoBlockType
  label: string
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
    label: 'Text',
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
    label: 'Heading 1',
    level: 1,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    type: 'heading',
    label: 'Heading 2',
    level: 2,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    type: 'heading',
    label: 'Heading 3',
    level: 3,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
  },
  {
    type: 'bulletList',
    label: 'Bulleted list',
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    type: 'orderedList',
    label: 'Numbered list',
    isActive: (editor) => editor.isActive('orderedList'),
  },
  { type: 'taskList', label: 'To-do list', isActive: (editor) => editor.isActive('taskList') },
  { type: 'blockquote', label: 'Blockquote', isActive: (editor) => editor.isActive('blockquote') },
  { type: 'codeBlock', label: 'Code block', isActive: (editor) => editor.isActive('codeBlock') },
]

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
