import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { ImageUploadNode as SchemaImageUploadNode } from '@tinyfy/editor-schema'
import ImageUploadNodeView from './ImageUploadNodeView.vue'

export type { ImageUploadNodeOptions } from '@tinyfy/editor-schema'

export const ImageUploadNode = SchemaImageUploadNode.extend({
  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNodeView)
  },
})
