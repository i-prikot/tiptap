/**
 * Контекст Tiptap AI.
 *
 * Ограничение: расширение Ai распространяется только через
 * платный registry Tiptap Pro и не может быть включено в пакет. Контекст
 * предоставляет aiToken и hasAi: при заданных
 * tokenUrl/token запрашивается токен, иначе hasAi=false —
 * и все AI-элементы UI скрываются
 * логикой isExtensionAvailable(editor, 'ai'), что и в оригинале.
 */
import { createLogger } from '@i-prikot/editor-schema'
import { inject, provide, shallowRef, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter, ShallowRef } from 'vue'
import type { AiOptions } from '../components/notion'

/** Получает JWT для AI с бэкенда (оригинал: POST /api/ai). */
export async function fetchAiToken(config: AiOptions): Promise<string | null> {
  if (config.token?.trim()) return config.token

  try {
    const response = await fetch(config.tokenUrl || '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      logger.error('token fetch failed', {
        service: 'ai',
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
      service: 'ai',
      status: 'missing-token',
    })
  } catch {
    logger.error('token fetch failed', {
      service: 'ai',
      status: 'request-failed',
    })
    return null
  }

  return null
}

export interface AiContext {
  hasAi: ShallowRef<boolean>
  aiToken: ShallowRef<string | null>
}

const logger = createLogger('useAi')

const aiInjectionKey: InjectionKey<AiContext> = Symbol('ai')

export function provideAi(
  config?: AiOptions,
  enabled: MaybeRefOrGetter<boolean> = false,
): AiContext {
  const hasAi = shallowRef(false)
  const aiToken = shallowRef<string | null>(null)
  let tokenRequestVersion = 0

  watch(
    () => toValue(enabled),
    (aiEnabled) => {
      tokenRequestVersion += 1
      const aiConfigured = aiEnabled && !!config?.appId

      hasAi.value = aiConfigured
      aiToken.value = null

      if (!aiConfigured || !config) return

      const requestVersion = tokenRequestVersion
      fetchAiToken(config).then((token) => {
        if (requestVersion !== tokenRequestVersion) return

        aiToken.value = token
        if (!token) hasAi.value = false
      })
    },
    { immediate: true },
  )

  const context: AiContext = { hasAi, aiToken }
  provide(aiInjectionKey, context)
  return context
}

export function useAi(): AiContext {
  const context = inject(aiInjectionKey)
  if (!context) throw new Error('useAi must be used within provideAi()')
  return context
}
