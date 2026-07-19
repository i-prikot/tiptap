import type { Extensions } from '@tiptap/core'
import {
  createExtensionKit as createSchemaExtensionKit,
  type ExtensionKitOptions,
} from '@i-prikot/editor-schema'
import { Image } from '../nodes/image/image-node'
import { ImageUploadNode } from '../nodes/image-upload/image-upload-node'
import { TocNode } from '../nodes/toc/toc-node'

export type {
  ExtensionKitFeatureFlags,
  ExtensionKitOptions,
  ExtensionKitPlaceholder,
} from '@i-prikot/editor-schema'

export function createExtensionKit(options: ExtensionKitOptions): Extensions {
  return createSchemaExtensionKit(options, {
    image: Image,
    imageUpload: ImageUploadNode,
    toc: TocNode,
  })
}
