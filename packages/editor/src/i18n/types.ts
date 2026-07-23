import type { en } from './en'

/** Locale identifier selected by the host application (for example, `en` or `ru`). */
export type EditorLocale = string

/** A message group whose keys can be populated as editor copy is migrated. */
export interface EditorTranslationNamespace {
  readonly [key: string]: EditorMessageValue
}

/** A canonical editor message is either a leaf string or a nested message group. */
export type EditorMessageValue = string | EditorTranslationNamespace

export interface EditorTranslationCommonMessages extends EditorTranslationNamespace {}

export interface EditorTranslationEditorMessages extends EditorTranslationNamespace {
  readonly placeholder: string
}

export interface EditorTranslationToolbarMessages extends EditorTranslationNamespace {}

export interface EditorTranslationMenusMessages extends EditorTranslationNamespace {}

export interface EditorTranslationFormattingMessages extends EditorTranslationNamespace {}

export interface EditorTranslationColorsMessages extends EditorTranslationNamespace {}

export interface EditorTranslationLinksMessages extends EditorTranslationNamespace {}

export interface EditorTranslationTableMessages extends EditorTranslationNamespace {}

export interface EditorTranslationImageMessages extends EditorTranslationNamespace {}

export interface EditorTranslationTocMessages extends EditorTranslationNamespace {}

export interface EditorTranslationErrorsMessages extends EditorTranslationNamespace {}

/**
 * Canonical message-tree shape owned by the editor package.
 *
 * Each namespace remains extensible while audited editor copy is migrated into
 * the catalog incrementally.
 */
export interface EditorTranslationMessages {
  readonly common: EditorTranslationCommonMessages
  readonly editor: EditorTranslationEditorMessages
  readonly toolbar: EditorTranslationToolbarMessages
  readonly menus: EditorTranslationMenusMessages
  readonly formatting: EditorTranslationFormattingMessages
  readonly colors: EditorTranslationColorsMessages
  readonly links: EditorTranslationLinksMessages
  readonly table: EditorTranslationTableMessages
  readonly image: EditorTranslationImageMessages
  readonly toc: EditorTranslationTocMessages
  readonly errors: EditorTranslationErrorsMessages
}

type EditorMessageTreeFromCatalog<Value> = Value extends string
  ? string
  : Value extends object
    ? { readonly [Key in keyof Value]: EditorMessageTreeFromCatalog<Value[Key]> }
    : never

/** Established public name for the canonical message tree. */
export type EditorMessageTree = EditorMessageTreeFromCatalog<typeof en>

type EditorMessageOverrideValue<Value> = Value extends string
  ? string
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
    : Tree[Key] extends object
      ? EditorMessageKeyFromCatalog<Tree[Key], `${Prefix}${Key}.`>
      : never
}[keyof Tree & string]

/** Dot-separated string leaves from the canonical English catalog. */
export type EditorMessageKey = EditorMessageKeyFromCatalog<typeof en>
