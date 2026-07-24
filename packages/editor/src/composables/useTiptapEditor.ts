/**
 * Контекст редактора: provide/inject вместо React EditorContext.
 * Возвращает переданный редактор либо редактор из контекста.
 */
import { computed, inject, provide, shallowRef } from 'vue'
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export type MaybeEditor = Editor | null | undefined
type ProvidedTiptapEditor = Readonly<Ref<MaybeEditor>>

const editorInjectionKey: InjectionKey<ProvidedTiptapEditor> = Symbol('tiptap-editor')

function isProvidedEditorRef(
  editor: MaybeEditor | ShallowRef<MaybeEditor> | ComputedRef<MaybeEditor>,
): editor is ShallowRef<MaybeEditor> | ComputedRef<MaybeEditor> {
  return typeof editor === 'object' && editor !== null && 'value' in editor
}

/** Предоставляет редактор потомкам (аналог EditorContext.Provider). */
export function provideTiptapEditor(editor: ProvidedTiptapEditor) {
  provide(editorInjectionKey, editor)
}

/**
 * Возвращает редактор: явно переданный имеет приоритет над контекстным.
 */
export function useTiptapEditor(
  providedEditor?: MaybeEditor | ShallowRef<MaybeEditor> | ComputedRef<MaybeEditor>,
): ComputedRef<Editor | null> {
  const contextEditor = inject(editorInjectionKey, shallowRef(null))
  return computed(() => {
    const explicit = isProvidedEditorRef(providedEditor) ? providedEditor.value : providedEditor
    return explicit ?? contextEditor.value ?? null
  })
}
