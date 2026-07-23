import type { Editor, JSONContent } from '@tiptap/core'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

type DemoDocumentSeedInitialization = {
  editor: Editor
  hasInteracted: boolean
  interactionUpdateListener: () => void
  isActive: boolean
  isApplyingSeed: boolean
}

let defaultContentPromise: Promise<JSONContent> | undefined

function loadDefaultContent() {
  defaultContentPromise ??= import('../content/default-content').then(
    ({ defaultContent }) => defaultContent,
  )

  return defaultContentPromise
}

export function useDemoDocumentSeed(documentId: MaybeRefOrGetter<string>) {
  let activeInitialization: DemoDocumentSeedInitialization | null = null

  const cleanupInitialization = (initialization: DemoDocumentSeedInitialization) => {
    if (!initialization.isActive) return

    initialization.isActive = false
    initialization.editor.off('update', initialization.interactionUpdateListener)

    if (activeInitialization === initialization) activeInitialization = null
  }

  const cleanupDemoDocumentSeed = () => {
    if (activeInitialization) cleanupInitialization(activeInitialization)
  }

  const initializeDemoDocumentSeed = async (editor: Editor) => {
    cleanupDemoDocumentSeed()

    const storageKey = `hasInteracted-${toValue(documentId)}`
    const hasInteracted = window.localStorage.getItem(storageKey) === 'true'
    const initialization: DemoDocumentSeedInitialization = {
      editor,
      hasInteracted,
      interactionUpdateListener: () => {},
      isActive: true,
      isApplyingSeed: false,
    }

    initialization.interactionUpdateListener = () => {
      if (!initialization.isApplyingSeed && !editor.isEmpty && !initialization.hasInteracted) {
        window.localStorage.setItem(storageKey, 'true')
        initialization.hasInteracted = true
      }
    }

    activeInitialization = initialization
    editor.on('update', initialization.interactionUpdateListener)

    if (!editor.isEmpty || initialization.hasInteracted) {
      return () => cleanupInitialization(initialization)
    }

    try {
      const defaultContent = await loadDefaultContent()

      if (
        activeInitialization !== initialization ||
        !initialization.isActive ||
        !editor.isEmpty ||
        initialization.hasInteracted ||
        window.localStorage.getItem(storageKey) === 'true'
      ) {
        return () => cleanupInitialization(initialization)
      }

      initialization.isApplyingSeed = true
      try {
        editor.chain().setMeta('addToHistory', false).setContent(defaultContent).run()
      } finally {
        initialization.isApplyingSeed = false
      }

      if (activeInitialization === initialization && initialization.isActive) {
        editor.chain().focus('start', { scrollIntoView: true }).run()
      }
    } catch (error) {
      cleanupInitialization(initialization)
      throw error
    }

    return () => cleanupInitialization(initialization)
  }

  return { initializeDemoDocumentSeed, cleanupDemoDocumentSeed }
}
