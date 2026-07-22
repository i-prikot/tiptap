import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ColorMenu from '../../../../src/editor/components/ui/color/ColorMenu.vue'
import EmojiDropdownMenu from '../../../../src/editor/components/ui/emoji-menu/EmojiDropdownMenu.vue'
import MentionDropdownMenu from '../../../../src/editor/components/ui/mention-menu/MentionDropdownMenu.vue'

const colorMocks = vi.hoisted(() => ({
  addRecentColor: vi.fn(),
  canColorHighlight: vi.fn(() => false),
  selectCurrentBlockContent: vi.fn(),
}))

vi.mock('../../../../src/editor/composables/useEditorSelectionSignal', () => ({
  useEditorSelectionSignal: () => ({ value: 0 }),
}))

vi.mock('../../../../src/editor/composables/useRecentColors', () => ({
  getColorByValue: (value: string, colors: Array<{ label: string; value: string }>) =>
    colors.find((color) => color.value === value) ?? { label: value, value },
  useRecentColors: () => ({
    addRecentColor: colorMocks.addRecentColor,
    isInitialized: { value: true },
    recentColors: {
      value: [
        { label: 'Custom text', type: 'text', value: '#123456' },
        { label: 'Custom background', type: 'highlight', value: '#abcdef' },
      ],
    },
  }),
}))

vi.mock('../../../../src/editor/composables/useColorText', () => ({
  TEXT_COLORS: [
    { label: 'Black text', value: '#111111' },
    { label: 'Blue text', value: '#0000ff' },
  ],
}))

vi.mock('../../../../src/editor/composables/useColorHighlight', () => ({
  HIGHLIGHT_COLORS: [
    { label: 'Yellow background', value: '#ffff00' },
    { label: 'Gray background', value: '#eeeeee' },
  ],
  canColorHighlight: colorMocks.canColorHighlight,
}))

vi.mock('../../../../src/editor/utils/tiptap-utils', () => ({
  selectCurrentBlockContent: colorMocks.selectCurrentBlockContent,
}))

const SuggestionMenuStub = defineComponent({
  name: 'SuggestionMenu',
  props: { items: { required: true, type: Function } },
  setup(_props, { slots }) {
    return () => h('div', slots.default?.({ items: [], onSelect: vi.fn(), selectedIndex: 0 }))
  },
})

function createColorEditor({
  canHighlight = false,
  canText = true,
  storedMarks = true,
}: {
  canHighlight?: boolean
  canText?: boolean
  storedMarks?: boolean
} = {}) {
  const run = vi.fn(() => true)
  const chain = {
    focus: vi.fn(),
    toggleMark: vi.fn(),
    toggleNodeBackgroundColor: vi.fn(),
  }
  chain.focus.mockReturnValue(chain)
  chain.toggleMark.mockReturnValue({ run })
  chain.toggleNodeBackgroundColor.mockReturnValue({ run })

  const markType = { name: 'textStyle' }
  const transaction = {
    removeStoredMark: vi.fn(() => transaction),
  }
  const anchor = {
    depth: 1,
    node: vi.fn((depth: number) => (depth === 1 ? { attrs: { backgroundColor: '#eeeeee' } } : {})),
  }
  const editor = {
    can: () => ({
      setMark: vi.fn((name: string) => (name === 'textStyle' ? canText : canHighlight)),
    }),
    chain: vi.fn(() => chain),
    isActive: vi.fn(
      (name: string, attributes?: { color?: string }) =>
        name === 'textStyle' && attributes?.color === '#111111',
    ),
    isEditable: true,
    schema: { marks: { textStyle: markType } },
    state: {
      selection: { $anchor: anchor },
      storedMarks: storedMarks ? [markType] : null,
      tr: transaction,
    },
    view: { dispatch: vi.fn() },
  }

  colorMocks.canColorHighlight.mockReturnValue(canHighlight)
  return { chain, editor, transaction }
}

afterEach(() => {
  colorMocks.addRecentColor.mockReset()
  colorMocks.canColorHighlight.mockReset()
  colorMocks.canColorHighlight.mockReturnValue(false)
  colorMocks.selectCurrentBlockContent.mockReset()
  vi.useRealTimers()
})

describe('focused UI branch behavior', () => {
  it('filters emoji source fields, limits results, and inserts only valid selections', () => {
    const wrapper = mount(EmojiDropdownMenu, {
      global: { stubs: { SuggestionMenu: SuggestionMenuStub } },
    })
    const getItems = wrapper.findComponent(SuggestionMenuStub).props('items') as (args: {
      editor: { extensionStorage: { emoji?: { emojis: Array<Record<string, unknown>> } } }
      query: string
    }) => Array<{ context: { name: string }; onSelect: (args: Record<string, unknown>) => void }>

    const emojiEditor = {
      extensionStorage: {
        emoji: {
          emojis: [
            { name: 'Rocket', shortcodes: ['ship'], tags: ['launch'] },
            { name: 'Smile', shortcodes: ['happy'], tags: ['face'] },
          ],
        },
      },
    }
    expect(
      getItems({ editor: emojiEditor, query: 'SHIP' }).map((item) => item.context.name),
    ).toEqual(['Rocket'])
    expect(getItems({ editor: emojiEditor, query: 'launch' })).toHaveLength(1)
    expect(getItems({ editor: emojiEditor, query: 'missing' })).toEqual([])
    expect(getItems({ editor: { extensionStorage: {} }, query: '' })).toEqual([])

    const run = vi.fn()
    const chain = { focus: vi.fn(), setEmoji: vi.fn(), run }
    chain.focus.mockReturnValue(chain)
    chain.setEmoji.mockReturnValue(chain)
    const selectedEditor = { chain: vi.fn(() => chain) }
    const [rocket] = getItems({ editor: emojiEditor, query: 'rocket' })
    if (!rocket) throw new Error('Expected rocket suggestion')

    rocket.onSelect({ context: rocket.context, editor: selectedEditor, range: { from: 1, to: 8 } })
    rocket.onSelect({
      context: { unknown: true },
      editor: selectedEditor,
      range: { from: 1, to: 8 },
    })
    rocket.onSelect({ context: rocket.context, editor: selectedEditor })

    expect(chain.setEmoji).toHaveBeenCalledWith('Rocket')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('searches mention names and positions, then ignores incomplete insertion state', async () => {
    const wrapper = mount(MentionDropdownMenu, {
      global: { stubs: { SuggestionMenu: SuggestionMenuStub } },
    })
    const getItems = wrapper.findComponent(SuggestionMenuStub).props('items') as (args: {
      query: string
    }) => Promise<
      Array<{
        context: { id: number; name: string }
        onSelect: (args: Record<string, unknown>) => void
      }>
    >

    const allItems = await getItems({ query: '' })
    expect(allItems).toHaveLength(20)
    expect((await getItems({ query: 'emily' }))[0]?.context.name).toBe('Emily Johnson')
    expect((await getItems({ query: 'designer' })).length).toBeGreaterThan(1)
    expect(await getItems({ query: 'missing' })).toEqual([])

    const run = vi.fn()
    const chain = { focus: vi.fn(), insertContentAt: vi.fn(), run }
    chain.focus.mockReturnValue(chain)
    chain.insertContentAt.mockReturnValue(chain)
    const editor = { chain: vi.fn(() => chain) }
    const [emily] = allItems
    if (!emily) throw new Error('Expected the first mention suggestion')

    emily.onSelect({ context: emily.context, editor, range: { from: 1, to: 7 } })
    emily.onSelect({ context: emily.context, editor, range: undefined })
    emily.onSelect({ context: undefined, editor, range: { from: 1, to: 7 } })

    expect(chain.insertContentAt).toHaveBeenCalledWith({ from: 1, to: 7 }, [
      { attrs: { id: '1', label: 'Emily Johnson' }, type: 'mention' },
      { text: ' ', type: 'text' },
    ])
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('applies text, background, and recent colors through an editable editor', async () => {
    vi.useFakeTimers()
    const { chain, editor, transaction } = createColorEditor({ canText: false, canHighlight: true })
    const wrapper = mount(ColorMenu, {
      props: { editor: editor as never, label: 'Formatting colors' },
    })

    const selectColor = async (label: string) => {
      if (!document.body.textContent?.includes(label)) {
        await wrapper.get('button').trigger('click')
        await wrapper.vm.$nextTick()
      }
      const button = Array.from(document.body.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes(label),
      )
      if (!button) throw new Error(`Expected color action for ${label}`)
      button.click()
      await wrapper.vm.$nextTick()
    }

    await selectColor('Black text')
    await selectColor('Yellow background')
    await vi.runAllTimersAsync()

    expect(transaction.removeStoredMark).toHaveBeenCalled()
    expect(colorMocks.selectCurrentBlockContent).toHaveBeenCalled()
    expect(chain.toggleMark).toHaveBeenCalledWith('textStyle', { color: '#111111' })
    expect(chain.toggleNodeBackgroundColor).toHaveBeenCalledWith('#ffff00')
    expect(colorMocks.addRecentColor).toHaveBeenCalledWith({
      label: 'Black text',
      type: 'text',
      value: '#111111',
    })
    expect(colorMocks.addRecentColor).toHaveBeenCalledWith({
      label: 'Yellow background',
      type: 'highlight',
      value: '#ffff00',
    })
  })
})
