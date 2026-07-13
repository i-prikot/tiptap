import type { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { NodeBackground } from '../../../src/editor/extensions/node-background'
import {
  createExtensionEditor,
  destroyExtensionEditor,
  getNodeAttributes,
  selectNode,
  selectTableCells,
  setTextCursor,
} from './extension-test-utils'

let editor: Editor | undefined

afterEach(() => {
  if (editor) destroyExtensionEditor(editor)
  editor = undefined
})

function createBackgroundEditor(content: string, options = {}) {
  editor = createExtensionEditor({
    content,
    extensions: [NodeBackground.configure(options)],
    includeTables: true,
  })
  return editor
}

describe('NodeBackground', () => {
  it('parses style values before data attributes and renders the configured serialization mode', () => {
    const styled = createBackgroundEditor(
      '<p style="background-color: red" data-background-color="blue">Style first</p><p data-background-color="blue">Data fallback</p><p>Empty</p>',
    )

    expect(getNodeAttributes(styled, 'paragraph', 0)).toMatchObject({ backgroundColor: 'red' })
    expect(getNodeAttributes(styled, 'paragraph', 1)).toMatchObject({ backgroundColor: 'blue' })
    expect(styled.getHTML()).toContain('background-color: red')
    expect(styled.getHTML()).not.toContain('data-background-color="blue"')

    destroyExtensionEditor(styled)
    editor = createBackgroundEditor('<p data-background-color="green">Data only</p>', {
      useStyle: false,
    })
    expect(editor.getHTML()).toContain('data-background-color="green"')
    editor.commands.setContent('<p>Empty</p>')
    expect(editor.getHTML()).not.toContain('background-color')
  })

  it('sets, unsets, and rejects no-op or unsupported background transitions', () => {
    const instance = createBackgroundEditor('<h2>Heading</h2><hr>')

    setTextCursor(instance, 'heading')
    expect(instance.commands.setNodeBackgroundColor('yellow')).toBe(true)
    expect(getNodeAttributes(instance, 'heading')).toMatchObject({
      level: 2,
      backgroundColor: 'yellow',
    })
    expect(instance.commands.setNodeBackgroundColor('yellow')).toBe(false)
    expect(instance.commands.unsetNodeBackgroundColor()).toBe(true)
    expect(instance.commands.unsetNodeBackgroundColor()).toBe(false)

    selectNode(instance, 'horizontalRule')
    expect(instance.commands.setNodeBackgroundColor('yellow')).toBe(false)
  })

  it('applies a requested toggle color to mixed selected table cells and clears equal cells', () => {
    const instance = createBackgroundEditor(
      '<table><tr><td style="background-color: red"><p>One</p></td><td><p>Two</p></td></tr></table>',
    )

    selectTableCells(instance, 0, 1)
    expect(instance.commands.toggleNodeBackgroundColor('red')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({ backgroundColor: 'red' })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({ backgroundColor: 'red' })

    expect(instance.commands.toggleNodeBackgroundColor('red')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({ backgroundColor: null })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({ backgroundColor: null })
  })
})
