import { inject, provide } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { NotionEditorAnchorId } from '../components/notion/public-api'

export interface AnchorNavigationContext {
  baseUrl: ComputedRef<string>
  currentAnchor: ComputedRef<NotionEditorAnchorId | undefined>
  requestAnchorChange: (anchor: NotionEditorAnchorId) => void
  consumeRequestedAnchorChange: (anchor: NotionEditorAnchorId) => boolean
}

const anchorNavigationInjectionKey: InjectionKey<AnchorNavigationContext> =
  Symbol('anchor-navigation')

export function provideAnchorNavigation(
  baseUrl: ComputedRef<string>,
  currentAnchor: ComputedRef<NotionEditorAnchorId | undefined>,
  requestAnchorChange: AnchorNavigationContext['requestAnchorChange'],
): AnchorNavigationContext {
  let requestedAnchor: NotionEditorAnchorId | undefined
  let requestedAnchorVersion = 0

  const context: AnchorNavigationContext = {
    baseUrl,
    currentAnchor,
    requestAnchorChange: (anchor) => {
      requestedAnchor = anchor
      const requestVersion = ++requestedAnchorVersion
      requestAnchorChange(anchor)
      queueMicrotask(() => {
        if (requestedAnchorVersion === requestVersion) requestedAnchor = undefined
      })
    },
    consumeRequestedAnchorChange: (anchor) => {
      if (requestedAnchor !== anchor) return false
      requestedAnchor = undefined
      return true
    },
  }

  provide(anchorNavigationInjectionKey, context)
  return context
}

export function useAnchorNavigation(): AnchorNavigationContext {
  const context = inject(anchorNavigationInjectionKey)
  if (!context) throw new Error('useAnchorNavigation must be used inside provideAnchorNavigation()')
  return context
}
