import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Image, ImageUploadNode, type ImageUploadNodeOptions } from '@i-prikot/editor-schema'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, type ComputedRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useImageUpload } from '../../../packages/editor/src/composables/useImageUpload'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(): Editor {
  const host = document.createElement('div')
  document.body.append(host)

  const editor = new Editor({
    element: host,
    content: {
      type: 'doc',
      content: [
        {
          type: 'imageUpload',
          attrs: { accept: 'image/*', limit: 1, maxSize: 1_000 },
        },
      ],
    },
    extensions: [StarterKit, Image, ImageUploadNode],
  })
  editors.push(editor)
  return editor
}

function getFirstNode(editor: Editor): ProseMirrorNode {
  const node = editor.state.doc.firstChild
  if (node === null) throw new Error('Expected image upload node')
  return node
}

function useUpload(editor: Editor, options: ImageUploadNodeOptions) {
  let upload: ReturnType<typeof useImageUpload> | undefined
  const Host = defineComponent({
    setup() {
      upload = useImageUpload({
        editor,
        getPos: () => 0,
        node: computed(() => getFirstNode(editor)),
        options: computed(() => options) as ComputedRef<ImageUploadNodeOptions>,
      })
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))

  if (upload === undefined) throw new Error('Expected image upload composable to initialize')
  return upload
}

function selectFile(file: File): Event {
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  return { target: input } as Event
}

function createReplacementChain() {
  const chain = {
    focus: vi.fn(),
    deleteRange: vi.fn(),
    insertContentAt: vi.fn(),
    run: vi.fn(() => true),
  }
  chain.focus.mockReturnValue(chain)
  chain.deleteRange.mockReturnValue(chain)
  chain.insertContentAt.mockReturnValue(chain)
  return chain
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('useImageUpload', () => {
  it('reports progress, accepts a safe upload URL, and replaces the upload node through the editor chain', async () => {
    const onSuccess = vi.fn()
    const uploadAdapter = vi.fn(async (_file, callbacks) => {
      callbacks.onProgress({ progress: 42 })
      return '/uploads/photo.png'
    })
    const editor = createEditor()
    const replacementChain = createReplacementChain()
    vi.spyOn(editor, 'chain').mockReturnValue(replacementChain as never)
    const upload = useUpload(editor, {
      type: 'image',
      accept: 'image/*',
      limit: 1,
      maxSize: 1_000,
      upload: uploadAdapter,
      onSuccess,
      HTMLAttributes: {},
    })
    const file = new File(['photo'], 'photo.png', { type: 'image/png' })

    upload.handleFileInputChange(selectFile(file))

    await vi.waitFor(() => expect(uploadAdapter).toHaveBeenCalledWith(file, expect.any(Object)))
    await vi.waitFor(() => expect(replacementChain.run).toHaveBeenCalledOnce())

    expect(upload.fileItems.value).toMatchObject([{ progress: 100, status: 'success' }])
    expect(replacementChain.deleteRange).toHaveBeenCalledWith({ from: 0, to: 1 })
    expect(replacementChain.insertContentAt).toHaveBeenCalledWith(0, [
      {
        type: 'image',
        attrs: {
          alt: 'photo',
          src: expect.stringMatching(/\/uploads\/photo\.png$/),
          title: 'photo',
        },
      },
    ])
    expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/\/uploads\/photo\.png$/))
  })

  it('rejects unsafe upload URLs without replacing the upload node', async () => {
    const onError = vi.fn()
    const editor = createEditor()
    const upload = useUpload(editor, {
      type: 'image',
      accept: 'image/*',
      limit: 1,
      maxSize: 1_000,
      upload: vi.fn().mockResolvedValue('javascript:alert(1)'),
      onError,
      HTMLAttributes: {},
    })

    upload.handleFileInputChange(
      selectFile(new File(['photo'], 'photo.png', { type: 'image/png' })),
    )

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())

    expect(onError).toHaveBeenCalledWith(new Error('Upload failed: Invalid URL returned'))
    expect(upload.fileItems.value).toMatchObject([
      { errorMessage: 'Image upload failed', status: 'error' },
    ])
    expect(editor.state.doc.firstChild?.type.name).toBe('imageUpload')
  })
})
