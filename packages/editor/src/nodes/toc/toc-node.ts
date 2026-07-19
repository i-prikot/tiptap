import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { TocNode as SchemaTocNode } from '@i-prikot/editor-schema'
import TocNodeView from './TocNodeView.vue'

export type { TocNodeAttributes, TocNodeOptions } from '@i-prikot/editor-schema'

export const TocNode = SchemaTocNode.extend({
  addNodeView() {
    return VueNodeViewRenderer(TocNodeView, {
      stopEvent: ({ event }) => {
        if (!(event instanceof MouseEvent)) return false
        const target = event.target as HTMLElement | null
        return !!target?.closest('.tiptap-table-of-contents-item')
      },
    })
  },
})
