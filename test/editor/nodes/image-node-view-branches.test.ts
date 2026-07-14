import { Editor, type NodeViewProps } from '@tiptap/core'
import { DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { NodeSelection } from '@tiptap/pm/state'
import { markRaw, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageNodeView from '../../../src/editor/nodes/image/ImageNodeView.vue'
import { Image } from '../../../src/editor/nodes/image/image-node'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(attributes: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, Image],
    content: {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://example.test/image.png',
            alt: 'Example',
            showCaption: true,
            width: 200,
            ...attributes,
          },
        },
      ],
    },
  })
  editors.push(editor)
  return editor
}

function mountNodeView(editor: Editor, updateAttributes = vi.fn()) {
  const node = editor.state.doc.firstChild
  if (!node) throw new Error('Expected image node')
  const wrapper = mount(ImageNodeView, {
    attachTo: document.body,
    props: {
      decorations: [],
      deleteNode: vi.fn(),
      editor: markRaw(editor),
      extension: { options: {} } as unknown as NodeViewProps['extension'],
      getPos: () => 0,
      node,
      selected: false,
      updateAttributes,
      view: editor.view,
      HTMLAttributes: {},
      innerDecorations: DecorationSet.empty,
    },
    global: {
      stubs: {
        NodeViewContent: { template: '<div><slot /></div>' },
        NodeViewWrapper: { template: '<div><slot /></div>' },
      },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image node view branch behavior', () => {
  it('selects the image and resizes it through hover handles', async () => {
    const editor = createEditor()
    const updateAttributes = vi.fn()
    const wrapper = mountNodeView(editor, updateAttributes)
    const container = wrapper.find('.tiptap-image-container')
    Object.defineProperty(container.element, 'clientWidth', { configurable: true, value: 200 })
    Object.defineProperty(editor.view.dom, 'firstElementChild', {
      configurable: true,
      value: { clientWidth: 360 },
    })

    await wrapper.find('img').trigger('click')
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)

    await wrapper.trigger('mouseenter')
    await nextTick()
    const handles = wrapper.findAll('.tiptap-image-handle')
    expect(handles).toHaveLength(2)

    await handles[0]!.trigger('mousedown', { clientX: 150 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(updateAttributes).toHaveBeenLastCalledWith({ width: 330 })
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)

    await wrapper.trigger('mouseleave', { relatedTarget: document.body })
    await nextTick()
    expect(wrapper.findAll('.tiptap-image-handle')).toHaveLength(0)
  })

  it('handles center alignment, touch input, minimum width, and outside completion', async () => {
    const editor = createEditor({ 'data-align': 'center', showCaption: false, width: null })
    const updateAttributes = vi.fn()
    const wrapper = mountNodeView(editor, updateAttributes)
    const container = wrapper.find('.tiptap-image-container')
    Object.defineProperty(container.element, 'clientWidth', { configurable: true, value: 120 })

    await wrapper.trigger('touchstart')
    await nextTick()
    const right = wrapper.find('.tiptap-image-handle-right')
    expect(right.exists()).toBe(true)
    await right.trigger('mousedown', { clientX: 100 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(updateAttributes).toHaveBeenLastCalledWith({ width: 96 })
    expect(wrapper.find('[data-placeholder="Add a caption..."]').exists()).toBe(false)
  })
})
