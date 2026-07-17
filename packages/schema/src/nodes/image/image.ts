/**
 * Image — расширенный image-узел: подпись (figure/figcaption),
 * выравнивание `data-align`, ресайз мышью/тачем через NodeView.
 * Порт из чанка 34p294mqk5mqb (модуль 703291).
 */
import { Image as BaseImage } from '@tiptap/extension-image'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { NodeType } from '@tiptap/pm/model'
import type { Selection } from '@tiptap/pm/state'

function imgAttributes(img: HTMLElement) {
  return {
    src: img.getAttribute('src'),
    alt: img.getAttribute('alt'),
    title: img.getAttribute('title'),
    width: img.getAttribute('width'),
    height: img.getAttribute('height'),
  }
}

interface ImageSelectionInfo {
  imageNode: import('@tiptap/pm/model').Node
  imagePos: number
  atStart: boolean
  atEnd: boolean
}

/** Информация о позиции курсора относительно image-узла. */
function getImageSelectionInfo(selection: Selection, type: NodeType): ImageSelectionInfo | null {
  if (selection instanceof NodeSelection && selection.node.type === type) {
    return { imageNode: selection.node, imagePos: selection.from, atStart: true, atEnd: true }
  }
  if (selection.empty && selection.$from.parent.type === type) {
    const { $from } = selection
    return {
      imageNode: $from.parent,
      imagePos: $from.before(),
      atStart: $from.parentOffset === 0,
      atEnd: $from.parentOffset === $from.parent.content.size,
    }
  }
  return null
}

export const Image = BaseImage.extend({
  // caption редактируется как inline-содержимое узла
  content: 'inline*',

  addAttributes() {
    return {
      ...this.parent?.(),
      'data-align': { default: null },
      showCaption: {
        default: false,
        parseHTML: (element) =>
          element.tagName === 'FIGURE' || element.getAttribute('data-show-caption') === 'true',
        renderHTML: (attributes) => (attributes.showCaption ? { 'data-show-caption': 'true' } : {}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (element: HTMLElement) => {
          const img = element.querySelector('img')
          if (!img) return false
          return {
            ...imgAttributes(img),
            'data-align': element.getAttribute('data-align'),
            showCaption: true,
          }
        },
        contentElement: 'figcaption',
      },
      {
        tag: 'img[src]',
        getAttrs: (element: HTMLElement) =>
          !element.closest('figure') && {
            ...imgAttributes(element),
            'data-align': element.getAttribute('data-align'),
            showCaption: false,
          },
      },
    ]
  },

  renderHTML({ node }) {
    const { src, alt, title, width, height, showCaption } = node.attrs
    const align = node.attrs['data-align']

    const imgAttrs: Record<string, unknown> = { src: src || '' }
    if (alt) imgAttrs.alt = alt
    if (title) imgAttrs.title = title
    if (width) imgAttrs.width = width
    if (height) imgAttrs.height = height

    const hasContent = node.content.size > 0
    if (showCaption || hasContent) {
      const figureAttrs: Record<string, unknown> = { 'data-url': src || '' }
      if (showCaption) figureAttrs['data-show-caption'] = 'true'
      if (align) figureAttrs['data-align'] = align
      return ['figure', figureAttrs, ['img', imgAttrs], ['figcaption', {}, 0]]
    }

    if (align) imgAttrs['data-align'] = align
    return ['img', imgAttrs]
  },

  addKeyboardShortcuts() {
    return {
      // Mod-A внутри подписи выделяет только подпись
      'Mod-a': ({ editor }) => {
        const { state, view } = editor
        const { selection } = state
        const { $from } = selection

        let imageNode: import('@tiptap/pm/model').Node | null = null
        let imagePos: number | null = null
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth)
          if (node.type === this.type) {
            imageNode = node
            imagePos = depth === 0 ? 0 : $from.before(depth)
            break
          }
        }
        if (
          !imageNode ||
          imagePos == null ||
          imageNode.content.size === 0 ||
          imageNode.textContent.length === 0
        ) {
          return false
        }

        const from = imagePos + 1
        const to = imagePos + imageNode.nodeSize - 1
        view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
        return true
      },
      // ArrowUp на изображении в начале документа создаёт параграф над ним
      ArrowUp: ({ editor }) => {
        const info = getImageSelectionInfo(editor.state.selection, this.type)
        return (
          !!info &&
          !!info.atStart &&
          info.imagePos === 0 &&
          editor.chain().insertContentAt(0, { type: 'paragraph' }).setTextSelection(1).run()
        )
      },
    }
  },
})
