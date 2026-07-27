import type { NodeViewRenderer } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'

export type MathematicsNodeType = 'inlineMath' | 'blockMath'

export type MathematicsKatexOptions = object

export interface MathematicsNodeViewOptions {
  type: MathematicsNodeType
  katexOptions?: MathematicsKatexOptions
  onClick?: (node: PMNode, pos: number) => void
}

export type MathematicsNodeViewRenderer = (options: MathematicsNodeViewOptions) => NodeViewRenderer

export interface MathematicsNodeOptions {
  katexOptions?: MathematicsKatexOptions
  onClick?: (node: PMNode, pos: number) => void
  nodeView?: MathematicsNodeViewRenderer
}

export interface MathematicsOptions {
  inlineOptions?: MathematicsNodeOptions
  blockOptions?: MathematicsNodeOptions
  katexOptions?: MathematicsKatexOptions
}
