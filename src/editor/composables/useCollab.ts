/**
 * Контекст коллаборации. Vue-эквивалент CollabProvider/useCollab
 * из чанка 34p294mqk5mqb (модуль 466700).
 *
 * Отличие от оригинала: оригинал всегда требует Tiptap Cloud
 * (жёстко зашитые appId + серверный /api/collaboration). Порт включает
 * коллаборацию только если хост передал appId и tokenUrl (или token);
 * иначе hasCollab=false и редактор работает локально с обычной историей.
 */
import { onBeforeUnmount, provide, inject, shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { TiptapCollabProvider } from '@hocuspocus/provider'
import type { CollaborationOptions } from '../components/notion/public-api'

/** Получает JWT коллаборации с бэкенда (оригинал: POST /api/collaboration). */
export async function fetchCollabToken(config: CollaborationOptions): Promise<string | null> {
  if (config.token) return config.token
  try {
    const response = await fetch(config.tokenUrl || '/api/collaboration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Failed to fetch token: ${response.status}`)
    return (await response.json()).token
  } catch (error) {
    console.error('Failed to fetch collaboration token:', error)
    return null
  }
}

export interface CollabContext {
  hasCollab: ShallowRef<boolean>
  provider: ShallowRef<TiptapCollabProvider | null>
  ydoc: Y.Doc
  setupError: ShallowRef<boolean>
}

const collabInjectionKey: InjectionKey<CollabContext> = Symbol('collab')

export function provideCollab(documentId: string, config?: CollaborationOptions): CollabContext {
  const collabConfigured = !!config?.appId
  const hasCollab = shallowRef(collabConfigured)
  const provider = shallowRef<TiptapCollabProvider | null>(null)
  const setupError = shallowRef(false)
  const ydoc = new Y.Doc()

  if (config && hasCollab.value) {
    fetchCollabToken(config).then((token) => {
      if (!token) {
        setupError.value = true
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

  const context: CollabContext = { hasCollab, provider, ydoc, setupError }
  provide(collabInjectionKey, context)
  return context
}

export function useCollab(): CollabContext {
  const context = inject(collabInjectionKey)
  if (!context) throw new Error('useCollab must be used within provideCollab()')
  return context
}
