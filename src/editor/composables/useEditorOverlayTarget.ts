import { inject, provide } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'

export type EditorOverlayTarget = Readonly<ShallowRef<HTMLElement | null>>

const editorOverlayTargetInjectionKey: InjectionKey<EditorOverlayTarget> =
  Symbol('editor-overlay-target')

export function provideEditorOverlayTarget(target: EditorOverlayTarget) {
  provide(editorOverlayTargetInjectionKey, target)
}

export function useEditorOverlayTarget(): EditorOverlayTarget | undefined {
  return inject(editorOverlayTargetInjectionKey)
}
