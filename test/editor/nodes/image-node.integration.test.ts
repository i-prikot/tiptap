import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it } from 'vitest'
import { Image } from '../../../src/editor/nodes/image/image-node'

const editors: Editor[] = []

function createEditor(content = '') {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions: [StarterKit, Image] })
  editors.push(editor)
  return editor
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image node extension', () => {
  it('parses and renders figure captions with image metadata and alignment', () => {
    const editor = createEditor(
      '<figure data-align="center"><img src="https://example.test/cover.png" alt="Cover" title="Title" width="320" height="180"><figcaption>Caption text</figcaption></figure>',
    )

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: expect.objectContaining({
            alt: 'Cover',
            height: '180',
            showCaption: true,
            src: 'https://example.test/cover.png',
            title: 'Title',
            width: '320',
            'data-align': 'center',
          }),
          content: [{ text: 'Caption text', type: 'text' }],
          type: 'image',
        },
      ],
    })
    expect(editor.getHTML()).toContain('<figure')
    expect(editor.getHTML()).toContain('data-show-caption="true"')
    expect(editor.getHTML()).toContain('<figcaption>Caption text</figcaption>')
  })

  it('keeps standalone images outside figures and adds a paragraph above an image at document start', () => {
    const editor = createEditor('<img src="https://example.test/plain.png" data-align="right">')

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: expect.objectContaining({
            showCaption: false,
            src: 'https://example.test/plain.png',
            'data-align': 'right',
          }),
          type: 'image',
        },
      ],
    })
    expect(editor.getHTML()).toContain('<img')
    expect(editor.getHTML()).toContain('data-align="right"')

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    expect(editor.commands.keyboardShortcut('ArrowUp')).toBe(true)
    expect(editor.getJSON().content?.[0]?.type).toBe('paragraph')
  })
})
