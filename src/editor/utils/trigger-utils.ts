/**
 * Вставка триггеров suggestion-меню (`:` эмодзи, `@` меншены) в позицию
 * курсора либо к указанному узлу.
 * Порт addEmojiTrigger/addMentionTrigger из чанка 3qxxh2m8wjeqx.
 */
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { findNodePosition, isNodeTypeSelected, isValidPosition } from './tiptap-utils'

function canAddTrigger(editor: Editor | null): boolean {
  return !(!editor || !editor.isEditable || isNodeTypeSelected(editor, ['image']))
}

/** Вставка триггера отдельным параграфом (для не-текстовых блоков). */
function insertTriggerAsParagraph(
  editor: Editor,
  trigger: string,
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  if (node != null || isValidPosition(nodePos)) {
    const found = findNodePosition({ editor, node: node || undefined, nodePos: nodePos ?? undefined })
    if (!found) return false
    const isEmptyParagraph = found.node.type.name === 'paragraph' && found.node.content.size === 0
    const insertPos = found.pos + found.node.nodeSize
    return editor
      .chain()
      .insertContentAt(isEmptyParagraph ? found.pos : insertPos, {
        type: 'paragraph',
        content: [{ type: 'text', text: trigger }],
      })
      .focus(isEmptyParagraph ? found.pos + trigger.length + 1 : insertPos + trigger.length + 1)
      .run()
  }
  const { $from } = editor.state.selection
  return editor
    .chain()
    .insertContentAt($from.after(), { type: 'paragraph', content: [{ type: 'text', text: trigger }] })
    .focus()
    .run()
}

/** Вставка триггера в текст (с пробелом перед, если нужно). */
function insertTriggerInline(
  editor: Editor,
  trigger: string,
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  if (node != null || isValidPosition(nodePos)) {
    const found = findNodePosition({ editor, node: node || undefined, nodePos: nodePos ?? undefined })
    if (!found) return false
    const isEmptyParagraph = found.node.type.name === 'paragraph' && found.node.content.size === 0
    const insertPos = found.pos + found.node.nodeSize
    editor.view.dispatch(
      editor.view.state.tr
        .scrollIntoView()
        .insertText(trigger, isEmptyParagraph ? found.pos : insertPos, isEmptyParagraph ? found.pos : insertPos),
    )
    editor.commands.focus(isEmptyParagraph ? found.pos + 2 : insertPos + trigger.length + 1)
    return true
  }
  const { $from } = editor.state.selection
  const block = $from.node()
  const needsSpace = $from.parentOffset > 0 && block.textContent[$from.parentOffset - 1] !== ' '
  return editor
    .chain()
    .insertContent({ type: 'text', text: needsSpace ? ` ${trigger}` : trigger })
    .focus()
    .run()
}

function addTrigger(
  editor: Editor | null,
  trigger: string,
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  if (!editor || !editor.isEditable || !canAddTrigger(editor)) return false
  try {
    const { $from } = editor.state.selection
    const block = $from.node()
    if (block.isBlock && !block.isTextblock) return insertTriggerAsParagraph(editor, trigger, node, nodePos)
    return insertTriggerInline(editor, trigger, node, nodePos)
  } catch {
    return false
  }
}

export const EMOJI_TRIGGER_SHORTCUT_KEY = 'mod+shift+e'
export const MENTION_TRIGGER_SHORTCUT_KEY = 'mod+shift+2'

export function addEmojiTrigger(
  editor: Editor | null,
  trigger = ':',
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  return addTrigger(editor, trigger, node, nodePos)
}

export function addMentionTrigger(
  editor: Editor | null,
  trigger = '@',
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  return addTrigger(editor, trigger, node, nodePos)
}

export function addSlashTrigger(
  editor: Editor | null,
  trigger = '/',
  node?: ProseMirrorNode | null,
  nodePos?: number | null,
): boolean {
  return addTrigger(editor, trigger, node, nodePos)
}
