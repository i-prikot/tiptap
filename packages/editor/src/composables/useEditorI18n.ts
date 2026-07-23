import { computed, inject, provide, toValue, watch } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import {
  defaultEditorLocale,
  defaultEditorMessages,
  type EditorLocale,
  type EditorMessageCatalog,
  type EditorMessageOverrides,
  type EditorMessageTree,
} from '../components/notion/notion-editor/public-api'
import type { EditorMessageKey, EditorTranslationNamespace } from '../i18n/types'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

/** Dot-separated canonical message path resolved by the editor-scoped i18n provider. */
export type { EditorMessageKey } from '../i18n/types'

export interface EditorI18nContext {
  locale: ComputedRef<EditorLocale>
  messages: ComputedRef<EditorMessageTree>
  t: (key: EditorMessageKey) => string
}

const editorI18nInjectionKey: InjectionKey<EditorI18nContext> = Symbol('editor-i18n')

type MessageTree = EditorMessageTree | EditorTranslationNamespace

function isMessageTree(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeMessageTrees<Tree extends MessageTree>(
  defaults: Tree,
  overrides?: EditorMessageOverrides<Tree>,
): Tree {
  const merged: Partial<Tree> = {}
  const entries = Object.entries(defaults) as Array<[keyof Tree, Tree[keyof Tree]]>

  for (const [key, defaultValue] of entries) {
    const override = overrides?.[key]

    if (typeof defaultValue === 'string') {
      merged[key] = (typeof override === 'string' ? override : defaultValue) as Tree[keyof Tree]
      continue
    }

    merged[key] = mergeMessageTrees(
      defaultValue as EditorTranslationNamespace,
      isMessageTree(override)
        ? (override as EditorMessageOverrides<EditorTranslationNamespace>)
        : undefined,
    ) as Tree[keyof Tree]
  }

  return merged as Tree
}

function getMessageValue(
  messages: EditorMessageTree | EditorMessageOverrides | undefined,
  key: EditorMessageKey,
): string | undefined {
  let current: unknown = messages

  for (const segment of key.split('.')) {
    if (!isMessageTree(current)) return undefined
    current = current[segment]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Creates an editor-scoped localization resolver without coupling to a host
 * localization plugin. Hosts may derive `messages` from any i18n system.
 */
export function provideEditorI18n(
  locale: MaybeRefOrGetter<EditorLocale | undefined>,
  messages: MaybeRefOrGetter<EditorMessageCatalog | undefined>,
  developmentDiagnostics: MaybeRefOrGetter<boolean | undefined> = false,
): EditorI18nContext {
  const activeLocale = computed(() => toValue(locale) || defaultEditorLocale)
  const resolvedMessages = computed(() =>
    mergeMessageTrees(defaultEditorMessages, toValue(messages)?.[activeLocale.value]),
  )
  const diagnostics = createDevelopmentDiagnostics('EditorI18n', {
    isEnabled: () => toValue(developmentDiagnostics) === true,
  })
  const reportedFallbacks = new Set<string>()

  watch(
    activeLocale,
    (selectedLocale) => {
      reportedFallbacks.clear()
      diagnostics.debug('locale-selected', { locale: selectedLocale })
    },
    { immediate: true },
  )

  const context: EditorI18nContext = {
    locale: activeLocale,
    messages: resolvedMessages,
    t: (key) => {
      const selectedMessages = toValue(messages)?.[activeLocale.value]
      const selectedValue = getMessageValue(selectedMessages, key)
      const resolvedValue = getMessageValue(resolvedMessages.value, key)

      if (resolvedValue === undefined) {
        diagnostics.debug('missing-default-message', {})
        return ''
      }

      if (activeLocale.value !== defaultEditorLocale && selectedValue === undefined) {
        const fallbackId = `${activeLocale.value}:${key}`
        if (!reportedFallbacks.has(fallbackId)) {
          reportedFallbacks.add(fallbackId)
          diagnostics.debug('fallback-to-default', { locale: activeLocale.value })
        }
      }

      return resolvedValue
    },
  }

  provide(editorI18nInjectionKey, context)
  return context
}

export function useEditorI18n(): EditorI18nContext {
  const context = inject(editorI18nInjectionKey)
  if (!context) throw new Error('useEditorI18n must be used inside provideEditorI18n()')
  return context
}
