import type { Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, type ComputedRef } from 'vue'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useCopyToClipboard,
  useDeleteNode,
  useDuplicate,
  useImageDownload,
  useResetAllFormatting,
} from '../../../src/editor/composables/useNodeActions'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(content: string, extensions: Extensions = [StarterKit]): Editor {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions })
  editors.push(editor)
  return editor
}

function useAction<T>(editor: Editor, factory: (editorRef: ComputedRef<Editor | null>) => T): T {
  let action: T | undefined
  const ActionHost = defineComponent({
    setup() {
      action = factory(computed(() => editor))
      return () => h('div')
    },
  })
  const wrapper = mount(ActionHost)
  wrappers.push(wrapper)
  if (!action) throw new Error('Expected composable action to initialize')
  return action
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('node actions', () => {
  it('duplicates and deletes the selected block through the Tiptap command chain', () => {
    const editor = createEditor('<p>First block</p><p>Second block</p>')
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))

    const duplicate = useAction(editor, useDuplicate)
    expect(duplicate.canDuplicate.value).toBe(true)
    expect(duplicate.handleDuplicate()).toBe(true)
    expect(editor.getText().match(/First block/g)).toHaveLength(2)

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    const remove = useAction(editor, useDeleteNode)
    expect(remove.canDeleteNode.value).toBe(true)
    expect(remove.handleDeleteNode()).toBe(true)
    expect(editor.getText().match(/First block/g)).toHaveLength(1)
  })

  it('copies a text selection without formatting and resets removable marks', async () => {
    const editor = createEditor('<p><strong>Bold copy</strong></p>')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 10)),
    )

    const copy = useAction(editor, (editorRef) => useCopyToClipboard(editorRef, false))
    expect(copy.canCopyToClipboard.value).toBe(true)
    await expect(copy.handleCopyToClipboard()).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('Bold copy')

    const reset = useAction(editor, useResetAllFormatting)
    expect(reset.canReset.value).toBe(true)
    expect(reset.handleResetFormatting()).toBe(true)
    expect(editor.getHTML()).not.toContain('<strong>')
  })

  it('downloads a selected image through fetch and an object URL', async () => {
    const editor = createEditor('<img src="https://example.test/photo.png" alt="Photo">', [
      StarterKit,
      Image,
    ])
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))

    const createObjectURL = vi.fn(() => 'blob:coverage-image')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(new Blob(['image']), {
            headers: { 'content-type': 'image/png' },
            status: 200,
          }),
        ),
    )

    const download = useAction(editor, useImageDownload)
    expect(download.canDownload.value).toBe(true)
    await expect(download.handleDownload()).resolves.toBe(true)
    expect(createObjectURL).toHaveBeenCalledOnce()
  })
})
