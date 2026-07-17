import type { JSONContent } from '@tinyfy/editor-schema'

export interface RendererDocumentInput {
  document: JSONContent
}

export interface RendererDocumentOutput {
  html: string
}
