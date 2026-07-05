import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableHandleExtension: {
      freezeHandles: () => ReturnType
      unfreezeHandles: () => ReturnType
    }
  }
}
