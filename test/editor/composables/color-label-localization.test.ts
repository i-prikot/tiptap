import { mount } from '@vue/test-utils'
import { computed, defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useColorHighlight } from '../../../packages/editor/src/composables/useColorHighlight'
import { useColorText } from '../../../packages/editor/src/composables/useColorText'
import { provideEditorI18n } from '../../../packages/editor/src/composables/useEditorI18n'

const colorControlOptions = vi.hoisted(() => [] as Array<{ onRemoved?: () => void }>)

vi.mock('../../../packages/editor/src/composables/useColorControl', () => ({
  useColorControl: (options: { onRemoved?: () => void }) => {
    colorControlOptions.push(options)

    return {
      isVisible: { value: false },
      isActive: { value: false },
      canApplyColor: { value: false },
      handleApply: () => false,
      handleRemove: () => false,
    }
  },
}))

describe('color control labels', () => {
  it('uses localized defaults when callers omit labels', () => {
    colorControlOptions.length = 0
    const onHighlightApplied = vi.fn()
    let highlight: ReturnType<typeof useColorHighlight> | undefined
    let text: ReturnType<typeof useColorText> | undefined

    const Host = defineComponent({
      setup() {
        provideEditorI18n('ru', undefined)
        highlight = useColorHighlight({
          editor: computed(() => null),
          onApplied: onHighlightApplied,
        })
        text = useColorText({
          editor: computed(() => null),
          textColor: '#ff0000',
        })

        return () => null
      },
    })
    const wrapper = mount(Host)

    try {
      if (!highlight || !text) throw new Error('Expected color controls')

      expect(highlight.label.value).toBe('Выделение')
      expect(text.label.value).toBe('Цвет текста: #ff0000')

      colorControlOptions[0]?.onRemoved?.()

      expect(onHighlightApplied).toHaveBeenCalledWith({
        color: '',
        label: 'Убрать выделение',
        mode: 'mark',
      })
    } finally {
      wrapper.unmount()
    }
  })
})
