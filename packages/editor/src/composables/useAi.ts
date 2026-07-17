/**
 * Контекст Tiptap AI. Vue-эквивалент AiProvider/useAi из чанка 3n0bpgvtdirdv.
 *
 * Отличие от оригинала: расширение Ai распространяется только через
 * платный registry Tiptap Pro и не может быть включено в порт. Контекст
 * повторяет исходный интерфейс (aiToken/hasAi/setupError): при заданных
 * tokenUrl/token токен запрашивается как в оригинале, иначе hasAi=false —
 * и все AI-элементы UI скрываются той же
 * логикой isExtensionAvailable(editor, 'ai'), что и в оригинале.
 */
import { inject, provide, shallowRef, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter, ShallowRef } from 'vue'
import type { AiOptions } from '../components/notion/public-api'

/** Получает JWT для AI с бэкенда (оригинал: POST /api/ai). */
export async function fetchAiToken(config: AiOptions): Promise<string | null> {
  if (config.token) return config.token
  try {
    const response = await fetch(config.tokenUrl || '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Failed to fetch token: ${response.status}`)
    return (await response.json()).token
  } catch {
    console.error('[useAi] AI token retrieval failed')
    return null
  }
}

export interface AiContext {
  hasAi: ShallowRef<boolean>
  aiToken: ShallowRef<string | null>
  setupError: ShallowRef<boolean>
}

const aiInjectionKey: InjectionKey<AiContext> = Symbol('ai')

export function provideAi(
  config?: AiOptions,
  enabled: MaybeRefOrGetter<boolean> = false,
): AiContext {
  const hasAi = shallowRef(false)
  const aiToken = shallowRef<string | null>(null)
  const setupError = shallowRef(false)
  let tokenRequestVersion = 0

  watch(
    () => toValue(enabled),
    (aiEnabled) => {
      tokenRequestVersion += 1
      const aiConfigured = aiEnabled && !!config?.appId

      hasAi.value = aiConfigured
      aiToken.value = null
      setupError.value = false

      if (!aiConfigured || !config) return

      const requestVersion = tokenRequestVersion
      fetchAiToken(config).then((token) => {
        if (requestVersion !== tokenRequestVersion) return

        aiToken.value = token
        setupError.value = !token
      })
    },
    { immediate: true },
  )

  const context: AiContext = { hasAi, aiToken, setupError }
  provide(aiInjectionKey, context)
  return context
}

export function useAi(): AiContext {
  const context = inject(aiInjectionKey)
  if (!context) throw new Error('useAi must be used within provideAi()')
  return context
}
