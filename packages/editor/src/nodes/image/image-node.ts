import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Image as SchemaImage } from '@tinyfy/editor-schema'
import ImageNodeView from './ImageNodeView.vue'

export const Image = SchemaImage.extend({
  addNodeView() {
    return VueNodeViewRenderer(ImageNodeView)
  },
})
