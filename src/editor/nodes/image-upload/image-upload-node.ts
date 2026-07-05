/**
 * ImageUploadNode — блок-плейсхолдер загрузки изображений: дропзона,
 * выбор файлов, прогресс и отмена; после успешной загрузки заменяет
 * себя image-узлами.
 * Порт из чанка 3jdxmcvhjtoe- (модуль 580454).
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageUploadNodeView from './ImageUploadNodeView.vue'

export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
) => Promise<string>

export interface ImageUploadNodeOptions {
  /** Тип узла, вставляемого после загрузки. */
  type: string
  accept: string
  limit: number
  maxSize: number
  upload?: UploadFunction
  onError?: (error: Error) => void
  onSuccess?: (url: string) => void
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      setImageUploadNode: (attrs?: Record<string, unknown>) => ReturnType
    }
  }
}

export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  name: 'imageUpload',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      type: 'image',
      accept: 'image/*',
      limit: 1,
      maxSize: 0,
      upload: undefined,
      onError: undefined,
      onSuccess: undefined,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      accept: { default: this.options.accept },
      limit: { default: this.options.limit },
      maxSize: { default: this.options.maxSize },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'image-upload' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNodeView)
  },

  addCommands() {
    return {
      setImageUploadNode:
        (attrs?: Record<string, unknown>) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },

  addKeyboardShortcuts() {
    return {
      // Enter на выделенном узле открывает диалог выбора файла
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const { nodeAfter } = selection.$from
        if (nodeAfter && nodeAfter.type.name === 'imageUpload' && editor.isActive('imageUpload')) {
          const dom = editor.view.nodeDOM(selection.$from.pos)
          if (dom && dom instanceof HTMLElement) {
            const child = dom.firstChild
            if (child && child instanceof HTMLElement) {
              child.click()
              return true
            }
          }
        }
        return false
      },
    }
  },
})
