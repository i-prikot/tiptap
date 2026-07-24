/* eslint-disable vue/one-component-per-file */
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mount, type VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref, shallowRef, type Component } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ColorMenu from '../../../../src/editor/components/ui/color/ColorMenu.vue'
import SlashDropdownMenu from '../../../../src/editor/components/ui/slash-menu/SlashDropdownMenu.vue'
import TurnIntoDropdownContent from '../../../../src/editor/components/ui/turn-into/TurnIntoDropdownContent.vue'
import { provideEditorI18n } from '../../../../src/editor/composables/useEditorI18n'
import { provideTiptapEditor } from '../../../../src/editor/composables/useTiptapEditor'

vi.mock('@floating-ui/vue', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
  size: vi.fn(() => ({})),
  useFloating: () => ({ floatingStyles: { value: {} } }),
}))

vi.mock('../../../../src/editor/components/primitives', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../src/editor/components/primitives')>()
  const { defineComponent, h } = await import('vue')
  const Slot = defineComponent({
    setup(_props, { slots }) {
      return () => h('div', slots.default?.())
    },
  })

  return {
    ...actual,
    Menu: defineComponent({
      setup(_props, { slots }) {
        return () => h('div', [slots.trigger?.(), slots.default?.()])
      },
    }),
    MenuContent: Slot,
  }
})

vi.mock('../../../../src/editor/composables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/editor/composables')>()
  const IconStub = () => null

  const createConversion = () => ({
    Icon: IconStub,
    canToggle: computed(() => true),
    handleToggle: vi.fn(() => true),
    isActive: computed(() => false),
  })

  return {
    ...actual,
    useBlockquoteBlock: createConversion,
    useCodeBlockBlock: createConversion,
    useColorMenu: (_editor: unknown, t: (key: string) => string) => ({
      backgroundItems: computed(() => [
        {
          apply: vi.fn(),
          isActive: false,
          label: t('colors.yellowBackground'),
          value: '#ffff00',
        },
      ]),
      canShow: computed(() => true),
      isInitialized: computed(() => false),
      recentColors: ref([]),
      recentItems: computed(() => []),
      textItems: computed(() => [
        {
          apply: vi.fn(),
          isActive: false,
          label: t('colors.defaultText'),
          value: '#111111',
        },
      ]),
    }),
    useHeadingBlock: createConversion,
    useListBlock: createConversion,
    useTextBlock: createConversion,
  }
})

type Locale = 'en' | 'ru'

interface LocaleCase {
  color: {
    background: string
    defaultText: string
    menu: string
    text: string
    yellowBackground: string
  }
  locale: Locale
  slash: {
    group: string
    placeholder: string
    title: string
  }
  turnInto: {
    heading: string
    heading1: string
    text: string
  }
}

const localeCases: LocaleCase[] = [
  {
    color: {
      background: 'Background color',
      defaultText: 'Default text',
      menu: 'Color',
      text: 'Text color',
      yellowBackground: 'Yellow background',
    },
    locale: 'en',
    slash: {
      group: 'Style',
      placeholder: 'Filter...',
      title: 'Text',
    },
    turnInto: {
      heading: 'Turn into',
      heading1: 'Heading 1',
      text: 'Text',
    },
  },
  {
    color: {
      background: 'Цвет фона',
      defaultText: 'Обычный текст',
      menu: 'Цвет',
      text: 'Цвет текста',
      yellowBackground: 'Жёлтый фон',
    },
    locale: 'ru',
    slash: {
      group: 'Стиль',
      placeholder: 'Фильтр...',
      title: 'Текст',
    },
    turnInto: {
      heading: 'Преобразовать в',
      heading1: 'Заголовок 1',
      text: 'Текст',
    },
  },
]

const slashRawKeys = [
  'editor.slashPlaceholder',
  'menus.groups.style',
  'menus.slash.text.title',
  'menus.slash.text.description',
]
const colorRawKeys = [
  'colors.menu',
  'colors.textColor',
  'colors.defaultText',
  'colors.backgroundColor',
  'colors.yellowBackground',
]
const turnIntoRawKeys = ['toolbar.turnInto', 'menus.slash.text.title', 'menus.slash.heading1.title']

function collectDomOutput(root: ParentNode): string {
  const attributes = Array.from(root.querySelectorAll('*')).flatMap((element) =>
    Array.from(element.attributes, (attribute) => attribute.value),
  )

  return [root.textContent ?? '', ...attributes].join('\n')
}

function expectNoRawKeys(root: ParentNode, keys: string[]) {
  const output = collectDomOutput(root)

  for (const key of keys) {
    expect(output).not.toContain(key)
  }
}

interface SlashMenuHarness {
  editor: Editor
  host: HTMLElement
  wrapper: VueWrapper
}

const slashHarnesses: SlashMenuHarness[] = []

function createSlashMenuHarness(locale: Locale): SlashMenuHarness {
  const host = document.createElement('div')
  document.body.append(host)

  const editorElement = document.createElement('div')
  host.append(editorElement)
  const editor = new Editor({
    content: '<p></p>',
    element: editorElement,
    extensions: [StarterKit],
  })
  const editorRef = shallowRef<Editor | null>(editor)
  const LocalizedSlashMenuHost = defineComponent({
    name: 'LocalizedSlashMenuHost',
    setup() {
      provideEditorI18n(locale, undefined)
      provideTiptapEditor(editorRef)

      return () =>
        h(SlashDropdownMenu, {
          config: { enabledItems: ['text', 'heading_1'] },
        })
    },
  })
  const wrapper = mount(LocalizedSlashMenuHost, { attachTo: host })
  const harness = { editor, host, wrapper }
  slashHarnesses.push(harness)

  return harness
}

function requireSlashMenu(): HTMLElement {
  const menu = document.querySelector<HTMLElement>('[data-selector="tiptap-slash-dropdown-menu"]')

  expect(menu).not.toBeNull()
  if (!menu) throw new Error('Expected the slash menu to be visible.')

  return menu
}

async function openSlashMenu(editor: Editor): Promise<HTMLElement> {
  editor.view.dom.focus()
  editor.commands.insertContent('/')
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()

  return requireSlashMenu()
}

function mountLocalizedComponent(component: Component, locale: Locale) {
  const LocalizedHost = defineComponent({
    name: 'LocalizedUiHost',
    setup() {
      provideEditorI18n(locale, undefined)

      return () => h(component)
    },
  })

  return mount(LocalizedHost, { attachTo: document.body })
}

afterEach(() => {
  while (slashHarnesses.length) {
    const harness = slashHarnesses.pop()
    if (!harness) continue
    harness.wrapper.unmount()
    if (!harness.editor.isDestroyed) harness.editor.destroy()
    harness.host.remove()
  }
})

describe('localized UI rendering', () => {
  it.each(localeCases)(
    'renders localized slash-menu copy without raw keys for $locale',
    async ({ locale, slash }) => {
      const { editor } = createSlashMenuHarness(locale)
      const menu = await openSlashMenu(editor)

      expect(menu.textContent).toContain(slash.group)
      expect(menu.textContent).toContain(slash.title)
      expect(editor.view.dom.innerHTML).toContain(slash.placeholder)

      expectNoRawKeys(document.body, slashRawKeys)
    },
  )

  it.each(localeCases)(
    'renders localized color-menu controls without raw keys for $locale',
    async ({ color, locale }) => {
      const wrapper = mountLocalizedComponent(ColorMenu, locale)

      expect(wrapper.text()).toContain(color.menu)

      const output = collectDomOutput(document.body)

      expect(output).toContain(color.text)
      expect(output).toContain(color.defaultText)
      expect(output).toContain(color.background)
      expect(output).toContain(color.yellowBackground)
      expectNoRawKeys(document.body, colorRawKeys)
    },
  )

  it.each(localeCases)(
    'renders localized turn-into controls without raw keys for $locale',
    ({ locale, turnInto }) => {
      const wrapper = mountLocalizedComponent(TurnIntoDropdownContent, locale)

      expect(wrapper.text()).toContain(turnInto.heading)
      expect(wrapper.text()).toContain(turnInto.text)
      expect(wrapper.text()).toContain(turnInto.heading1)
      expectNoRawKeys(wrapper.element, turnIntoRawKeys)
    },
  )
})
