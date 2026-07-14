import type { Editor, JSONContent } from '@tiptap/core'

/** Optional presentation surfaces for the Notion-like editor UI. */
export interface EditorFeatureFlags {
  header: boolean
  tocSidebar: boolean
  floatingMenus: boolean
  mobileToolbar: boolean
  tableControls: boolean
  ctaPopup: boolean
}

/** Default presentation configuration, preserving the existing editor UI. */
export const defaultEditorFeatureFlags: EditorFeatureFlags = {
  header: true,
  tocSidebar: true,
  floatingMenus: true,
  mobileToolbar: true,
  tableControls: true,
  ctaPopup: true,
}

/** Receives image-upload progress and cancellation controls from the editor. */
export type ImageUploadAdapter = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
) => Promise<string>

/** Editor instance emitted when the provider has completed initialization. */
export type NotionEditorReadyPayload = Editor

/**
 * Payload emitted after a debounced document update.
 *
 * `html` is document-derived, untrusted HTML. Sanitize it before rendering
 * with `v-html` or otherwise treating it as trusted HTML.
 */
export interface NotionEditorUpdatePayload {
  json: JSONContent
  html: string
}

/** Public props accepted by the stable Notion editor facade. */
export interface NotionEditorProps {
  room?: string
  content?: JSONContent
  placeholder?: string
  features?: Partial<EditorFeatureFlags>
  imageUpload?: ImageUploadAdapter
}

/** Controls whether imperative content changes notify update listeners. */
export interface NotionEditorSetContentOptions {
  emitUpdate?: boolean
}

/** Methods and state exposed through a ref to the Notion editor component. */
export interface NotionEditorExpose {
  readonly editor: Editor | null
  getJSON(): JSONContent | null
  /**
   * Returns document-derived, untrusted HTML. Sanitize it before rendering
   * with `v-html` or otherwise treating it as trusted HTML.
   */
  getHTML(): string | null
  focus(): boolean
  setContent(content: JSONContent, options?: NotionEditorSetContentOptions): boolean
}

/** Fixed delay used to coalesce document update events. */
export const EDITOR_UPDATE_DEBOUNCE_MS = 300
