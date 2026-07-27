import type { Editor } from '@tiptap/core'
import type { PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { createSuggestionDismissedStateGuard } from './dismissed-state'
import { createSuggestionFloatingUiConfig } from './positioning'
import type { SuggestionPluginState } from './state'
import type { SuggestionOptions, SuggestionProps } from './types'

interface SuggestionPluginRuntimeConfig {
  editor: Editor
  allowSpaces: boolean
  shouldResetDismissed: SuggestionOptions['shouldResetDismissed']
  placement: SuggestionProps['placement']
  offset: { mainAxis?: number; crossAxis?: number }
  flip: boolean
  floatingUi: SuggestionOptions['floatingUi']
}

export function createSuggestionExitDispatcher(pluginKey: PluginKey<SuggestionPluginState>) {
  return (view: EditorView) => view.dispatch(view.state.tr.setMeta(pluginKey, { exit: true }))
}

export function createSuggestionPluginRuntime(config: SuggestionPluginRuntimeConfig) {
  return {
    floatingConfig: createSuggestionFloatingUiConfig({
      placement: config.placement,
      offset: config.offset,
      flip: config.flip,
      floatingUi: config.floatingUi,
    }),
    dismissedGuard: createSuggestionDismissedStateGuard(
      config.editor,
      config.allowSpaces,
      config.shouldResetDismissed,
    ),
  }
}
