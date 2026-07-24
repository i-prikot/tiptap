import './types/tiptap-augmentations.js'

export type { JSONContent } from '@tiptap/core'

export {
  CURRENT_SCHEMA_VERSION,
  createPersistedDocument,
  migrate,
  type PersistedDocument,
} from './migrations/index.js'

export {
  createExtensionKit,
  type ExtensionKitFeatureFlags,
  type ExtensionKitNodeOverrides,
  type ExtensionKitOptions,
  type ExtensionKitPlaceholder,
} from './extensions/extension-kit.js'
export { HorizontalRule } from './extensions/horizontal-rule.js'
export { Indent } from './extensions/indent.js'
export { ListNormalization } from './extensions/list-normalization.js'
export {
  BlockMath,
  InlineMath,
  Mathematics,
  type MathematicsKatexOptions,
  type MathematicsNodeOptions,
  type MathematicsNodeType,
  type MathematicsNodeViewOptions,
  type MathematicsNodeViewRenderer,
  type MathematicsOptions,
} from './extensions/mathematics.js'
export { NodeAlignment } from './extensions/node-alignment.js'
export { NodeBackground } from './extensions/node-background.js'
export { TableHandleExtension } from './extensions/table-handle.js'
export { colDragStart, dragEnd, rowDragStart } from './extensions/table-handle/drag-and-drop.js'
export * from './extensions/table-handle/types.js'
export { TableKit } from './extensions/table-kit.js'
export { TripleClickBlockSelection } from './extensions/triple-click-block-selection.js'
export {
  UiState,
  defaultUiState,
  type UiEditorState,
  type UiStateUpdate,
} from './extensions/ui-state.js'
export { Image } from './nodes/image/image.js'
export { ImageUploadNode, type ImageUploadNodeOptions } from './nodes/image-upload/image-upload.js'
export { TocNode, type TocNodeAttributes, type TocNodeOptions } from './nodes/toc/toc.js'
export * from './types/image-upload.js'
export * from './types/toc.js'
export * from './types/user.js'
export { createLogger, type Logger, type LoggerOptions, type LogLevel } from './utils/logger.js'
export * from './utils/table-utils.js'
export { throttle, type ThrottledFunction } from './utils/throttle.js'
export * from './utils/tiptap-utils.js'
export { clamp } from './utils/tiptap-utils.js'
