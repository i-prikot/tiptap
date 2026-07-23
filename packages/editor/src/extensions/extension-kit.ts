import type { Extensions } from '@tiptap/core'
import {
  createExtensionKit as createSchemaExtensionKit,
  Mathematics,
  type ExtensionKitOptions,
} from '@i-prikot/editor-schema'
import { Image } from '../nodes/image/image-node'
import { ImageUploadNode } from '../nodes/image-upload/image-upload-node'
import { TocNode } from '../nodes/toc/toc-node'
import { createLazyKatexNodeView } from './lazy-katex'

export type {
  ExtensionKitFeatureFlags,
  ExtensionKitOptions,
  ExtensionKitPlaceholder,
} from '@i-prikot/editor-schema'

export function createExtensionKit(options: ExtensionKitOptions): Promise<Extensions> {
  return createSchemaExtensionKit(options, {
    image: Image,
    imageUpload: ImageUploadNode,
    mathematics: Mathematics.configure({
      blockOptions: { nodeView: createLazyKatexNodeView },
      inlineOptions: { nodeView: createLazyKatexNodeView },
    }),
    toc: TocNode,
  })
}
