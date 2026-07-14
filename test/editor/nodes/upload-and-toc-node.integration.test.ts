import { Editor, type Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageUploadNode } from '../../../src/editor/nodes/image-upload/image-upload-node'
import { TocNode } from '../../../src/editor/nodes/toc/toc-node'

const editors: Editor[] = []

function createEditor(extensions: Extensions, content = '') {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions: [StarterKit, ...extensions] })
  editors.push(editor)
  return editor
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image upload node extension', () => {
  it('parses, renders, inserts, and opens the upload control from keyboard selection', () => {
    const editor = createEditor(
      [ImageUploadNode.configure({ accept: 'image/png', limit: 3, maxSize: 5_000 })],
      '<div data-type="image-upload" accept="image/jpeg" limit="2" maxsize="40"></div>',
    )

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: { accept: 'image/jpeg', limit: 2, maxSize: 40 },
          type: 'imageUpload',
        },
      ],
    })
    expect(editor.getHTML()).toContain('data-type="image-upload"')

    expect(editor.commands.setImageUploadNode({ accept: 'image/gif', limit: 1 })).toBe(true)
    expect(editor.getJSON().content?.find((node) => node.type === 'imageUpload')).toMatchObject({
      attrs: expect.objectContaining({ accept: 'image/gif', limit: 1 }),
      type: 'imageUpload',
    })

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    const click = vi.fn()
    const uploadControl = Object.assign(document.createElement('button'), { click })
    const nodeDom = document.createElement('div')
    nodeDom.append(uploadControl)
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(nodeDom)
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('leaves Enter untouched when selection is not an upload node', () => {
    const editor = createEditor([ImageUploadNode], '<p>Text</p>')

    const nodeDOM = vi.spyOn(editor.view, 'nodeDOM')
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true)
    expect(nodeDOM).not.toHaveBeenCalled()
  })
})

describe('toc node extension', () => {
  it('parses numeric and boolean attrs, renders them, and inserts a configured node', () => {
    const editor = createEditor(
      [TocNode.configure({ HTMLAttributes: { class: 'toc-shell' } })],
      '<div data-type="toc-node" data-top-offset="24" data-max-show-count="4" data-show-title="false"></div>',
    )

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: { maxShowCount: 4, showTitle: false, topOffset: 24 },
          type: 'tocNode',
        },
      ],
    })
    expect(editor.getHTML()).toContain('data-type="toc-node"')
    expect(editor.getHTML()).toContain('data-top-offset="24"')
    expect(editor.getHTML()).toContain('data-show-title="false"')

    expect(editor.commands.insertTocNode({ maxShowCount: 8, showTitle: true, topOffset: 12 })).toBe(
      true,
    )
    expect(editor.getJSON().content?.find((node) => node.type === 'tocNode')).toMatchObject({
      attrs: { maxShowCount: 8, showTitle: true, topOffset: 12 },
      type: 'tocNode',
    })
  })

  it('normalizes invalid numeric attrs to null and excludes absent render attrs', () => {
    const editor = createEditor(
      [TocNode],
      '<div data-type="toc-node" data-top-offset="invalid" data-max-show-count="Infinity"></div>',
    )

    expect(editor.getJSON()).toMatchObject({
      content: [
        { attrs: { maxShowCount: null, showTitle: true, topOffset: null }, type: 'tocNode' },
      ],
    })
  })
})
