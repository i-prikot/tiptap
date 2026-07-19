import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { ImageUploadNode as SchemaImageUploadNode } from '@i-prikot/editor-schema'
import ImageUploadNodeView from './ImageUploadNodeView.vue'

export type { ImageUploadNodeOptions } from '@i-prikot/editor-schema'

export const ImageUploadNode = SchemaImageUploadNode.extend({
  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNodeView)
  },
})
