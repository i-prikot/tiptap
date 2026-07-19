import type { Editor, JSONContent } from '@tiptap/core'
import type { ImageUploadAdapter } from '../../types/image-upload'

export type { ImageUploadAdapter, ImageUploadCallbacks } from '../../types/image-upload'

/** Optional presentation surfaces for the Notion-like editor UI. */
export interface EditorFeatureFlags {
  tocSidebar: boolean
  floatingMenus: boolean
  mobileToolbar: boolean
  tableControls: boolean
  /** Enables AI only when host-supplied AiOptions are also configured. */
  ai: boolean
}

/** Default presentation configuration for reusable editor UI. */
export const defaultEditorFeatureFlags: EditorFeatureFlags = {
  tocSidebar: false,
  floatingMenus: true,
  mobileToolbar: true,
  tableControls: true,
  ai: false,
}

/** Host-supplied Tiptap Cloud collaboration configuration. */
export interface CollaborationOptions {
  appId: string
  tokenUrl?: string
  token?: string
  documentNamePrefix?: string
}

/** Host-supplied Tiptap Cloud AI configuration. */
import type { IdentityStorage } from '../../utils/storage'

export type { IdentityStorage } from '../../utils/storage'

export interface AiOptions {
  appId: string
  tokenUrl?: string
  token?: string
}

/** Editor instance emitted when the provider has completed initialization. */
export type NotionEditorReadyPayload = Editor

/**
 * Payload emitted after a debounced document update.
 *
 * `html` is document-derived, untrusted HTML. Sanitize it before rendering
 * with `v-html` or otherwise treating it as trusted HTML.
 */
export interface NotionEditorUpdatePayload {
  schemaVersion: number
  json: JSONContent
  html: string
}

/** Decoded unique-node identifier supplied by or emitted to the host. */
export type NotionEditorAnchorId = string

/** Public props accepted by the stable Notion editor facade. */
export interface NotionEditorProps {
  /** Stable host-defined identifier for document-scoped editor behavior. */
  documentId: string
  /** Absolute host URL used to resolve relative and copied anchor links. */
  baseUrl: string
  /** Decoded active unique-node identifier controlled by the host. */
  currentAnchor?: NotionEditorAnchorId
  content?: JSONContent
  placeholder?: string
  features?: Partial<EditorFeatureFlags>
  /** Sticky top offset for the optional table-of-contents sidebar, in pixels. */
  tocSidebarStickyTopOffset?: number
  imageUpload?: ImageUploadAdapter
  /**
   * Persistence for collaboration identity. Defaults to namespaced browser
   * localStorage; set to `false` to generate an in-memory identity per mount.
   */
  identityStorage?: IdentityStorage | false
  /** Enables redacted editor lifecycle diagnostics for development. */
  developmentDiagnostics?: boolean
  /** Enables Tiptap Cloud collaboration; omitted configuration keeps the editor local. */
  collaboration?: CollaborationOptions
  /**
   * Configures Tiptap Cloud AI when `features.ai` is explicitly enabled.
   * Configuration alone does not enable AI.
   */
  ai?: AiOptions
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
