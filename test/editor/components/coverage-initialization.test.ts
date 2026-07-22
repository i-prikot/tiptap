import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import * as Y from 'yjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { provideAi } from '../../../src/editor/composables/useAi'
import { provideCollab } from '../../../src/editor/composables/useCollab'
import { provideTiptapEditor } from '../../../src/editor/composables/useTiptapEditor'
import { provideToc } from '../../../src/editor/composables/useToc'
import { provideUser } from '../../../src/editor/composables/useUser'
import { TableHandleExtension } from '../../../src/editor/extensions/table-handle'
import { TableKit } from '../../../src/editor/extensions/table-kit'

const components = {
  ...import.meta.glob('../../../src/editor/components/ui/**/*.vue', {
    eager: true,
    import: 'default',
  }),
  ...import.meta.glob('../../../src/editor/components/notion/**/*.vue', {
    eager: true,
    import: 'default',
  }),
  ...import.meta.glob('../../../src/editor/components/table/**/*.vue', {
    eager: true,
    import: 'default',
  }),
  ...import.meta.glob('../../../src/editor/nodes/**/*.vue', {
    eager: true,
    import: 'default',
  }),
} as Record<string, Component>

const componentGroups = [
  ['ui', Object.entries(components).filter(([path]) => path.includes('/components/ui/'))],
  ['table', Object.entries(components).filter(([path]) => path.includes('/components/table/'))],
  [
    'notion and node views',
    Object.entries(components).filter(
      ([path]) => !path.includes('/components/ui/') && !path.includes('/components/table/'),
    ),
  ],
] as const

const editors: Editor[] = []
const editorHosts: HTMLElement[] = []

const node = {
  attrs: {
    accept: 'image/*',
    alt: 'Example image',
    backgroundColor: '#fef3c7',
    limit: 3,
    maxSize: 1024,
    showCaption: true,
    showTitle: true,
    src: 'https://example.test/image.png',
    topOffset: 0,
    width: '50%',
  },
  content: { size: 0 },
  nodeSize: 1,
}

const minimalNode = {
  ...node,
  attrs: {
    ...node.attrs,
    alt: '',
    backgroundColor: undefined,
    limit: 1,
    showCaption: false,
    showTitle: false,
    src: '',
    width: null,
  },
}

const propsByFile: Record<string, Record<string, unknown>> = {
  'EditorProvider.vue': { ydoc: new Y.Doc() },
  'SetupError.vue': { error: new Error('Unable to initialize the editor') },
  'EmojiMenuItem.vue': {
    emoji: { emoji: '😀', label: 'Grinning face', name: 'grinning' },
    isSelected: true,
    selector: 'emoji',
  },
  'IndentButton.vue': { action: 'indent' },
  'MarkButton.vue': { type: 'bold' },
  'MentionMenuItem.vue': { item: { id: 'ada', title: 'Ada' }, isSelected: true },
  'MoveNodeButton.vue': { direction: 'up' },
  'SlashCommandTriggerButton.vue': { onTrigger: vi.fn() },
  'SlashMenuItem.vue': {
    item: { title: 'Text', description: 'Paragraph', icon: 'T' },
    isSelected: true,
  },
  'TableHandleMenuContent.vue': { state: { show: true, orientation: 'row' } },
  'TextAlignButton.vue': { align: 'left' },
  'UndoRedoButton.vue': { action: 'undo' },
  'ImageNodeView.vue': {
    decorations: [],
    deleteNode: vi.fn(),
    extension: { options: { showTitle: true, topOffset: 0, type: 'image' } },
    getPos: () => 0,
    node,
    selected: true,
    updateAttributes: vi.fn(),
  },
  'ImageUploadNodeView.vue': {
    decorations: [],
    deleteNode: vi.fn(),
    extension: {
      options: { accept: 'image/*', limit: 3, maxSize: 1024, showTitle: true, topOffset: 0 },
    },
    getPos: () => 0,
    node,
    selected: true,
    updateAttributes: vi.fn(),
  },
  'TocNodeView.vue': {
    decorations: [],
    deleteNode: vi.fn(),
    extension: { options: { topOffset: 0 } },
    getPos: () => 0,
    node,
    selected: true,
    updateAttributes: vi.fn(),
  },
}

interface CoverageScenario {
  editable: boolean
  optionalExtensions: boolean
  mobile: boolean
  dragging: boolean
  minimalProps: boolean
  tableControlsVisible: boolean
}

interface CoverageEditor {
  editor: Editor
  commandNames: string[]
  emitTableState: () => void
}

function createCoverageEditor(scenario: CoverageScenario): CoverageEditor {
  const host = document.createElement('div')
  document.body.append(host)
  editorHosts.push(host)

  const baseEditor = new Editor({
    element: host,
    content: '<p>Coverage editor</p>',
    extensions: [
      StarterKit,
      TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } }),
      TableHandleExtension,
    ],
  })
  baseEditor.setEditable(scenario.editable)
  baseEditor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
  let tableBlock: { node: import('@tiptap/pm/model').Node; pos: number } | undefined
  baseEditor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') tableBlock = { node, pos }
  })
  if (!tableBlock) throw new Error('Expected a table in the coverage editor')

  const map = TableMap.get(tableBlock.node)
  const firstCell = tableBlock.pos + 1 + map.map[0]!
  const lastCell = tableBlock.pos + 1 + map.map[map.map.length - 1]!
  baseEditor.view.dispatch(
    baseEditor.state.tr.setSelection(
      new CellSelection(
        baseEditor.state.doc.resolve(firstCell),
        baseEditor.state.doc.resolve(lastCell),
      ),
    ),
  )
  const tableDom = host.querySelector('table')
  const cellDom = host.querySelector('td')
  const tableRect = () => new DOMRect(0, 0, 240, 120)
  if (tableDom) Object.defineProperty(tableDom, 'getBoundingClientRect', { value: tableRect })
  if (cellDom) {
    Object.defineProperty(cellDom, 'getBoundingClientRect', {
      value: () => new DOMRect(0, 0, 120, 60),
    })
    cellDom.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 16, clientY: 16 }))
  }
  editors.push(baseEditor)

  const commandNames: string[] = []
  const commandChain = new Proxy(
    {},
    {
      get(_target, property) {
        return (..._args: unknown[]) => {
          commandNames.push(String(property))
          return property === 'run' ? true : commandChain
        }
      },
    },
  )
  const extensions = [
    ...baseEditor.extensionManager.extensions,
    ...[
      ...(scenario.optionalExtensions
        ? ['ai', 'emoji', 'image', 'imageUpload', 'link', 'mention', 'textAlign', 'tocNode']
        : []),
    ].map((name) => ({ name })),
  ]

  const editor = new Proxy(baseEditor, {
    get(target, property, receiver) {
      if (property === 'chain') return () => commandChain
      if (property === 'can') return () => commandChain
      if (property === 'commands') return commandChain
      if (property === 'isFocused') return !scenario.mobile
      if (property === 'extensionManager') return { ...target.extensionManager, extensions }
      if (property === 'storage') {
        return {
          ...target.storage,
          uiState: { isDragging: scenario.dragging, isMobile: scenario.mobile },
        }
      }
      return Reflect.get(target, property, receiver)
    },
  }) as Editor

  const emitTableState = () => {
    if (!tableBlock) return
    baseEditor.emit('tableHandleState', {
      show: scenario.tableControlsVisible,
      showAddOrRemoveRowsButton: scenario.tableControlsVisible,
      showAddOrRemoveColumnsButton: scenario.tableControlsVisible,
      referencePosTable: new DOMRect(0, 0, 240, 120),
      referencePosCell: new DOMRect(0, 0, 120, 60),
      block: tableBlock.node,
      blockPos: tableBlock.pos,
      widgetContainer: document.body,
      rowIndex: 0,
      colIndex: 0,
    })
  }

  return { editor, commandNames, emitTableState }
}

function propsForFile(fileName: string, minimalProps: boolean): Record<string, unknown> {
  if (!minimalProps) return propsByFile[fileName] ?? {}

  switch (fileName) {
    case 'EmojiMenuItem.vue':
      return { ...propsByFile[fileName], isSelected: false }
    case 'ImageNodeView.vue':
    case 'ImageUploadNodeView.vue':
      return { ...propsByFile[fileName], node: minimalNode, selected: false }
    case 'MentionMenuItem.vue':
    case 'SlashMenuItem.vue':
      return { ...propsByFile[fileName], isSelected: false }
    case 'TableHandleMenuContent.vue':
      return { state: { show: false, orientation: 'column' } }
    case 'TocNodeView.vue':
      return { ...propsByFile[fileName], node: minimalNode, selected: false }
    default:
      return propsByFile[fileName] ?? {}
  }
}

function mountWithProviders(component: Component, props: Record<string, unknown>, editor: Editor) {
  const ProviderBoundary = defineComponent({
    setup() {
      provideUser()
      provideCollab('coverage-room')
      provideAi()
      provideToc()
      provideTiptapEditor(shallowRef(editor))
      return () => h(component, { ...props, editor })
    },
  })

  return mount(ProviderBoundary, {
    global: {
      stubs: {
        EditorContent: { template: '<div><slot /></div>' },
        NodeViewContent: { template: '<div><slot /></div>' },
        NodeViewWrapper: { template: '<div><slot /></div>' },
        Teleport: true,
      },
    },
  })
}

async function exerciseVisibleControls(wrapper: ReturnType<typeof mount>) {
  const exercisedControls = new Set<Element>()
  const exercisedInputs = new Set<Element>()

  for (let pass = 0; pass < 3; pass++) {
    const controls = wrapper
      .findAll('button, [role="button"], a')
      .filter((control) => !exercisedControls.has(control.element))
    const inputs = wrapper
      .findAll('input, textarea')
      .filter((input) => !exercisedInputs.has(input.element))

    if (!controls.length && !inputs.length) break

    for (const control of controls) {
      exercisedControls.add(control.element)
      await control.trigger('mouseenter')
      await control.trigger('click')
      if (control.attributes('draggable') === 'true') {
        const dataTransfer = { effectAllowed: '', setDragImage: vi.fn() }
        await control.trigger('dragstart', { clientX: 24, clientY: 24, dataTransfer })
        await control.trigger('dragend')
      }
      if (control.attributes('aria-label')?.startsWith('Add or remove')) {
        await control.trigger('mousedown', { clientX: 16, clientY: 16 })
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180, clientY: 120 }))
        window.dispatchEvent(new MouseEvent('mouseup'))
      }
      await control.trigger('mouseleave')
    }

    for (const input of inputs) {
      exercisedInputs.add(input.element)
      if (input.attributes('type') !== 'file') await input.setValue('coverage value')
      await input.trigger('change')
    }
  }

  await wrapper.trigger('keydown', { key: 'Enter' })
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  while (editorHosts.length) editorHosts.pop()?.remove()
})

describe.each([
  {
    editable: true,
    optionalExtensions: true,
    mobile: false,
    dragging: false,
    minimalProps: false,
    tableControlsVisible: true,
  },
  {
    editable: false,
    optionalExtensions: true,
    mobile: false,
    dragging: false,
    minimalProps: false,
    tableControlsVisible: true,
  },
  {
    editable: true,
    optionalExtensions: false,
    mobile: true,
    dragging: true,
    minimalProps: true,
    tableControlsVisible: false,
  },
])('production component provider contracts: %o', (scenario) => {
  it.each(componentGroups)('mounts %s components', async (_groupName, entries) => {
    const { editor, emitTableState } = createCoverageEditor(scenario)

    for (const [path, component] of entries) {
      const fileName = path.split('/').pop()
      if (!fileName) throw new Error(`Expected a filename for ${path}`)

      const wrapper = mountWithProviders(
        component,
        propsForFile(fileName, scenario.minimalProps),
        editor,
      )
      expect(wrapper.exists(), fileName).toBe(true)

      emitTableState()
      await nextTick()
      await exerciseVisibleControls(wrapper)
      wrapper.unmount()
    }
  })
})

const tableCoverageScenarios: CoverageScenario[] = [
  {
    editable: true,
    optionalExtensions: true,
    mobile: false,
    dragging: false,
    minimalProps: false,
    tableControlsVisible: false,
  },
  {
    editable: true,
    optionalExtensions: true,
    mobile: false,
    dragging: true,
    minimalProps: false,
    tableControlsVisible: true,
  },
  {
    editable: false,
    optionalExtensions: false,
    mobile: true,
    dragging: false,
    minimalProps: true,
    tableControlsVisible: false,
  },
  {
    editable: true,
    optionalExtensions: false,
    mobile: false,
    dragging: false,
    minimalProps: true,
    tableControlsVisible: true,
  },
]

describe.each(tableCoverageScenarios)('table component state: %o', (scenario) => {
  it('renders and interacts with table controls for the state', async () => {
    const { editor, emitTableState } = createCoverageEditor(scenario)

    for (const [path, component] of componentGroups[1][1]) {
      const fileName = path.split('/').pop()
      if (!fileName) throw new Error(`Expected a filename for ${path}`)

      const wrapper = mountWithProviders(
        component,
        propsForFile(fileName, scenario.minimalProps),
        editor,
      )
      emitTableState()
      await nextTick()
      await exerciseVisibleControls(wrapper)
      wrapper.unmount()
    }
  })
})
