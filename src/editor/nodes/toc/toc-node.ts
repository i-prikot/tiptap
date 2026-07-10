/**
 * TocNode — блок «Table of contents»: рендерит список заголовков документа
 * (данные приходят из расширения TableOfContents через TOC-контекст).
 * Порт из чанка 094r3nrv45pwr (модуль 40658).
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TocNodeView from './TocNodeView.vue'

export interface TocNodeOptions {
  topOffset: number
  maxShowCount: number
  showTitle: boolean
  HTMLAttributes: Record<string, unknown>
}

export interface TocNodeAttributes {
  topOffset?: number | null
  maxShowCount?: number | null
  showTitle?: boolean | null
}

function numberAttribute(dataName: string) {
  return {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const raw = element.getAttribute(dataName)
      const parsed = raw != null ? Number(raw) : null
      return Number.isFinite(parsed) ? parsed : null
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const camelName = dataName
        .replace(/^data-/, '')
        .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
      const value = attributes[camelName]
      return value == null ? {} : { [dataName]: value }
    },
  }
}

export const TocNode = Node.create<TocNodeOptions>({
  name: 'tocNode',
  group: 'block customNode',
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      topOffset: 0,
      maxShowCount: 20,
      showTitle: true,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      topOffset: numberAttribute('data-top-offset'),
      maxShowCount: numberAttribute('data-max-show-count'),
      showTitle: {
        default: true,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-show-title')
          return raw !== 'false' && (raw === 'true' || null)
        },
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.showTitle == null ? {} : { 'data-show-title': String(attributes.showTitle) },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toc-node"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'toc-node' }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(TocNodeView, {
      stopEvent: ({ event }) => {
        if (!(event instanceof MouseEvent)) return false
        const target = event.target as HTMLElement | null
        return !!target && !!target.closest('.tiptap-table-of-contents-item')
      },
    })
  },

  addCommands() {
    return {
      insertTocNode:
        (attrs?: TocNodeAttributes) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
