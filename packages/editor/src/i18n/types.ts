import type { en } from './en'

/** Locale identifier selected by the host application (for example, `en` or `ru`). */
export type EditorLocale = string

/** Named primitive values used to format parameterized catalog messages. */
export type EditorMessageValues = Readonly<Record<string, string | number>>

export type EditorPluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/** Locale-aware message variants selected with `Intl.PluralRules`. */
export type EditorPluralMessage = Readonly<Record<EditorPluralCategory, string>>

/** A message group nested within an editor catalog. */
export interface EditorTranslationNamespace {
  readonly [key: string]: EditorMessageValue
}

/** A canonical editor message is a string, plural branch, or nested group. */
export type EditorMessageValue = string | EditorPluralMessage | EditorTranslationNamespace

type EditorMessageTreeFromCatalog<Value> = Value extends string
  ? string
  : Value extends EditorPluralMessage
    ? EditorPluralMessage
    : Value extends object
      ? { readonly [Key in keyof Value]: EditorMessageTreeFromCatalog<Value[Key]> }
      : never

/** Complete message-tree shape derived from the English catalog. */
export type EditorMessageTree = EditorMessageTreeFromCatalog<typeof en>

type EditorMessageOverrideValue<Value> = Value extends string
  ? string
  : Value extends EditorPluralMessage
    ? Partial<EditorPluralMessage>
    : Value extends object
      ? EditorMessageOverrides<Value>
      : never

/** Recursively partial host-supplied overrides for a canonical message tree. */
export type EditorMessageOverrides<Tree extends object = EditorMessageTree> = {
  readonly [Key in keyof Tree]?: EditorMessageOverrideValue<Tree[Key]>
}

/** Host-supplied locale dictionaries keyed by locale identifier. */
export type EditorMessageCatalog = Readonly<Record<EditorLocale, EditorMessageOverrides>>

type EditorMessageKeyFromCatalog<Tree, Prefix extends string = ''> = {
  [Key in keyof Tree & string]: Tree[Key] extends string
    ? `${Prefix}${Key}`
    : Tree[Key] extends EditorPluralMessage
      ? never
      : Tree[Key] extends object
        ? EditorMessageKeyFromCatalog<Tree[Key], `${Prefix}${Key}.`>
        : never
}[keyof Tree & string]

type EditorPluralMessageKeyFromCatalog<Tree, Prefix extends string = ''> = {
  [Key in keyof Tree & string]: Tree[Key] extends EditorPluralMessage
    ? `${Prefix}${Key}`
    : Tree[Key] extends object
      ? EditorPluralMessageKeyFromCatalog<Tree[Key], `${Prefix}${Key}.`>
      : never
}[keyof Tree & string]

/** Dot-separated string leaves from the canonical English catalog. */
export type EditorMessageKey = EditorMessageKeyFromCatalog<typeof en>

/** Dot-separated plural leaves from the canonical English catalog. */
export type EditorPluralMessageKey = EditorPluralMessageKeyFromCatalog<typeof en>
