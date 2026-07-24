import type { Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { ImageUploadNode, type ImageUploadNodeOptions } from '@i-prikot/editor-schema'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, type ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useEditorOperationError,
  provideEditorOperationError,
} from '../../../packages/editor/src/composables/useEditorOperationError'
import { useImageDownload } from '../../../packages/editor/src/composables/useImageDownload'
import { useImageUpload } from '../../../packages/editor/src/composables/useImageUpload'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(content: string, extensions: Extensions): Editor {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions })
  editors.push(editor)
  return editor
}

function selectFile(file: File): Event {
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  return { target: input } as Event
}

function getFirstNode(editor: Editor) {
  const node = editor.state.doc.firstChild
  if (node === null) throw new Error('Expected image upload node')
  return node
}

function mountWithOperationError<T>(
  onOperationError: (payload: unknown) => void,
  useAction: () => T,
): T {
  let action: T | undefined
  const ActionConsumer = defineComponent({
    setup() {
      action = useAction()
      return () => h('div')
    },
  })
  const ActionProvider = defineComponent({
    setup() {
      provideEditorOperationError(onOperationError)
      return () => h(ActionConsumer)
    },
  })

  wrappers.push(mount(ActionProvider))
  if (action === undefined) throw new Error('Expected operation action to initialize')
  return action
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image operation errors', () => {
  it('sends Tinyfy one safe event after all download strategies fail', async () => {
    const editor = createEditor('<img src="https://tinyfy.example.test/private.png" alt="Photo">', [
      StarterKit,
      Image,
    ])
    const onOperationError = vi.fn()
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('credential: secret-value')))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('direct download blocked')
    })
    vi.spyOn(window, 'open').mockReturnValue(null)

    const download = mountWithOperationError(onOperationError, () =>
      useImageDownload(computed(() => editor)),
    )

    await expect(download.handleDownload()).resolves.toBe(false)
    expect(onOperationError).toHaveBeenCalledTimes(1)
    expect(onOperationError).toHaveBeenCalledWith({
      operation: 'image-download',
      errorClass: 'Error',
      code: 'IMAGE_DOWNLOAD_FAILED',
    })
  })

  it('does not send Tinyfy an event when the direct download fallback succeeds', async () => {
    const editor = createEditor('<img src="https://tinyfy.example.test/photo.png" alt="Photo">', [
      StarterKit,
      Image,
    ])
    const onOperationError = vi.fn()
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS request failed')))
    const open = vi.spyOn(window, 'open')

    const download = mountWithOperationError(onOperationError, () =>
      useImageDownload(computed(() => editor)),
    )

    await expect(download.handleDownload()).resolves.toBe(true)
    expect(onOperationError).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('does not send Tinyfy an event when a pending upload is cancelled', async () => {
    let rejectUpload: ((reason?: unknown) => void) | undefined
    const onOperationError = vi.fn()
    const editor = createEditor(
      '<image-upload accept="image/*" limit="1" max-size="1000"></image-upload>',
      [StarterKit, ImageUploadNode],
    )
    const options: ImageUploadNodeOptions = {
      type: 'image',
      accept: 'image/*',
      limit: 1,
      maxSize: 1_000,
      upload: vi.fn(
        () =>
          new Promise<string>((_resolve, reject) => {
            rejectUpload = reject
          }),
      ),
      HTMLAttributes: {},
    }

    const upload = mountWithOperationError(onOperationError, () => {
      const reportOperationError = useEditorOperationError()
      return useImageUpload({
        editor,
        getPos: () => 0,
        node: computed(() => getFirstNode(editor)),
        options: computed(
          () =>
            ({
              ...options,
              onError: (error: Error) => reportOperationError('image-upload', error),
            }) as ImageUploadNodeOptions,
        ) as ComputedRef<ImageUploadNodeOptions>,
      })
    })

    upload.handleFileInputChange(
      selectFile(new File(['photo'], 'photo.png', { type: 'image/png' })),
    )
    await vi.waitFor(() => expect(rejectUpload).toBeTypeOf('function'))

    const pendingUpload = upload.fileItems.value[0]
    if (!pendingUpload) throw new Error('Expected a pending image upload')

    upload.removeFileItem(pendingUpload.id)
    rejectUpload?.(new DOMException('Upload cancelled', 'AbortError'))

    await vi.waitFor(() => expect(upload.fileItems.value).toEqual([]))
    await new Promise<void>((resolve) => queueMicrotask(resolve))
    expect(onOperationError).not.toHaveBeenCalled()
  })
})
