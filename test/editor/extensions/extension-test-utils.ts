import type { AnyExtension, EditorOptions } from '@tiptap/core'
import { Editor } from '@tiptap/core'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import StarterKit from '@tiptap/starter-kit'

export interface ExtensionEditorOptions {
  content: EditorOptions['content']
  extensions: AnyExtension[]
  includeLists?: boolean
  includeTables?: boolean
}

export function createExtensionEditor({
  content,
  extensions,
  includeLists = false,
  includeTables = false,
}: ExtensionEditorOptions): Editor {
  const host = document.createElement('div')
  document.body.append(host)

  return new Editor({
    element: host,
    content,
    extensions: [
      StarterKit,
      ...(includeLists ? [TaskList, TaskItem.configure({ nested: true })] : []),
      ...(includeTables ? [Table, TableRow, TableHeader, TableCell] : []),
      ...extensions,
    ],
  })
}

export function destroyExtensionEditor(editor: Editor) {
  const host = editor.options.element
  editor.destroy()
  if (host instanceof HTMLElement) host.remove()
}

export function findNodePosition(editor: Editor, typeName: string, occurrence = 0): number {
  let position = -1
  let matches = 0

  editor.state.doc.descendants((node, pos) => {
    if (position >= 0) return false
    if (node.type.name !== typeName) return true
    if (matches === occurrence) {
      position = pos
      return false
    }
    matches += 1
    return true
  })

  if (position < 0) throw new Error(`Could not find ${typeName} node #${occurrence}`)
  return position
}

export function getNodeAttributes(editor: Editor, typeName: string, occurrence = 0) {
  const position = findNodePosition(editor, typeName, occurrence)
  const node = editor.state.doc.nodeAt(position)
  if (!node) throw new Error(`Could not resolve ${typeName} node #${occurrence}`)
  return node.attrs
}

export function selectNode(editor: Editor, typeName: string, occurrence = 0) {
  const position = findNodePosition(editor, typeName, occurrence)
  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
  )
}

export function setTextCursor(editor: Editor, typeName: string, occurrence = 0, offset = 0) {
  const position = findNodePosition(editor, typeName, occurrence)
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, position + 1 + offset)),
  )
}

export function setTextSelection(editor: Editor, from: number, to: number) {
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)),
  )
}

export function selectTableCells(
  editor: Editor,
  fromOccurrence = 0,
  toOccurrence = fromOccurrence,
) {
  const from = findNodePosition(editor, 'tableCell', fromOccurrence)
  const to = findNodePosition(editor, 'tableCell', toOccurrence)
  editor.view.dispatch(
    editor.state.tr.setSelection(CellSelection.create(editor.state.doc, from, to)),
  )
}

export function dispatchShortcut(editor: Editor, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  editor.view.dom.dispatchEvent(event)
  return event.defaultPrevented
}

export function runExtensionShortcut(editor: Editor, extensionName: string, shortcutName: string) {
  const extension = editor.extensionManager.extensions.find(
    (candidate) => candidate.name === extensionName,
  )
  if (!extension) throw new Error(`Could not find ${extensionName} extension`)

  const addKeyboardShortcuts = extension.config.addKeyboardShortcuts as
    (() => Record<string, (props: { editor: Editor }) => boolean>) | undefined
  const shortcutContext = Object.assign(Object.create(extension), { editor })
  const shortcut = addKeyboardShortcuts?.call(shortcutContext)?.[shortcutName]
  if (!shortcut) throw new Error(`Could not find ${shortcutName} shortcut on ${extensionName}`)
  return shortcut({ editor })
}
