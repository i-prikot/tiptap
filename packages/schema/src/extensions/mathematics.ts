import { Extension } from '@tiptap/core'
import { createMathematicsNode } from './mathematics-node.js'
import type { MathematicsOptions } from './mathematics-types.js'

export type {
  MathematicsKatexOptions,
  MathematicsNodeOptions,
  MathematicsNodeType,
  MathematicsNodeViewOptions,
  MathematicsNodeViewRenderer,
  MathematicsOptions,
} from './mathematics-types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMath: {
      insertBlockMath: (options: { latex: string; pos?: number }) => ReturnType
      deleteBlockMath: (options?: { pos?: number }) => ReturnType
      updateBlockMath: (options?: { latex: string; pos?: number }) => ReturnType
    }
    inlineMath: {
      insertInlineMath: (options: { latex: string; pos?: number }) => ReturnType
      deleteInlineMath: (options?: { pos?: number }) => ReturnType
      updateInlineMath: (options?: { latex?: string; pos?: number }) => ReturnType
    }
  }
}

export const BlockMath = createMathematicsNode({
  name: 'blockMath',
  group: 'block',
  inline: false,
  element: 'div',
  dataType: 'block-math',
})

export const InlineMath = createMathematicsNode({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  element: 'span',
  dataType: 'inline-math',
})

export const Mathematics = Extension.create<MathematicsOptions>({
  name: 'Mathematics',
  addOptions() {
    return { inlineOptions: undefined, blockOptions: undefined, katexOptions: undefined }
  },
  addExtensions() {
    return [
      BlockMath.configure({
        ...this.options.blockOptions,
        katexOptions: this.options.katexOptions,
      }),
      InlineMath.configure({
        ...this.options.inlineOptions,
        katexOptions: this.options.katexOptions,
      }),
    ]
  },
})

export default Mathematics
