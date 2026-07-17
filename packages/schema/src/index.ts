import './types/tiptap-augmentations'

export type { JSONContent } from '@tiptap/core'

export {
  createExtensionKit,
  type ExtensionKitFeatureFlags,
  type ExtensionKitNodeOverrides,
  type ExtensionKitOptions,
  type ExtensionKitPlaceholder,
} from './extensions/extension-kit'
export { HorizontalRule } from './extensions/horizontal-rule'
export { Indent } from './extensions/indent'
export { ListNormalization } from './extensions/list-normalization'
export { NodeAlignment } from './extensions/node-alignment'
export { NodeBackground } from './extensions/node-background'
export { TableHandleExtension } from './extensions/table-handle'
export { colDragStart, dragEnd, rowDragStart } from './extensions/table-handle/drag-and-drop'
export * from './extensions/table-handle/types'
export { TableKit } from './extensions/table-kit'
export { TripleClickBlockSelection } from './extensions/triple-click-block-selection'
export { UiState, defaultUiState, type UiEditorState } from './extensions/ui-state'
export { Image } from './nodes/image/image'
export { ImageUploadNode, type ImageUploadNodeOptions } from './nodes/image-upload/image-upload'
export { TocNode, type TocNodeAttributes, type TocNodeOptions } from './nodes/toc/toc'
export * from './types/image-upload'
export * from './types/toc'
export * from './types/user'
export * from './utils/table-utils'
export * from './utils/tiptap-utils'
export { clamp } from './utils/tiptap-utils'
