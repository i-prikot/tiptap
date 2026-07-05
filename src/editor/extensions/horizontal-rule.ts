/**
 * HorizontalRule — стандартный hr, обёрнутый в div с data-type,
 * чтобы блок выделялся и таскался как узел.
 * Порт из чанка 34p294mqk5mqb (модуль 523030).
 */
import { mergeAttributes } from '@tiptap/core'
import { HorizontalRule as BaseHorizontalRule } from '@tiptap/extension-horizontal-rule'

export const HorizontalRule = BaseHorizontalRule.extend({
  renderHTML() {
    return ['div', mergeAttributes(this.options.HTMLAttributes, { 'data-type': this.name }), ['hr']]
  },
})
