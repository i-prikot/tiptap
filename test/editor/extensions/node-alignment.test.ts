import type { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { NodeAlignment } from '../../../src/editor/extensions/node-alignment'
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

function createAlignmentEditor(content: string, options = {}) {
  editor = createExtensionEditor({
    content,
    extensions: [NodeAlignment.configure(options)],
    includeTables: true,
  })
  return editor
}

describe('NodeAlignment', () => {
  it('parses valid styles before data attributes, falls back from invalid styles, and renders by configuration', () => {
    const styled = createAlignmentEditor(
      '<p style="text-align: center; vertical-align: middle" data-node-text-align="right" data-node-vertical-align="bottom">Style first</p><p data-node-text-align="right" data-node-vertical-align="bottom">Data fallback</p><p style="text-align: sideways; vertical-align: baseline">Invalid</p><p style="text-align: sideways; vertical-align: baseline" data-node-text-align="left" data-node-vertical-align="top">Invalid style fallback</p>',
    )

    expect(getNodeAttributes(styled, 'paragraph', 0)).toMatchObject({
      nodeTextAlign: 'center',
      nodeVerticalAlign: 'middle',
    })
    expect(getNodeAttributes(styled, 'paragraph', 1)).toMatchObject({
      nodeTextAlign: 'right',
      nodeVerticalAlign: 'bottom',
    })
    expect(getNodeAttributes(styled, 'paragraph', 2)).toMatchObject({
      nodeTextAlign: null,
      nodeVerticalAlign: null,
    })
    expect(getNodeAttributes(styled, 'paragraph', 3)).toMatchObject({
      nodeTextAlign: 'left',
      nodeVerticalAlign: 'top',
    })
    expect(styled.getHTML()).toContain('text-align: center')
    expect(styled.getHTML()).toContain('vertical-align: middle')

    destroyExtensionEditor(styled)
    editor = createAlignmentEditor(
      '<p data-node-text-align="left" data-node-vertical-align="top">Data mode</p>',
      { useStyle: false },
    )
    expect(editor.getHTML()).toContain('data-node-text-align="left"')
    expect(editor.getHTML()).toContain('data-node-vertical-align="top"')
  })

  it('sets, unsets, and toggles each alignment dimension without clearing the other', () => {
    const instance = createAlignmentEditor('<p>Paragraph</p><hr>')

    setTextCursor(instance, 'paragraph')
    expect(instance.commands.setNodeTextAlign('center')).toBe(true)
    expect(instance.commands.setNodeVAlign('middle')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: 'center',
      nodeVerticalAlign: 'middle',
    })

    expect(instance.commands.toggleNodeTextAlign('center')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: null,
      nodeVerticalAlign: 'middle',
    })
    expect(instance.commands.toggleNodeTextAlign('center')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: 'center',
      nodeVerticalAlign: 'middle',
    })

    expect(instance.commands.setNodeTextAlign('unsupported')).toBe(false)
    expect(instance.commands.toggleNodeTextAlign('unsupported')).toBe(false)
    expect(instance.commands.setNodeVAlign('unsupported')).toBe(false)
    expect(instance.commands.toggleNodeVAlign('unsupported')).toBe(false)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: 'center',
      nodeVerticalAlign: 'middle',
    })
    expect(instance.commands.unsetNodeTextAlign()).toBe(true)
    expect(instance.commands.unsetNodeVAlign()).toBe(true)
    expect(instance.commands.toggleNodeVAlign('middle')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({ nodeVerticalAlign: 'middle' })
    expect(instance.commands.toggleNodeVAlign('middle')).toBe(true)

    selectNode(instance, 'horizontalRule')
    expect(instance.commands.setNodeTextAlign('center')).toBe(false)
  })

  it('applies and clears text and vertical toggles for mixed table-cell values', () => {
    const instance = createAlignmentEditor(
      '<table><tr><td style="text-align: left; vertical-align: top"><p>One</p></td><td style="text-align: right; vertical-align: bottom"><p>Two</p></td></tr></table>',
    )

    selectTableCells(instance, 0, 1)
    expect(instance.commands.toggleNodeTextAlign('center')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({ nodeTextAlign: 'center' })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({ nodeTextAlign: 'center' })
    expect(instance.commands.toggleNodeTextAlign('center')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({ nodeTextAlign: null })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({ nodeTextAlign: null })

    expect(instance.commands.toggleNodeVAlign('middle')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({
      nodeVerticalAlign: 'middle',
    })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({
      nodeVerticalAlign: 'middle',
    })
    expect(instance.commands.toggleNodeVAlign('middle')).toBe(true)
    expect(getNodeAttributes(instance, 'tableCell', 0)).toMatchObject({ nodeVerticalAlign: null })
    expect(getNodeAttributes(instance, 'tableCell', 1)).toMatchObject({ nodeVerticalAlign: null })
  })

  it('updates supplied combined alignment dimensions and unsets both only when needed', () => {
    const instance = createAlignmentEditor(
      '<p style="text-align: left; vertical-align: top">Text</p>',
    )

    setTextCursor(instance, 'paragraph')
    expect(instance.commands.setNodeAlignment('right')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: 'right',
      nodeVerticalAlign: 'top',
    })
    expect(instance.commands.setNodeAlignment(undefined, 'bottom')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: 'right',
      nodeVerticalAlign: 'bottom',
    })
    expect(instance.commands.unsetNodeAlignment()).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({
      nodeTextAlign: null,
      nodeVerticalAlign: null,
    })
    expect(instance.commands.unsetNodeAlignment()).toBe(false)
    expect(instance.commands.setNodeAlignment()).toBe(false)
  })
})
