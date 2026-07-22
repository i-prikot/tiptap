import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableHandle from '../../../src/editor/components/table/table-handle/TableHandle.vue'

const stubs = vi.hoisted(() => ({
  TableHandleControl: {
    name: 'TableHandleControl',
    props: {
      dragging: { required: true, type: Boolean },
      index: { required: false, type: Number },
      open: { required: true, type: Boolean },
      orientation: { required: true, type: String },
      tablePos: { required: true, type: Number },
    },
    emits: ['open-change', 'drag-start', 'drag-end'],
    template: `
      <button
        :data-dragging="dragging"
        :data-open="open"
        :data-orientation="orientation"
        type="button"
      />
    `,
  },
}))

const mocks = vi.hoisted(() => ({
  colDragStart: vi.fn(),
  dragEnd: vi.fn(),
  editor: { value: null as Record<string, unknown> | null },
  isValidPosition: vi.fn(),
  rowDragStart: vi.fn(),
  selectCellsByCoords: vi.fn(),
  state: { value: null as Record<string, unknown> | null },
  tableMapGet: vi.fn(),
}))

vi.mock('../../../src/editor/components/table/table-handle/TableHandleControl.vue', () => ({
  default: stubs.TableHandleControl,
}))

vi.mock('../../../src/editor/composables', () => ({
  useTableHandlePosition: () => ({ floatingRef: ref(null), style: ref({}) }),
  useTableHandleState: () => ref(mocks.state.value),
  useTiptapEditor: () => ref(mocks.editor.value),
}))

vi.mock('../../../src/editor/extensions/table-handle', () => ({
  colDragStart: mocks.colDragStart,
  dragEnd: mocks.dragEnd,
  rowDragStart: mocks.rowDragStart,
}))

vi.mock('../../../src/editor/utils/table-utils', () => ({
  selectCellsByCoords: mocks.selectCellsByCoords,
}))

vi.mock('../../../src/editor/utils/tiptap-utils', () => ({
  isValidPosition: mocks.isValidPosition,
}))

vi.mock('@tiptap/pm/tables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/pm/tables')>()
  return { ...actual, TableMap: { ...actual.TableMap, get: mocks.tableMapGet } }
})

function createEditor() {
  return {
    commands: {
      freezeHandles: vi.fn(),
      unfreezeHandles: vi.fn(),
    },
    view: { dispatch: vi.fn() },
  }
}

function mountHandle() {
  return mount(TableHandle, { global: { stubs: { Teleport: false } } })
}

function controlByOrientation(wrapper: ReturnType<typeof mount>, orientation: 'row' | 'column') {
  const control = wrapper
    .findAllComponents(stubs.TableHandleControl)
    .find((component) => component.props('orientation') === orientation)

  expect(control, `Expected ${orientation} table handle`).toBeDefined()
  if (!control) throw new Error(`Expected ${orientation} table handle`)

  return control
}

beforeEach(() => {
  const editor = createEditor()
  mocks.editor.value = editor
  mocks.state.value = {
    block: {},
    blockPos: 7,
    colIndex: 2,
    draggingState: null,
    referencePosCell: new DOMRect(0, 0, 120, 60),
    referencePosTable: new DOMRect(0, 0, 240, 120),
    rowIndex: 1,
    show: true,
    widgetContainer: document.body,
  }

  mocks.colDragStart.mockReset()
  mocks.dragEnd.mockReset()
  mocks.isValidPosition.mockReset()
  mocks.rowDragStart.mockReset()
  mocks.selectCellsByCoords.mockReset()
  mocks.tableMapGet.mockReset()
  mocks.isValidPosition.mockReturnValue(true)
  mocks.tableMapGet.mockReturnValue({ height: 2, width: 3 })
})

describe('TableHandle', () => {
  it('selects and freezes a row while keeping only its control open', async () => {
    const wrapper = mountHandle()
    const rowControl = controlByOrientation(wrapper, 'row')
    const editor = mocks.editor.value as ReturnType<typeof createEditor>

    rowControl.vm.$emit('open-change', true)
    await nextTick()

    expect(editor.commands.freezeHandles).toHaveBeenCalledOnce()
    expect(mocks.selectCellsByCoords).toHaveBeenCalledWith(
      editor,
      7,
      [
        { row: 1, col: 0 },
        { row: 1, col: 2 },
      ],
      expect.objectContaining({ mode: 'dispatch', dispatch: expect.any(Function) }),
    )
    expect(controlByOrientation(wrapper, 'row').props('open')).toBe(true)
    expect(wrapper.findAllComponents(stubs.TableHandleControl)).toHaveLength(1)

    controlByOrientation(wrapper, 'row').vm.$emit('open-change', false)
    await nextTick()

    expect(editor.commands.unfreezeHandles).toHaveBeenCalledOnce()
    expect(wrapper.findAllComponents(stubs.TableHandleControl)).toHaveLength(2)
  })

  it('selects the complete column when its control opens', async () => {
    const wrapper = mountHandle()
    const columnControl = controlByOrientation(wrapper, 'column')
    const editor = mocks.editor.value as ReturnType<typeof createEditor>

    columnControl.vm.$emit('open-change', true)
    await nextTick()

    expect(mocks.selectCellsByCoords).toHaveBeenCalledWith(
      editor,
      7,
      [
        { row: 0, col: 2 },
        { row: 1, col: 2 },
      ],
      expect.objectContaining({ mode: 'dispatch', dispatch: expect.any(Function) }),
    )
    expect(controlByOrientation(wrapper, 'column').props('open')).toBe(true)
    expect(wrapper.findAllComponents(stubs.TableHandleControl)).toHaveLength(1)
  })
})
