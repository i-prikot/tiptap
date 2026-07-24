import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableHandleMenuContent from '../../../src/editor/components/table/table-handle/TableHandleMenuContent.vue'
import { provideEditorI18n } from '../../../src/editor/composables/useEditorI18n'

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

vi.mock('../../../src/editor/components/table/table-align', () => ({
  TableAlignMenu: uiStubs.TableAlignMenu,
}))

vi.mock('../../../src/editor/composables', async () => {
  const { useEditorI18n } = await import('../../../src/editor/composables/useEditorI18n')

  return {
    useEditorI18n,
    useEditorSelectionSignal: () => ref(0),
    useTiptapEditor: () => ref(mocks.editor.value),
  }
})

vi.mock('../../../src/editor/utils/table-actions', () => ({
  ADD_COLUMN_LABELS: { left: 'table.insertColumnLeft', right: 'table.insertColumnRight' },
  ADD_ROW_LABELS: { above: 'table.insertRowAbove', below: 'table.insertRowBelow' },
  CLEAR_LABELS: { row: 'table.clearRowContents', column: 'table.clearColumnContents' },
  DELETE_LABELS: { row: 'table.deleteRow', column: 'table.deleteColumn' },
  DUPLICATE_LABELS: { row: 'table.duplicateRow', column: 'table.duplicateColumn' },
  HEADER_LABELS: { row: 'table.headerRow', column: 'table.headerColumn' },
  MOVE_LABELS: {
    row: { up: 'table.moveRowUp', down: 'table.moveRowDown' },
    column: { left: 'table.moveColumnLeft', right: 'table.moveColumnRight' },
  },
  SORT_LABELS: {
    row: { asc: 'table.sortRowAscending', desc: 'table.sortRowDescending' },
    column: { asc: 'table.sortColumnAscending', desc: 'table.sortColumnDescending' },
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

type Locale = 'en' | 'ru'

interface TableLocaleCase {
  columnLabels: string[]
  locale: Locale
  rowLabels: string[]
}

const tableLocaleCases: TableLocaleCase[] = [
  {
    columnLabels: [
      'Header column',
      'Move column left',
      'Move column right',
      'Insert column left',
      'Insert column right',
      'Sort column A-Z',
      'Sort column Z-A',
      'Clear column contents',
      'Duplicate column',
      'Delete column',
    ],
    locale: 'en',
    rowLabels: [
      'Header row',
      'Move row up',
      'Move row down',
      'Insert row above',
      'Insert row below',
      'Sort row A-Z',
      'Sort row Z-A',
      'Clear row contents',
      'Duplicate row',
      'Delete row',
    ],
  },
  {
    columnLabels: [
      'Столбец заголовка',
      'Переместить столбец влево',
      'Переместить столбец вправо',
      'Вставить столбец слева',
      'Вставить столбец справа',
      'Сортировать столбец А–Я',
      'Сортировать столбец Я–А',
      'Очистить столбец',
      'Дублировать столбец',
      'Удалить столбец',
    ],
    locale: 'ru',
    rowLabels: [
      'Строка заголовка',
      'Переместить строку вверх',
      'Переместить строку вниз',
      'Вставить строку выше',
      'Вставить строку ниже',
      'Сортировать строку А–Я',
      'Сортировать строку Я–А',
      'Очистить строку',
      'Дублировать строку',
      'Удалить строку',
    ],
  },
]

const rowTableKeys = [
  'table.headerRow',
  'table.moveRowUp',
  'table.moveRowDown',
  'table.insertRowAbove',
  'table.insertRowBelow',
  'table.sortRowAscending',
  'table.sortRowDescending',
  'table.clearRowContents',
  'table.duplicateRow',
  'table.deleteRow',
]

const columnTableKeys = [
  'table.headerColumn',
  'table.moveColumnLeft',
  'table.moveColumnRight',
  'table.insertColumnLeft',
  'table.insertColumnRight',
  'table.sortColumnAscending',
  'table.sortColumnDescending',
  'table.clearColumnContents',
  'table.duplicateColumn',
  'table.deleteColumn',
]

function mountMenu(locale: Locale = 'en', index = 0, orientation: 'row' | 'column' = 'row') {
  const LocalizedTableMenuHost = defineComponent({
    name: 'LocalizedTableMenuHost',
    setup() {
      provideEditorI18n(locale, undefined)

      return () => h(TableHandleMenuContent, { index, orientation, tablePos: 7 })
    },
  })

  return mount(LocalizedTableMenuHost)
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

function expectNoRawKeys(wrapper: ReturnType<typeof mount>, keys: string[]) {
  const output = [
    wrapper.text(),
    ...wrapper.findAll('*').flatMap((item) => Object.values(item.attributes())),
  ].join('\n')

  for (const key of keys) {
    expect(output).not.toContain(key)
  }
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
  it.each(tableLocaleCases)(
    'renders localized row actions and keeps helper arguments intact for $locale',
    async ({ locale, rowLabels }) => {
      const wrapper = mountMenu(locale)
      const base = { editor: mocks.editor.value, index: 0, orientation: 'row', tablePos: 7 }

      expect(
        actionByLabel(wrapper, rowLabels[0]!).get('button').attributes('data-active-state'),
      ).toBe('on')

      for (const label of rowLabels) {
        await selectAction(wrapper, label)
      }
      expectNoRawKeys(wrapper, rowTableKeys)

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
    },
  )

  it.each(tableLocaleCases)(
    'renders localized column actions and keeps helper arguments intact for $locale',
    async ({ columnLabels, locale }) => {
      mocks.getTableSelectionType.mockReturnValue({ index: 0, orientation: 'column' })

      const wrapper = mountMenu(locale, 0, 'column')
      const base = { editor: mocks.editor.value, index: 0, orientation: 'column', tablePos: 7 }

      for (const label of columnLabels) {
        await selectAction(wrapper, label)
      }
      expectNoRawKeys(wrapper, columnTableKeys)

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
    },
  )

  it('omits unavailable groups without leaving extra separators', () => {
    mocks.canAddRowColumn.mockReturnValue(false)
    mocks.canClearRowColumnContent.mockReturnValue(false)
    mocks.canMoveRowColumn.mockReturnValue(false)
    mocks.canSortRowColumn.mockReturnValue(false)

    const wrapper = mountMenu('en', 1, 'column')

    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(2)
    expect(actionByLabel(wrapper, 'Duplicate column')).toBeDefined()
    expect(actionByLabel(wrapper, 'Delete column')).toBeDefined()
    expect(wrapper.findAll('[role="separator"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="color-menu"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="alignment-menu"]').exists()).toBe(true)
  })
})
