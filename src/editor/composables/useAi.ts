/**
 * Контекст Tiptap AI. Vue-эквивалент AiProvider/useAi из чанка 3n0bpgvtdirdv.
 *
 * Отличие от оригинала: расширение Ai распространяется только через
 * платный registry Tiptap Pro и не может быть включено в порт. Контекст
 * повторяет исходный интерфейс (aiToken/hasAi/setupError): при заданных
 * VITE_TIPTAP_AI_TOKEN_URL/VITE_TIPTAP_AI_TOKEN токен запрашивается как в
 * оригинале, иначе hasAi=false — и все AI-элементы UI скрываются той же
 * логикой isExtensionAvailable(editor, 'ai'), что и в оригинале.
 */
import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'

export const TIPTAP_AI_APP_ID = import.meta.env.VITE_TIPTAP_AI_APP_ID || ''
const AI_TOKEN_URL = import.meta.env.VITE_TIPTAP_AI_TOKEN_URL || '/api/ai'
const STATIC_AI_TOKEN = import.meta.env.VITE_TIPTAP_AI_TOKEN || ''

/** Получает JWT для AI с бэкенда (оригинал: POST /api/ai). */
export async function fetchAiToken(): Promise<string | null> {
  if (STATIC_AI_TOKEN) return STATIC_AI_TOKEN
  try {
    const response = await fetch(AI_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Failed to fetch token: ${response.status}`)
    return (await response.json()).token
  } catch (error) {
    console.error('Failed to fetch AI token:', error)
    return null
  }
}

export interface AiContext {
  hasAi: ShallowRef<boolean>
  aiToken: ShallowRef<string | null>
  setupError: ShallowRef<boolean>
}

const aiInjectionKey: InjectionKey<AiContext> = Symbol('ai')

export function provideAi(): AiContext {
  const aiConfigured = !!TIPTAP_AI_APP_ID
  const hasAi = shallowRef(aiConfigured)
  const aiToken = shallowRef<string | null>(null)
  const setupError = shallowRef(false)

  if (aiConfigured) {
    fetchAiToken().then((token) => {
      aiToken.value = token
      if (!token) setupError.value = true
    })
  }

  const context: AiContext = { hasAi, aiToken, setupError }
  provide(aiInjectionKey, context)
  return context
}

export function useAi(): AiContext {
  const context = inject(aiInjectionKey)
  if (!context) throw new Error('useAi must be used within provideAi()')
  return context
}
