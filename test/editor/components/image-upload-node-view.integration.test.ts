import { Editor, type NodeViewProps } from '@tiptap/core'
import { DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageUploadNodeView from '../../../src/editor/nodes/image-upload/ImageUploadNodeView.vue'
import type { ImageUploadCallbacks } from '../../../src/editor/types'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function flushUploads() {
  return Promise.resolve()
    .then(() => nextTick())
    .then(() => nextTick())
}

function createEditor() {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({
    element: host,
    content: '<p>Upload target</p>',
    extensions: [StarterKit],
  })
  editors.push(editor)
  return editor
}

function mountUploadNode(options: Record<string, unknown> = {}) {
  const editor = createEditor()
  const commandChain = {
    focus: vi.fn(),
    deleteRange: vi.fn(),
    insertContentAt: vi.fn(),
    run: vi.fn(),
  }
  commandChain.focus.mockReturnValue(commandChain)
  commandChain.deleteRange.mockReturnValue(commandChain)
  commandChain.insertContentAt.mockReturnValue(commandChain)
  vi.spyOn(editor, 'chain').mockReturnValue(commandChain as unknown as ReturnType<Editor['chain']>)
  vi.spyOn(editor.view, 'dispatch').mockImplementation(() => undefined)

  const wrapper = mount(ImageUploadNodeView, {
    attachTo: document.body,
    props: {
      decorations: [],
      deleteNode: vi.fn(),
      editor,
      extension: {
        options: {
          accept: 'image/*',
          limit: 2,
          maxSize: 1_024,
          onError: vi.fn(),
          onSuccess: vi.fn(),
          type: 'image',
          ...options,
        },
      } as unknown as NodeViewProps['extension'],
      getPos: () => 0,
      node: {
        attrs: { accept: 'image/*', limit: 2, maxSize: 1_024 },
        content: { size: 0 },
        nodeSize: 1,
      } as unknown as NodeViewProps['node'],
      selected: false,
      updateAttributes: vi.fn(),
      view: editor.view,
      HTMLAttributes: {},
      innerDecorations: DecorationSet.empty,
    },
    global: {
      stubs: {
        NodeViewWrapper: { template: '<div><slot /></div>' },
      },
    },
  })
  wrappers.push(wrapper)

  return { commandChain, editor, wrapper }
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files })
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image upload node view', () => {
  it('uploads files, reports progress, replaces the node, and revokes removed previews', async () => {
    const onSuccess = vi.fn()
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const upload = vi.fn(async (_file: File, { onProgress }: ImageUploadCallbacks) => {
      onProgress({ progress: 45 })
      return 'https://example.test/cover.png'
    })
    const { commandChain, wrapper } = mountUploadNode({ onSuccess, upload })
    const input = wrapper.get('input[type="file"]')
    setInputFiles(input.element as HTMLInputElement, [
      new File(['image'], 'cover.png', { type: 'image/png' }),
    ])

    await input.trigger('change')
    await flushUploads()

    expect(upload).toHaveBeenCalledOnce()
    expect(upload).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        onProgress: expect.any(Function),
        abortSignal: expect.any(AbortSignal),
      }),
    )
    expect(onSuccess).toHaveBeenCalledWith('https://example.test/cover.png')
    expect(commandChain.deleteRange).toHaveBeenCalledWith({ from: 0, to: 1 })
    expect(commandChain.insertContentAt).toHaveBeenCalledWith(0, [
      expect.objectContaining({ type: 'image', attrs: expect.objectContaining({ alt: 'cover' }) }),
    ])
    expect(commandChain.run).toHaveBeenCalledOnce()

    await wrapper.get('button').trigger('click')
    expect(revokeObjectURL).toHaveBeenCalledWith('https://example.test/cover.png')
  })

  it('reports missing, oversized, over-limit, and failed uploads without replacing the node', async () => {
    const onError = vi.fn()
    const { commandChain, wrapper } = mountUploadNode({ onError, maxSize: 2 })
    const input = wrapper.get('input[type="file"]')

    await input.trigger('change')
    expect((onError.mock.calls[onError.mock.calls.length - 1]?.[0] as Error).message).toBe(
      'No file selected',
    )

    setInputFiles(input.element as HTMLInputElement, [
      new File(['oversized'], 'large.png', { type: 'image/png' }),
    ])
    await input.trigger('change')
    await flushUploads()
    expect((onError.mock.calls[onError.mock.calls.length - 1]?.[0] as Error).message).toContain(
      'File size exceeds',
    )

    setInputFiles(input.element as HTMLInputElement, [
      new File(['a'], 'one.png', { type: 'image/png' }),
      new File(['b'], 'two.png', { type: 'image/png' }),
      new File(['c'], 'three.png', { type: 'image/png' }),
    ])
    await input.trigger('change')
    await flushUploads()
    expect((onError.mock.calls[onError.mock.calls.length - 1]?.[0] as Error).message).toBe(
      'Maximum 2 files allowed',
    )

    expect(commandChain.run).not.toHaveBeenCalled()
  })

  it('keeps an error preview when the configured upload rejects', async () => {
    const onError = vi.fn()
    const upload = vi.fn().mockRejectedValue(new Error('Upload service unavailable'))
    const { wrapper } = mountUploadNode({ onError, upload })
    const input = wrapper.get('input[type="file"]')
    setInputFiles(input.element as HTMLInputElement, [
      new File(['image'], 'broken.png', { type: 'image/png' }),
    ])

    await input.trigger('change')
    await flushUploads()

    expect((onError.mock.calls[onError.mock.calls.length - 1]?.[0] as Error).message).toBe(
      'Upload service unavailable',
    )
    expect(wrapper.text()).toContain('broken.png')
  })

  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg />', 'blob:unsafe-image'])(
    'rejects an unsafe URL returned by the upload adapter: %s',
    async (unsafeUrl) => {
      const onError = vi.fn()
      const onSuccess = vi.fn()
      const upload = vi.fn(async () => unsafeUrl)
      const { commandChain, wrapper } = mountUploadNode({ onError, onSuccess, upload })
      const input = wrapper.get('input[type="file"]')
      setInputFiles(input.element as HTMLInputElement, [
        new File(['image'], 'unsafe.png', { type: 'image/png' }),
      ])

      await input.trigger('change')
      await flushUploads()

      expect((onError.mock.calls[0]?.[0] as Error).message).toBe(
        'Upload failed: Invalid URL returned',
      )
      expect(onSuccess).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Image upload failed')
      expect(commandChain.run).not.toHaveBeenCalled()
    },
  )

  it('cancels an injected upload without reporting an error or replacing the node', async () => {
    const onError = vi.fn()
    let abortSignal: AbortSignal | undefined
    const upload = vi.fn(
      (_file: File, callbacks: ImageUploadCallbacks) =>
        new Promise<string>((resolve) => {
          abortSignal = callbacks.abortSignal
          callbacks.abortSignal.addEventListener(
            'abort',
            () => resolve('https://example.test/cancelled.png'),
            { once: true },
          )
        }),
    )
    const { commandChain, wrapper } = mountUploadNode({ onError, upload })
    const input = wrapper.get('input[type="file"]')
    setInputFiles(input.element as HTMLInputElement, [
      new File(['image'], 'cancelled.png', { type: 'image/png' }),
    ])

    await input.trigger('change')
    await nextTick()
    await wrapper.get('button').trigger('click')
    await flushUploads()

    expect(upload).toHaveBeenCalledOnce()
    expect(abortSignal?.aborted).toBe(true)
    expect(onError).not.toHaveBeenCalled()
    expect(commandChain.run).not.toHaveBeenCalled()
  })

  it('reports a missing injected upload adapter without replacing the node', async () => {
    const onError = vi.fn()
    const { commandChain, wrapper } = mountUploadNode({ onError })
    const input = wrapper.get('input[type="file"]')
    setInputFiles(input.element as HTMLInputElement, [
      new File(['image'], 'unconfigured.png', { type: 'image/png' }),
    ])

    await input.trigger('change')
    await flushUploads()

    expect((onError.mock.calls[0]?.[0] as Error).message).toBe(
      'image upload adapter is not configured',
    )
    expect(wrapper.text()).toContain('image upload adapter is not configured')
    expect(commandChain.run).not.toHaveBeenCalled()
  })
})
