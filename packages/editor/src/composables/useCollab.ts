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
import { HocuspocusProvider } from '@hocuspocus/provider'
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
  provider: ShallowRef<HocuspocusProvider | null>
  ydoc: Y.Doc
}

const logger = createLogger('useCollab')

const collabInjectionKey: InjectionKey<CollabContext> = Symbol('collab')
const validAppId = /^[a-z0-9][a-z0-9-]*$/i

function getCollabUrl(appId: unknown): string | null {
  if (typeof appId !== 'string' || !validAppId.test(appId)) return null
  return `wss://${appId}.collab.tiptap.cloud`
}

export function provideCollab(documentId: string, config?: CollaborationOptions): CollabContext {
  const collabUrl = getCollabUrl(config?.appId)
  const collabConfigured = collabUrl !== null
  const hasCollab = shallowRef(collabConfigured)
  const provider = shallowRef<HocuspocusProvider | null>(null)
  const ydoc = new Y.Doc()
  let isDisposed = false

  if (config && collabUrl) {
    logger.debug('provider setup', { service: 'collaboration', result: 'started' })
    void fetchCollabToken(config)
      .then((token) => {
        if (isDisposed) {
          hasCollab.value = false
          logger.debug('provider setup', { service: 'collaboration', result: 'skipped-after-dispose' })
          return
        }
        if (!token) {
          hasCollab.value = false
          return
        }

        try {
          const documentNamePrefix = config.documentNamePrefix || ''
          provider.value = new HocuspocusProvider({
            name: `${documentNamePrefix}${documentId}`,
            url: collabUrl,
            token,
            document: ydoc,
          })
          logger.debug('provider setup', { service: 'collaboration', result: 'completed' })
        } catch (error) {
          hasCollab.value = false
          logger.error('provider setup failed', {
            service: 'collaboration',
            stage: 'provider-construction',
            failureType: error instanceof Error ? error.name : 'unknown',
          })
        }
      })
      .catch((error: unknown) => {
        // No provider exists on this path, and changing this detached ref is safe.
        hasCollab.value = false
        logger.error('provider setup failed', {
          service: 'collaboration',
          stage: 'token-retrieval',
          failureType: error instanceof Error ? error.name : 'unknown',
        })
      })
  }

  onBeforeUnmount(() => {
    isDisposed = true
    const activeProvider = provider.value
    provider.value = null
    if (!activeProvider) return
    activeProvider.destroy()
    logger.debug('provider setup', { service: 'collaboration', result: 'destroyed' })
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
