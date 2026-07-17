import type { Editor } from '@tiptap/core'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { defaultContent } from '../content/default-content'

export function useDemoDocumentSeed(documentId: MaybeRefOrGetter<string>) {
  let boundEditor: Editor | null = null
  let interactionUpdateListener: (() => void) | undefined

  const cleanupDemoDocumentSeed = () => {
    if (boundEditor && interactionUpdateListener) {
      boundEditor.off('update', interactionUpdateListener)
    }

    boundEditor = null
    interactionUpdateListener = undefined
  }

  const initializeDemoDocumentSeed = (editor: Editor) => {
    cleanupDemoDocumentSeed()

    const storageKey = `hasInteracted-${toValue(documentId)}`
    let hasInteracted = window.localStorage.getItem(storageKey) === 'true'

    if (editor.isEmpty && !hasInteracted) {
      editor.chain().setMeta('addToHistory', false).setContent(defaultContent).run()
      editor.chain().focus('start', { scrollIntoView: true }).run()
    }

    interactionUpdateListener = () => {
      if (!editor.isEmpty && !hasInteracted) {
        window.localStorage.setItem(storageKey, 'true')
        hasInteracted = true
      }
    }
    boundEditor = editor
    editor.on('update', interactionUpdateListener)

    return cleanupDemoDocumentSeed
  }

  return { initializeDemoDocumentSeed, cleanupDemoDocumentSeed }
}
