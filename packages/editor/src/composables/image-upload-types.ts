import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { ImageUploadNodeOptions } from '@i-prikot/editor-schema'
import type { ComputedRef } from 'vue'
import type { EditorMessageKey, EditorMessageValues } from '../i18n/types'

export type ImageUploadErrorMessageKey = Extract<EditorMessageKey, `errors.imageUpload${string}`>

export interface ImageUploadErrorMetadata {
  key: ImageUploadErrorMessageKey
  values?: EditorMessageValues
}

export interface ImageUploadFileItem {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  url?: string
  abortController?: AbortController
  error?: ImageUploadErrorMetadata
}

export interface UseImageUploadInput {
  editor: Editor
  getPos: () => number | undefined
  node: ComputedRef<ProseMirrorNode>
  options: ComputedRef<ImageUploadNodeOptions>
}
