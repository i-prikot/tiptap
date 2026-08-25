import { Extension } from '@tiptap/core'

/**
 * Registers persisted TOC metadata in the renderer schema without emitting
 * interactive anchor attributes into the established SSR HTML contract.
 */
export const RendererTocAttributes = Extension.create({
  name: 'rendererTocAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          'data-toc-id': {
            default: null,
            parseHTML: (element: HTMLElement) => element.dataset.tocId ?? null,
            renderHTML: () => ({}),
          },
        },
      },
    ]
  },
})
