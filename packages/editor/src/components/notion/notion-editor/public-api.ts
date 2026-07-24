import type { Editor, JSONContent } from '@tiptap/core'
import { en, ru } from '../../../i18n'
import type { EditorLocale, EditorMessageCatalog, EditorMessageTree } from '../../../i18n/types'
import type { ImageUploadAdapter } from '../../../types/image-upload'

export type { ImageUploadAdapter, ImageUploadCallbacks } from '../../../types/image-upload'

export type {
  EditorLocale,
  EditorMessageCatalog,
  EditorMessageOverrides,
  EditorMessageTree,
  EditorMessageValue,
} from '../../../i18n/types'

/** Default locale used when the host does not provide `NotionEditorProps.locale`. */
export const defaultEditorLocale = 'ru'

/**
 * Canonical Russian editor messages used for per-key package fallback.
 *
 * Hosts can select the complete built-in English catalog with `locale="en"`
 * or overlay either built-in catalog with a recursively partial dictionary.
 */
export const defaultEditorMessages: EditorMessageTree = ru

/** Complete built-in catalogs available without a host-supplied dictionary. */
export const defaultEditorMessageCatalog: Readonly<Record<'en' | 'ru', EditorMessageTree>> = {
  en,
  ru,
}

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
import type { IdentityStorage } from '../../../utils/storage'

export type { IdentityStorage } from '../../../utils/storage'

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
  /**
   * Active host-selected locale. Defaults to `ru`; missing selected-locale
   * keys fall back to the package's Russian defaults.
   *
   * Changes are reactive and update editor-scoped text resolution without
   * recreating the editor. This API does not require Vue I18n or any other
   * host localization plugin.
   */
  locale?: EditorLocale
  /**
   * Host-supplied locale overrides shaped like the package-owned canonical
   * English-derived message shape. Changes are reactive and missing keys fall back to
   * Russian per key without recreating the editor.
   *
   * Development diagnostics never log message values, host content, or whole
   * dictionaries; they only report redacted resolver events.
   */
  messages?: EditorMessageCatalog
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

/** Identifiers for async editor operations that can produce structured errors. */
export type NotionEditorOperation = 'image-upload' | 'image-download'

/** Discriminated error code surfaced when an editor operation fails. */
export type NotionEditorOperationErrorCode = 'IMAGE_UPLOAD_FAILED' | 'IMAGE_DOWNLOAD_FAILED'

/** Runtime class of the underlying error cause. */
export type NotionEditorOperationErrorClass = 'DOMException' | 'Error' | 'UnknownError'

/** Payload emitted when a structured editor operation error is reported. */
export interface NotionEditorOperationErrorPayload {
  operation: NotionEditorOperation
  errorClass: NotionEditorOperationErrorClass
  code: NotionEditorOperationErrorCode
}
