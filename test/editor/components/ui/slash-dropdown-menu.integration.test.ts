import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SlashDropdownMenu from '../../../../src/editor/components/ui/SlashDropdownMenu.vue'
import { provideTiptapEditor } from '../../../../src/editor/composables/useTiptapEditor'

vi.mock('@floating-ui/vue', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
  size: vi.fn(() => ({})),
  useFloating: () => ({ floatingStyles: { value: {} } }),
}))

vi.mock('../../../../src/editor/icons', () => {
  const IconStub = () => null

  return {
    AiSparklesIcon: IconStub,
    AtSignIcon: IconStub,
    BlockquoteIcon: IconStub,
    CodeBlockIcon: IconStub,
    HeadingOneIcon: IconStub,
    HeadingThreeIcon: IconStub,
    HeadingTwoIcon: IconStub,
    ImageIcon: IconStub,
    ListIcon: IconStub,
    ListIndentedIcon: IconStub,
    ListOrderedIcon: IconStub,
    ListTodoIcon: IconStub,
    MinusIcon: IconStub,
    SmilePlusIcon: IconStub,
    TableIcon: IconStub,
    TypeIcon: IconStub,
  }
})

const providedEditor = shallowRef<Editor | null>(null)

const SlashMenuHost = defineComponent({
  name: 'SlashMenuIntegrationHost',
  setup() {
    provideTiptapEditor(providedEditor)

    return () => h(SlashDropdownMenu)
  },
})

interface SlashMenuHarness {
  editor: Editor
  host: HTMLElement
  wrapper: VueWrapper
}

const harnesses: SlashMenuHarness[] = []

function createSlashMenuHarness(): SlashMenuHarness {
  const host = document.createElement('div')
  document.body.append(host)

  const editorElement = document.createElement('div')
  host.append(editorElement)
  const editor = new Editor({
    content: '<p></p>',
    element: editorElement,
    extensions: [StarterKit],
  })
  providedEditor.value = editor
  const wrapper = mount(SlashMenuHost, { attachTo: host })
  const harness = { editor, host, wrapper }
  harnesses.push(harness)

  return harness
}

function requireSlashMenu(): HTMLElement {
  const menu = document.querySelector<HTMLElement>('[data-selector="tiptap-slash-dropdown-menu"]')

  expect(menu, 'Typing "/" should display the slash command menu.').not.toBeNull()
  if (!menu) throw new Error('Typing "/" should display the slash command menu.')

  return menu
}

function slashMenuItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('[data-slot="tiptap-button"]'))
}

function dispatchEditorKey(editor: Editor, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  editor.view.dom.dispatchEvent(event)
  return event
}

async function settleSlashMenuUpdates(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

async function openSlashMenu(editor: Editor): Promise<HTMLElement> {
  editor.view.dom.focus()
  editor.commands.insertContent('/')
  await settleSlashMenuUpdates()
  return requireSlashMenu()
}

afterEach(() => {
  while (harnesses.length) {
    const harness = harnesses.pop()
    if (!harness) continue
    harness.wrapper.unmount()
    if (!harness.editor.isDestroyed) harness.editor.destroy()
    harness.host.remove()
    providedEditor.value = null
  }
})

describe('SlashDropdownMenu integration', () => {
  it('opens command items with the first item selected after typing the slash trigger', async () => {
    const { editor } = createSlashMenuHarness()

    const menu = await openSlashMenu(editor)
    const items = slashMenuItems(menu)

    expect(menu.getAttribute('role'), 'The slash trigger should open a visible command list.').toBe(
      'listbox',
    )
    expect(
      items.length,
      'The open slash menu should show available command items.',
    ).toBeGreaterThan(1)
    expect(items[0]?.textContent, 'The first slash command should be the Text block.').toContain(
      'Text',
    )
    expect(
      items[0]?.dataset.activeState,
      'Opening the slash menu should select its first command item.',
    ).toBe('on')
  })

  it('selects Heading 1 through ArrowDown and Enter, removes the trigger, and converts the block', async () => {
    const { editor } = createSlashMenuHarness()

    const menu = await openSlashMenu(editor)
    const arrowDown = dispatchEditorKey(editor, 'ArrowDown')
    await settleSlashMenuUpdates()

    const items = slashMenuItems(menu)
    expect(
      arrowDown.defaultPrevented,
      'ArrowDown should be handled by slash-menu keyboard navigation.',
    ).toBe(true)
    expect(items[1]?.textContent, 'ArrowDown should move selection to Heading 1.').toContain(
      'Heading 1',
    )
    expect(
      items[1]?.dataset.activeState,
      'ArrowDown should visibly select the Heading 1 command.',
    ).toBe('on')

    const enter = dispatchEditorKey(editor, 'Enter')
    await settleSlashMenuUpdates()

    expect(
      enter.defaultPrevented,
      'Enter should execute the selected slash command through the editor DOM.',
    ).toBe(true)
    expect(
      document.querySelector('[data-selector="tiptap-slash-dropdown-menu"]'),
      'Executing the selected slash command should close the menu.',
    ).toBeNull()
    expect(
      editor.getText(),
      'Executing Heading 1 should remove the slash trigger from the document.',
    ).not.toContain('/')
    expect(
      editor.state.doc.firstChild?.type.name,
      'Executing Heading 1 should convert the active paragraph into a heading block.',
    ).toBe('heading')
    expect(
      editor.state.doc.firstChild?.attrs.level,
      'Executing Heading 1 should create a level-1 heading.',
    ).toBe(1)
  })
})
