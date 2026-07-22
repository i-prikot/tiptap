import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableHandleMenuContent from '../../../src/editor/components/table/table-handle/TableHandleMenuContent.vue'

const uiStubs = vi.hoisted(() => ({
  ColorMenu: { name: 'ColorMenu', template: '<div data-testid="color-menu" />' },
  TableAlignMenu: { name: 'TableAlignMenu', template: '<div data-testid="alignment-menu" />' },
}))

const mocks = vi.hoisted(() => ({
  addRowColumn: vi.fn(),
  canAddRowColumn: vi.fn(),
  canClearRowColumnContent: vi.fn(),
  canDeleteRowColumn: vi.fn(),
  canDuplicateRowColumn: vi.fn(),
  canMoveRowColumn: vi.fn(),
  canSortRowColumn: vi.fn(),
  canToggleHeaderRowColumn: vi.fn(),
  clearRowColumnContent: vi.fn(),
  deleteRowColumn: vi.fn(),
  duplicateRowColumn: vi.fn(),
  editor: { value: null as Record<string, unknown> | null },
  getTableSelectionType: vi.fn(),
  isClearRowColumnVisible: vi.fn(),
  isHeaderRowColumnActive: vi.fn(),
  moveRowColumn: vi.fn(),
  sortRowColumn: vi.fn(),
  toggleHeaderRowColumn: vi.fn(),
}))

vi.mock('../../../src/editor/components/ui', () => uiStubs)

vi.mock('../../../src/editor/composables', () => ({
  useEditorSelectionSignal: () => ref(0),
  useTiptapEditor: () => ref(mocks.editor.value),
}))

vi.mock('../../../src/editor/utils/table-actions', () => ({
  ADD_COLUMN_LABELS: { left: 'Insert column left', right: 'Insert column right' },
  ADD_ROW_LABELS: { above: 'Insert row above', below: 'Insert row below' },
  CLEAR_LABELS: { row: 'Clear row contents', column: 'Clear column contents' },
  DELETE_LABELS: { row: 'Delete row', column: 'Delete column' },
  DUPLICATE_LABELS: { row: 'Duplicate row', column: 'Duplicate column' },
  HEADER_LABELS: { row: 'Toggle header row', column: 'Toggle header column' },
  MOVE_LABELS: {
    row: { up: 'Move row up', down: 'Move row down' },
    column: { left: 'Move column left', right: 'Move column right' },
  },
  SORT_LABELS: {
    row: { asc: 'Sort row A-Z', desc: 'Sort row Z-A' },
    column: { asc: 'Sort column A-Z', desc: 'Sort column Z-A' },
  },
  addRowColumn: mocks.addRowColumn,
  canAddRowColumn: mocks.canAddRowColumn,
  canClearRowColumnContent: mocks.canClearRowColumnContent,
  canDeleteRowColumn: mocks.canDeleteRowColumn,
  canDuplicateRowColumn: mocks.canDuplicateRowColumn,
  canMoveRowColumn: mocks.canMoveRowColumn,
  canSortRowColumn: mocks.canSortRowColumn,
  canToggleHeaderRowColumn: mocks.canToggleHeaderRowColumn,
  clearRowColumnContent: mocks.clearRowColumnContent,
  deleteRowColumn: mocks.deleteRowColumn,
  duplicateRowColumn: mocks.duplicateRowColumn,
  isClearRowColumnVisible: mocks.isClearRowColumnVisible,
  isHeaderRowColumnActive: mocks.isHeaderRowColumnActive,
  moveRowColumn: mocks.moveRowColumn,
  sortRowColumn: mocks.sortRowColumn,
  toggleHeaderRowColumn: mocks.toggleHeaderRowColumn,
}))

vi.mock('../../../src/editor/utils/table-utils', () => ({
  getTableSelectionType: mocks.getTableSelectionType,
}))

function mountMenu(index = 0, orientation: 'row' | 'column' = 'row') {
  return mount(TableHandleMenuContent, {
    props: { index, orientation, tablePos: 7 },
  })
}

function actionByLabel(wrapper: ReturnType<typeof mount>, label: string) {
  const action = wrapper
    .findAll<HTMLElement>('[role="menuitem"]')
    .find((item) => item.text() === label)

  expect(action, `Expected ${label} action`).toBeDefined()
  if (!action) throw new Error(`Expected ${label} action`)

  return action
}

async function selectAction(wrapper: ReturnType<typeof mount>, label: string) {
  await actionByLabel(wrapper, label).trigger('click')
}

beforeEach(() => {
  mocks.editor.value = { id: 'table-editor' }

  for (const mock of [
    mocks.addRowColumn,
    mocks.canAddRowColumn,
    mocks.canClearRowColumnContent,
    mocks.canDeleteRowColumn,
    mocks.canDuplicateRowColumn,
    mocks.canMoveRowColumn,
    mocks.canSortRowColumn,
    mocks.canToggleHeaderRowColumn,
    mocks.clearRowColumnContent,
    mocks.deleteRowColumn,
    mocks.duplicateRowColumn,
    mocks.getTableSelectionType,
    mocks.isClearRowColumnVisible,
    mocks.isHeaderRowColumnActive,
    mocks.moveRowColumn,
    mocks.sortRowColumn,
    mocks.toggleHeaderRowColumn,
  ]) {
    mock.mockReset()
  }

  mocks.canAddRowColumn.mockReturnValue(true)
  mocks.canClearRowColumnContent.mockReturnValue(true)
  mocks.canDeleteRowColumn.mockReturnValue(true)
  mocks.canDuplicateRowColumn.mockReturnValue(true)
  mocks.canMoveRowColumn.mockReturnValue(true)
  mocks.canSortRowColumn.mockReturnValue(true)
  mocks.canToggleHeaderRowColumn.mockReturnValue(true)
  mocks.getTableSelectionType.mockReturnValue({ index: 0, orientation: 'row' })
  mocks.isClearRowColumnVisible.mockReturnValue(true)
  mocks.isHeaderRowColumnActive.mockReturnValue(true)
})

describe('TableHandleMenuContent', () => {
  it('keeps row menu actions and helper arguments intact', async () => {
    const wrapper = mountMenu()
    const base = { editor: mocks.editor.value, index: 0, orientation: 'row', tablePos: 7 }

    expect(
      actionByLabel(wrapper, 'Toggle header row').get('button').attributes('data-active-state'),
    ).toBe('on')

    for (const label of [
      'Toggle header row',
      'Move row up',
      'Move row down',
      'Insert row above',
      'Insert row below',
      'Sort row A-Z',
      'Sort row Z-A',
      'Clear row contents',
      'Duplicate row',
      'Delete row',
    ]) {
      await selectAction(wrapper, label)
    }

    expect(mocks.toggleHeaderRowColumn).toHaveBeenCalledWith(base)
    expect(mocks.moveRowColumn).toHaveBeenNthCalledWith(1, { ...base, direction: 'up' })
    expect(mocks.moveRowColumn).toHaveBeenNthCalledWith(2, { ...base, direction: 'down' })
    expect(mocks.addRowColumn).toHaveBeenNthCalledWith(1, { ...base, side: 'above' })
    expect(mocks.addRowColumn).toHaveBeenNthCalledWith(2, { ...base, side: 'below' })
    expect(mocks.sortRowColumn).toHaveBeenNthCalledWith(1, { ...base, direction: 'asc' })
    expect(mocks.sortRowColumn).toHaveBeenNthCalledWith(2, { ...base, direction: 'desc' })
    expect(mocks.clearRowColumnContent).toHaveBeenCalledWith({ ...base, resetAttrs: true })
    expect(mocks.duplicateRowColumn).toHaveBeenCalledWith(base)
    expect(mocks.deleteRowColumn).toHaveBeenCalledWith(base)
  })

  it('keeps column menu actions and helper arguments intact', async () => {
    mocks.getTableSelectionType.mockReturnValue({ index: 0, orientation: 'column' })

    const wrapper = mountMenu(0, 'column')
    const base = { editor: mocks.editor.value, index: 0, orientation: 'column', tablePos: 7 }

    for (const label of [
      'Toggle header column',
      'Move column left',
      'Move column right',
      'Insert column left',
      'Insert column right',
      'Sort column A-Z',
      'Sort column Z-A',
      'Clear column contents',
      'Duplicate column',
      'Delete column',
    ]) {
      await selectAction(wrapper, label)
    }

    expect(mocks.toggleHeaderRowColumn).toHaveBeenCalledWith(base)
    expect(mocks.moveRowColumn).toHaveBeenNthCalledWith(1, { ...base, direction: 'left' })
    expect(mocks.moveRowColumn).toHaveBeenNthCalledWith(2, { ...base, direction: 'right' })
    expect(mocks.addRowColumn).toHaveBeenNthCalledWith(1, { ...base, side: 'left' })
    expect(mocks.addRowColumn).toHaveBeenNthCalledWith(2, { ...base, side: 'right' })
    expect(mocks.sortRowColumn).toHaveBeenNthCalledWith(1, { ...base, direction: 'asc' })
    expect(mocks.sortRowColumn).toHaveBeenNthCalledWith(2, { ...base, direction: 'desc' })
    expect(mocks.clearRowColumnContent).toHaveBeenCalledWith({ ...base, resetAttrs: true })
    expect(mocks.duplicateRowColumn).toHaveBeenCalledWith(base)
    expect(mocks.deleteRowColumn).toHaveBeenCalledWith(base)
  })

  it('omits unavailable groups without leaving extra separators', () => {
    mocks.canAddRowColumn.mockReturnValue(false)
    mocks.canClearRowColumnContent.mockReturnValue(false)
    mocks.canMoveRowColumn.mockReturnValue(false)
    mocks.canSortRowColumn.mockReturnValue(false)

    const wrapper = mountMenu(1, 'column')

    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(2)
    expect(actionByLabel(wrapper, 'Duplicate column')).toBeDefined()
    expect(actionByLabel(wrapper, 'Delete column')).toBeDefined()
    expect(wrapper.findAll('[role="separator"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="color-menu"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="alignment-menu"]').exists()).toBe(true)
  })
})
