import { computed, inject, provide, toValue, watch } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import {
  defaultEditorLocale,
  defaultEditorMessageCatalog,
  defaultEditorMessages,
  type EditorLocale,
  type EditorMessageCatalog,
  type EditorMessageOverrides,
  type EditorMessageTree,
} from '../components/notion/notion-editor/public-api'
import type {
  EditorMessageKey,
  EditorMessageValues,
  EditorPluralCategory,
  EditorPluralMessage,
  EditorPluralMessageKey,
  EditorTranslationNamespace,
} from '../i18n/types'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

/** Dot-separated canonical message path resolved by the editor-scoped i18n provider. */
export type { EditorMessageKey } from '../i18n/types'

export interface EditorI18nContext {
  locale: ComputedRef<EditorLocale>
  messages: ComputedRef<EditorMessageTree>
  t: (key: EditorMessageKey, values?: EditorMessageValues) => string
  tPlural: (key: EditorPluralMessageKey, count: number, values?: EditorMessageValues) => string
}

const editorI18nInjectionKey: InjectionKey<EditorI18nContext> = Symbol('editor-i18n')

type MessageTree = EditorMessageTree | EditorTranslationNamespace

function isMessageTree(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPluralMessage(value: unknown): value is EditorPluralMessage {
  return (
    isMessageTree(value) &&
    'other' in value &&
    Object.values(value).every((entry) => typeof entry === 'string')
  )
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

    if (isPluralMessage(defaultValue)) {
      merged[key] = {
        ...defaultValue,
        ...(isMessageTree(override) ? (override as Partial<EditorPluralMessage>) : {}),
      } as Tree[keyof Tree]
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

function getPluralMessageValue(
  messages: EditorMessageTree | EditorMessageOverrides | undefined,
  key: EditorPluralMessageKey,
): EditorPluralMessage | undefined {
  let current: unknown = messages

  for (const segment of key.split('.')) {
    if (!isMessageTree(current)) return undefined
    current = current[segment]
  }

  return isPluralMessage(current) ? current : undefined
}

function formatMessage(message: string, values?: EditorMessageValues): string {
  if (!values) return message

  return message.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) return placeholder
    return String(values[name])
  })
}

function createPluralRules(locale: EditorLocale): Intl.PluralRules {
  try {
    return new Intl.PluralRules(locale)
  } catch {
    return new Intl.PluralRules(defaultEditorLocale)
  }
}

function formatPluralMessage(
  message: EditorPluralMessage | undefined,
  locale: EditorLocale,
  count: number,
  values?: EditorMessageValues,
): string {
  if (!message) return ''

  const category = createPluralRules(locale).select(count)
  const resolvedMessage =
    message[category as EditorPluralCategory] ??
    message.other ??
    message.one ??
    Object.values(message)[0]

  return formatMessage(resolvedMessage ?? '', { ...values, count })
}

const defaultEditorI18nContext: EditorI18nContext = {
  locale: computed(() => defaultEditorLocale),
  messages: computed(() => defaultEditorMessages),
  t: (key, values) => formatMessage(getMessageValue(defaultEditorMessages, key) ?? '', values),
  tPlural: (key, count, values) =>
    formatPluralMessage(
      getPluralMessageValue(defaultEditorMessages, key),
      defaultEditorLocale,
      count,
      values,
    ),
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
  const selectedBuiltInMessages = computed(
    () =>
      defaultEditorMessageCatalog[activeLocale.value as keyof typeof defaultEditorMessageCatalog],
  )
  const resolvedMessages = computed(() =>
    mergeMessageTrees(
      selectedBuiltInMessages.value ?? defaultEditorMessages,
      toValue(messages)?.[activeLocale.value],
    ),
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
    t: (key, values) => {
      const selectedMessages = toValue(messages)?.[activeLocale.value]
      const selectedValue = getMessageValue(selectedMessages, key)
      const resolvedValue = getMessageValue(resolvedMessages.value, key)

      if (resolvedValue === undefined) {
        diagnostics.debug('missing-default-message', {})
        return ''
      }

      if (selectedBuiltInMessages.value === undefined && selectedValue === undefined) {
        const fallbackId = `${activeLocale.value}:${key}`
        if (!reportedFallbacks.has(fallbackId)) {
          reportedFallbacks.add(fallbackId)
          diagnostics.debug('fallback-to-default', { locale: activeLocale.value })
        }
      }

      return formatMessage(resolvedValue, values)
    },
    tPlural: (key, count, values) =>
      formatPluralMessage(
        getPluralMessageValue(resolvedMessages.value, key),
        activeLocale.value,
        count,
        values,
      ),
  }

  provide(editorI18nInjectionKey, context)
  return context
}

export function useEditorI18n(): EditorI18nContext {
  return inject(editorI18nInjectionKey, defaultEditorI18nContext)
}
