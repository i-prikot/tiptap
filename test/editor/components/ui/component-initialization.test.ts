import { shallowMount } from '@vue/test-utils'
import type { Component } from 'vue'
import { describe, expect, it } from 'vitest'

const components = import.meta.glob('../../../../src/editor/components/ui/**/*.vue', {
  eager: true,
  import: 'default',
}) as Record<string, Component>

const propsByFile: Record<string, Record<string, unknown>> = {
  'EmojiMenuItem.vue': {
    emoji: { emoji: '😀', label: 'Grinning face', name: 'grinning' },
    isSelected: false,
    selector: 'emoji',
  },
  'IndentButton.vue': { action: 'indent' },
  'MarkButton.vue': { type: 'bold' },
  'MentionMenuItem.vue': { item: { id: 'ada', title: 'Ada' }, isSelected: false },
  'MoveNodeButton.vue': { direction: 'up' },
  'SlashCommandTriggerButton.vue': { onTrigger: () => undefined },
  'SlashMenuItem.vue': {
    item: { title: 'Text', description: 'Paragraph', icon: 'T' },
    isSelected: false,
  },
  'TextAlignButton.vue': { align: 'left' },
  'UndoRedoButton.vue': { action: 'undo' },
}

describe('editor UI component initialization', () => {
  it('initializes every UI component without an editor context', () => {
    for (const [path, component] of Object.entries(components)) {
      const pathSegments = path.split('/')
      const fileName = pathSegments[pathSegments.length - 1]
      if (!fileName) throw new Error(`Expected a filename for ${path}`)

      const wrapper = shallowMount(component, {
        props: propsByFile[fileName],
        global: { stubs: { Teleport: true } },
      })

      expect(wrapper.exists(), fileName).toBe(true)
      wrapper.unmount()
    }
  })
})
