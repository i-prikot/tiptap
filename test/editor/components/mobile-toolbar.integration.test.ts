import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  editor: null as Editor | null,
  isMobile: true,
  canHighlight: true,
  canLink: true,
  canConvert: true,
}))

vi.mock('../../../src/editor/composables/useTiptapEditor', async () => {
  const { computed } = await import('vue')
  return { useTiptapEditor: () => computed(() => state.editor) }
})
vi.mock('../../../src/editor/composables/useIsBreakpoint', async () => {
  const { ref } = await import('vue')
  return { useIsBreakpoint: () => ref(state.isMobile) }
})
vi.mock('../../../src/editor/composables/useEditorSelectionSignal', async () => {
  const { ref } = await import('vue')
  return { useEditorSelectionSignal: () => ref(1) }
})
vi.mock('../../../src/editor/composables/useWindowSize', () => ({
  useWindowSize: () => ({ height: 800 }),
}))
vi.mock('../../../src/editor/composables/useCursorVisibility', () => ({
  useCursorVisibility: () => ({ y: 0 }),
}))
vi.mock('../../../src/editor/composables/useColorHighlight', () => ({
  canColorHighlight: () => state.canHighlight,
}))
vi.mock('../../../src/editor/composables/useLinkPopover', () => ({
  canSetLink: () => state.canLink,
}))
vi.mock('../../../src/editor/composables/blocks/useBlockConversions', async () => {
  const { ref } = await import('vue')
  const conversion = (label: string) => ({
    Icon: 'span',
    canToggle: ref(state.canConvert),
    handleToggle: vi.fn(),
    isActive: ref(false),
    label,
  })
  return {
    useBlockquoteBlock: () => conversion('Quote'),
    useCodeBlockBlock: () => conversion('Code'),
    useHeadingBlock: (_editor: unknown, level: number) => conversion(`Heading ${level}`),
    useListBlock: (_editor: unknown, type: string) => conversion(type),
    useTextBlock: () => conversion('Text'),
  }
})
vi.mock('../../../src/editor/composables/useNodeActions', async () => {
  const { ref } = await import('vue')
  const action = (capability: string) => ({
    Icon: 'span',
    [capability]: ref(true),
    handleCopyAnchorLink: vi.fn(),
    handleCopyToClipboard: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleDuplicate: vi.fn(),
    handleResetFormatting: vi.fn(),
  })
  return {
    useCopyAnchorLink: () => action('canCopyAnchorLink'),
    useCopyToClipboard: () => action('canCopyToClipboard'),
    useDeleteNode: () => action('canDeleteNode'),
    useDuplicate: () => action('canDuplicate'),
    getAnchorNodeAndPos: () => null,
    useResetAllFormatting: () => action('canReset'),
  }
})
vi.mock('../../../src/editor/utils/selection-utils', () => ({
  getNodeDisplayName: () => 'Paragraph',
}))

import MobileToolbar from '../../../src/editor/components/ui/mobile-toolbar/MobileToolbar.vue'

const editors: Editor[] = []

const passThrough = { template: '<div><slot /><slot name="trigger" /></div>' }
const clickable = (testId: string, event = 'click') => ({
  emits: [event],
  template: `<button data-test="${testId}" @click="$emit('${event}')"><slot /></button>`,
})

function mountToolbar() {
  return mount(MobileToolbar, {
    shallow: true,
    attachTo: document.body,
    global: {
      stubs: {
        Button: { template: '<button><slot /></button>' },
        ColorHighlightPopoverButton: clickable('highlighter'),
        ColorHighlightPopoverContent: { template: '<div data-test="highlight-content" />' },
        ColorMenu: passThrough,
        ImageNodeFloating: passThrough,
        ImageUploadButton: passThrough,
        IndentButton: passThrough,
        LinkButton: clickable('link'),
        LinkContent: clickable('link-content', 'set-link'),
        MarkButton: passThrough,
        Menu: passThrough,
        MenuContent: passThrough,
        MenuGroup: passThrough,
        MenuGroupLabel: passThrough,
        MenuItem: passThrough,
        MoveNodeButton: passThrough,
        Separator: passThrough,
        SlashCommandTriggerButton: passThrough,
        Spacer: passThrough,
        TextAlignButton: passThrough,
        Toolbar: passThrough,
        ToolbarGroup: passThrough,
        ToolbarSeparator: passThrough,
        Teleport: true,
      },
    },
  })
}

beforeEach(() => {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({
    element: host,
    content: '<p>Selected text</p>',
    extensions: [StarterKit],
  })
  editors.push(editor)
  state.editor = editor
  state.isMobile = true
  state.canHighlight = true
  state.canLink = true
  state.canConvert = true
})

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('mobile toolbar', () => {
  it('renders the editable mobile main view with selection-aware controls', () => {
    mountToolbar()

    expect(document.body.querySelector('.tiptap-toolbar')).not.toBeNull()
  })

  it('does not render outside of editable mobile mode and hides unavailable conversion controls', () => {
    state.isMobile = false
    const desktop = mountToolbar()
    expect(document.body.querySelector('.tiptap-toolbar')).toBeNull()
    desktop.unmount()

    state.isMobile = true
    state.editor?.setEditable(false)
    const readOnly = mountToolbar()
    expect(document.body.querySelector('.tiptap-toolbar')).toBeNull()
    readOnly.unmount()

    state.editor?.setEditable(true)
    state.canConvert = false
    state.canHighlight = false
    state.canLink = false
    mountToolbar()
    expect(document.body.querySelector('.tiptap-toolbar')).not.toBeNull()
  })
})
