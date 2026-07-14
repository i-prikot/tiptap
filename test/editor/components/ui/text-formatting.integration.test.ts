import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { type Mark } from '@tiptap/pm/model'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import ColorHighlightButton from '../../../../src/editor/components/ui/ColorHighlightButton.vue'
import ColorHighlightPopoverContent from '../../../../src/editor/components/ui/ColorHighlightPopoverContent.vue'
import LinkPopover from '../../../../src/editor/components/ui/LinkPopover.vue'
import MarkButton from '../../../../src/editor/components/ui/MarkButton.vue'
import { provideTiptapEditor } from '../../../../src/editor/composables/useTiptapEditor'
import type { HighlightColor } from '../../../../src/editor/types/color'

vi.mock('@floating-ui/vue', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  shift: vi.fn(() => ({})),
  size: vi.fn(() => ({})),
  useFloating: () => ({ floatingStyles: { value: {} }, placement: { value: 'bottom' } }),
}))

const TEST_TEXT = 'Format this selected text'
const TEST_URL = 'https://example.com/formatting-test'
const TEST_HIGHLIGHT: HighlightColor = {
  label: 'Test blue',
  value: '#e0f2fe',
  colorValue: '#e0f2fe',
  border: '#0284c7',
}

const providedEditor = shallowRef<Editor | null>(null)

const FormattingHost = defineComponent({
  name: 'TextFormattingIntegrationHost',
  setup() {
    provideTiptapEditor(providedEditor)

    return () =>
      h('div', { 'data-testid': 'text-formatting-controls' }, [
        h(MarkButton, { type: 'bold' }),
        h(MarkButton, { type: 'italic' }),
        h(ColorHighlightButton, {
          highlightColor: TEST_HIGHLIGHT.value,
          label: 'Apply test blue highlight',
        }),
        h(ColorHighlightPopoverContent, { colors: [TEST_HIGHLIGHT] }),
        h(LinkPopover, { autoOpenOnLinkActive: false }),
      ])
  },
})

interface FormattingHarness {
  editor: Editor
  host: HTMLElement
  wrapper: VueWrapper
}

const harnesses: FormattingHarness[] = []

function createFormattingHarness(): FormattingHarness {
  const host = document.createElement('div')
  document.body.append(host)

  const editorElement = document.createElement('div')
  host.append(editorElement)
  const editor = new Editor({
    content: `<p>${TEST_TEXT}</p>`,
    element: editorElement,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Highlight.configure({ multicolor: true }),
    ],
  })
  providedEditor.value = editor

  const wrapper = mount(FormattingHost, { attachTo: host })
  const harness = { editor, host, wrapper }
  harnesses.push(harness)

  return harness
}

function requireButton(selector: string, description: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(selector)

  expect(button, description).not.toBeNull()
  if (!button) throw new Error(description)

  return button
}

function requireInput(selector: string, description: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(selector)

  expect(input, description).not.toBeNull()
  if (!input) throw new Error(description)

  return input
}

function selectTestText(editor: Editor): void {
  const from = 1
  const to = TEST_TEXT.length + 1

  editor.commands.setTextSelection({ from, to })

  expect(
    editor.state.selection.empty,
    'The formatting command requires a non-empty text selection.',
  ).toBe(false)
  expect(
    editor.state.doc.textBetween(from, to),
    'The formatting command must select the complete expected test text.',
  ).toBe(TEST_TEXT)
}

function selectedMark(editor: Editor, markName: string): Mark | undefined {
  const { from, to } = editor.state.selection
  let foundMark: Mark | undefined

  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText || foundMark) return
    foundMark = node.marks.find((mark) => mark.type.name === markName)
  })

  return foundMark
}

async function settleFormattingUpdates(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  await nextTick()
}

function expectRetainedText(editor: Editor, action: string): void {
  expect(editor.getText(), `${action} should retain the selected text "${TEST_TEXT}".`).toBe(
    TEST_TEXT,
  )
}

afterEach(() => {
  while (harnesses.length) {
    const harness = harnesses.pop()
    if (!harness) continue
    if (!harness.editor.isDestroyed) harness.editor.destroy()
    harness.wrapper.unmount()
    harness.host.remove()
    providedEditor.value = null
  }
})

describe('Text formatting integration', () => {
  it('applies and removes bold through the live MarkButton without changing text', async () => {
    const { editor } = createFormattingHarness()
    selectTestText(editor)

    const boldButton = requireButton(
      'button[aria-label="Bold"]',
      'Expected the live Bold control to be available for the selected text.',
    )
    await boldButton.click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'bold'),
      'Enabling bold should add the expected bold mark.',
    ).toBeDefined()
    expect(
      requireButton('button[aria-label="Bold"]', 'Expected the Bold control after enabling bold.')
        .dataset.activeState,
      'Enabling bold should expose the Bold control active state.',
    ).toBe('on')
    expectRetainedText(editor, 'Enabling bold')

    selectTestText(editor)
    await requireButton(
      'button[aria-label="Bold"]',
      'Expected the Bold control to remove bold.',
    ).click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'bold'),
      'Disabling bold should remove the expected bold mark.',
    ).toBeUndefined()
    expect(
      requireButton('button[aria-label="Bold"]', 'Expected the Bold control after disabling bold.')
        .dataset.activeState,
      'Disabling bold should expose the Bold control inactive state.',
    ).toBe('off')
    expectRetainedText(editor, 'Disabling bold')
  })

  it('applies and removes italic through the live MarkButton without changing text', async () => {
    const { editor } = createFormattingHarness()
    selectTestText(editor)

    const italicButton = requireButton(
      'button[aria-label="Italic"]',
      'Expected the live Italic control to be available for the selected text.',
    )
    await italicButton.click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'italic'),
      'Enabling italic should add the expected italic mark.',
    ).toBeDefined()
    expect(
      requireButton(
        'button[aria-label="Italic"]',
        'Expected the Italic control after enabling italic.',
      ).dataset.activeState,
      'Enabling italic should expose the Italic control active state.',
    ).toBe('on')
    expectRetainedText(editor, 'Enabling italic')

    selectTestText(editor)
    await requireButton(
      'button[aria-label="Italic"]',
      'Expected the Italic control to remove italic.',
    ).click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'italic'),
      'Disabling italic should remove the expected italic mark.',
    ).toBeUndefined()
    expect(
      requireButton(
        'button[aria-label="Italic"]',
        'Expected the Italic control after disabling italic.',
      ).dataset.activeState,
      'Disabling italic should expose the Italic control inactive state.',
    ).toBe('off')
    expectRetainedText(editor, 'Disabling italic')
  })

  it('applies a deterministic highlight color and removes it through the live controls', async () => {
    const { editor } = createFormattingHarness()
    selectTestText(editor)

    await requireButton(
      'button[aria-label="Apply test blue highlight"]',
      'Expected the live highlight color control to be available for the selected text.',
    ).click()
    await settleFormattingUpdates()

    const appliedHighlight = selectedMark(editor, 'highlight')
    expect(appliedHighlight, 'Applying the color should add a highlight mark.').toBeDefined()
    expect(
      appliedHighlight?.attrs.color,
      `Applying the color should set highlight color to "${TEST_HIGHLIGHT.value}".`,
    ).toBe(TEST_HIGHLIGHT.value)
    expectRetainedText(editor, 'Applying the highlight color')

    selectTestText(editor)
    await requireButton(
      'button[aria-label="Remove highlight"]',
      'Expected the live Remove highlight control to be available after applying a color.',
    ).click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'highlight'),
      'Removing highlight should remove the color mark.',
    ).toBeUndefined()
    expectRetainedText(editor, 'Removing highlight')
  })

  it('sets and removes a link through the live LinkPopover without changing link text', async () => {
    const { editor } = createFormattingHarness()
    selectTestText(editor)

    await requireButton(
      'button[aria-label="Link"]',
      'Expected the live Link control to be available for the selected text.',
    ).click()
    await settleFormattingUpdates()

    const linkInput = requireInput(
      'input[placeholder="Paste a link..."]',
      'Opening the Link control should show the Paste a link input.',
    )
    linkInput.value = TEST_URL
    await linkInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    await requireButton(
      'button[title="Apply link"]',
      `Expected an Apply link action for requested URL "${TEST_URL}".`,
    ).click()
    await settleFormattingUpdates()

    const appliedLink = selectedMark(editor, 'link')
    expect(appliedLink, `Applying URL "${TEST_URL}" should add a link mark.`).toBeDefined()
    expect(
      appliedLink?.attrs.href,
      `Applying URL "${TEST_URL}" should store the requested href.`,
    ).toBe(TEST_URL)
    expectRetainedText(editor, `Applying URL "${TEST_URL}"`)

    selectTestText(editor)
    await requireButton(
      'button[aria-label="Link"]',
      'Expected the Link control to reopen for link removal.',
    ).click()
    await settleFormattingUpdates()
    await requireButton(
      'button[title="Remove link"]',
      `Expected a Remove link action for URL "${TEST_URL}".`,
    ).click()
    await settleFormattingUpdates()

    expect(
      selectedMark(editor, 'link'),
      `Removing URL "${TEST_URL}" should remove the link mark.`,
    ).toBeUndefined()
    expectRetainedText(editor, `Removing URL "${TEST_URL}"`)
  })
})
