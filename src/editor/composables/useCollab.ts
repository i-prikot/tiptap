/**
 * Контекст коллаборации. Vue-эквивалент CollabProvider/useCollab
 * из чанка 34p294mqk5mqb (модуль 466700).
 *
 * Отличие от оригинала: оригинал всегда требует Tiptap Cloud
 * (жёстко зашитые appId + серверный /api/collaboration). Порт включает
 * коллаборацию только если заданы VITE_TIPTAP_COLLAB_APP_ID и
 * VITE_TIPTAP_COLLAB_TOKEN_URL (или VITE_TIPTAP_COLLAB_TOKEN);
 * иначе hasCollab=false и редактор работает локально с обычной историей.
 * Параметр URL ?noCollab=1 отключает коллаборацию, как в оригинале.
 */
import { onBeforeUnmount, provide, inject, shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'
import * as Y from 'yjs'
import { TiptapCollabProvider } from '@hocuspocus/provider'

export const TIPTAP_COLLAB_APP_ID = import.meta.env.VITE_TIPTAP_COLLAB_APP_ID || ''
export const TIPTAP_COLLAB_DOC_PREFIX = import.meta.env.VITE_TIPTAP_COLLAB_DOC_PREFIX || ''
const COLLAB_TOKEN_URL = import.meta.env.VITE_TIPTAP_COLLAB_TOKEN_URL || '/api/collaboration'
const STATIC_COLLAB_TOKEN = import.meta.env.VITE_TIPTAP_COLLAB_TOKEN || ''

export function getUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

/** Получает JWT коллаборации с бэкенда (оригинал: POST /api/collaboration). */
export async function fetchCollabToken(): Promise<string | null> {
  if (STATIC_COLLAB_TOKEN) return STATIC_COLLAB_TOKEN
  try {
    const response = await fetch(COLLAB_TOKEN_URL, {
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

export function provideCollab(room: string): CollabContext {
  const collabConfigured = !!TIPTAP_COLLAB_APP_ID
  const noCollabParam = parseInt(getUrlParam('noCollab') || '0') === 1

  const hasCollab = shallowRef(collabConfigured && !noCollabParam)
  const provider = shallowRef<TiptapCollabProvider | null>(null)
  const setupError = shallowRef(false)
  const ydoc = new Y.Doc()

  if (hasCollab.value) {
    fetchCollabToken().then(token => {
      if (!token) {
        setupError.value = true
        return
      }
      const documentName = room ? `${TIPTAP_COLLAB_DOC_PREFIX}${room}` : TIPTAP_COLLAB_DOC_PREFIX
      provider.value = new TiptapCollabProvider({
        name: documentName,
        appId: TIPTAP_COLLAB_APP_ID,
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
