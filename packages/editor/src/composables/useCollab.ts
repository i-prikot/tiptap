/**
 * Контекст коллаборации.
 *
 * Коллаборация включается, только если хост передал appId и tokenUrl (или token);
 * без конфигурации hasCollab=false и редактор работает локально с обычной историей.
 */
import { createLogger } from '@i-prikot/editor-schema'
import { onBeforeUnmount, provide, inject, shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { TiptapCollabProvider } from '@hocuspocus/provider'
import type { CollaborationOptions } from '../components/notion'

/** Получает JWT коллаборации с бэкенда (оригинал: POST /api/collaboration). */
export async function fetchCollabToken(config: CollaborationOptions): Promise<string | null> {
  if (config.token?.trim()) return config.token

  try {
    const response = await fetch(config.tokenUrl || '/api/collaboration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      logger.error('token fetch failed', {
        service: 'collaboration',
        status: response.status,
      })
      return null
    }

    const payload: unknown = await response.json()
    const token =
      typeof payload === 'object' && payload !== null && 'token' in payload
        ? (payload as { token?: unknown }).token
        : null

    if (typeof token === 'string' && token.trim()) return token

    logger.error('token fetch failed', {
      service: 'collaboration',
      status: 'missing-token',
    })
  } catch {
    logger.error('token fetch failed', {
      service: 'collaboration',
      status: 'request-failed',
    })
    return null
  }

  return null
}

export interface CollabContext {
  hasCollab: ShallowRef<boolean>
  provider: ShallowRef<TiptapCollabProvider | null>
  ydoc: Y.Doc
}

const logger = createLogger('useCollab')

const collabInjectionKey: InjectionKey<CollabContext> = Symbol('collab')

export function provideCollab(documentId: string, config?: CollaborationOptions): CollabContext {
  const collabConfigured = !!config?.appId
  const hasCollab = shallowRef(collabConfigured)
  const provider = shallowRef<TiptapCollabProvider | null>(null)
  const ydoc = new Y.Doc()

  if (config && hasCollab.value) {
    fetchCollabToken(config).then((token) => {
      if (!token) {
        hasCollab.value = false
        return
      }
      const documentNamePrefix = config.documentNamePrefix || ''
      const documentName = `${documentNamePrefix}${documentId}`
      provider.value = new TiptapCollabProvider({
        name: documentName,
        appId: config.appId,
        token,
        document: ydoc,
      })
    })
  }

  onBeforeUnmount(() => {
    provider.value?.destroy()
  })

  const context: CollabContext = { hasCollab, provider, ydoc }
  provide(collabInjectionKey, context)
  return context
}

export function useCollab(): CollabContext {
  const context = inject(collabInjectionKey)
  if (!context) throw new Error('useCollab must be used within provideCollab()')
  return context
}
