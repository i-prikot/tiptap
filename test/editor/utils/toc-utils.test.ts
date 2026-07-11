import type { Editor } from '@tiptap/core'
import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection, type Transaction } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TocItem } from '../../../src/editor/types/toc'
import {
  HIDE_FLOATING_META,
  getScrollableAncestor,
  navigateToHeading,
  normalizeHeadingDepths,
  selectNodeAndHideFloating,
} from '../../../src/editor/utils/toc-utils'

const tocItem = (overrides: Partial<TocItem> = {}): TocItem =>
  ({ level: 1, ...overrides }) as TocItem

function createRect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 0,
    height: bottom - top,
    top,
    right: 0,
    bottom,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect
}

function setRect(element: Element, top: number, bottom: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createRect(top, bottom))
}

function createEditorFixture() {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0] },
      text: { group: 'inline' },
    },
  })
  const doc = schema.node('doc', null, [schema.node('paragraph')])
  const state = EditorState.create({ doc })
  let dispatched: Transaction | undefined
  const dispatch = vi.fn((transaction: Transaction) => {
    dispatched = transaction
  })
  const editor = { state, view: { dispatch } } as unknown as Editor

  return { dispatch, editor, getDispatched: () => dispatched }
}

describe('normalizeHeadingDepths', () => {
  it('returns no depths for empty items', () => {
    expect(normalizeHeadingDepths([])).toEqual([])
  })

  it('rebases levels and maintains nesting without skipped depth holes', () => {
    expect(
      normalizeHeadingDepths([tocItem({ level: 2 }), tocItem({ level: 4 }), tocItem({ level: 2 })]),
    ).toEqual([1, 2, 1])
    expect(
      normalizeHeadingDepths([tocItem({ level: 1 }), tocItem({ level: 4 }), tocItem({ level: 6 })]),
    ).toEqual([1, 2, 3])
  })

  it('handles repeated and decreasing levels', () => {
    expect(
      normalizeHeadingDepths([
        tocItem({ level: 2 }),
        tocItem({ level: 2 }),
        tocItem({ level: 3 }),
        tocItem({ level: 2 }),
        tocItem({ level: 1 }),
      ]),
    ).toEqual([1, 1, 2, 1, 1])
  })

  it('prefers originalLevel over level', () => {
    expect(
      normalizeHeadingDepths([
        tocItem({ level: 1, originalLevel: 2 }),
        tocItem({ level: 1, originalLevel: 3 }),
      ]),
    ).toEqual([1, 2])
  })
})

describe('getScrollableAncestor', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('returns the nearest vertically scrollable ancestor', () => {
    const outer = document.createElement('div')
    const nearest = document.createElement('div')
    const heading = document.createElement('h2')
    outer.append(nearest)
    nearest.append(heading)
    document.body.append(outer)
    Object.defineProperties(nearest, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
    })
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) => ({ overflowY: element === nearest ? 'auto' : 'visible' }) as CSSStyleDeclaration,
    )

    expect(getScrollableAncestor(heading)).toBe(nearest)
  })

  it('falls back to window when no ancestor can scroll', () => {
    const parent = document.createElement('div')
    const heading = document.createElement('h2')
    parent.append(heading)
    document.body.append(parent)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      overflowY: 'hidden',
    } as CSSStyleDeclaration)

    expect(getScrollableAncestor(heading)).toBe(window)
  })
})

describe('selectNodeAndHideFloating', () => {
  it('does nothing when no editor is supplied', () => {
    expect(() => selectNodeAndHideFloating(null, 0)).not.toThrow()
  })

  it('dispatches a NodeSelection transaction with the floating-toolbar meta flag', () => {
    const { dispatch, editor, getDispatched } = createEditorFixture()

    selectNodeAndHideFloating(editor, 0)

    const dispatched = getDispatched()
    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatched?.selection).toBeInstanceOf(NodeSelection)
    expect(dispatched?.selection.from).toBe(0)
    expect(dispatched?.getMeta(HIDE_FLOATING_META)).toBe(true)
  })
})

describe('navigateToHeading', () => {
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState(null, '', '/')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does nothing when the TOC item has no DOM node', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

    navigateToHeading(tocItem({ id: 'missing' }))

    expect(scrollTo).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
  })

  it('skips scrolling for a visible heading, selects it, and updates the URL hash', () => {
    const heading = document.createElement('h2')
    document.body.append(heading)
    setRect(heading, 40, 80)
    vi.stubGlobal('innerHeight', 200)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const { dispatch, editor, getDispatched } = createEditorFixture()
    const expectedUrl = new URL(window.location.href)
    expectedUrl.hash = 'visible-heading'

    navigateToHeading(tocItem({ dom: heading, editor, id: 'visible-heading', pos: 0 }), {
      topOffset: 20,
    })

    expect(scrollTo).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledOnce()
    expect(getDispatched()?.getMeta(HIDE_FLOATING_META)).toBe(true)
    expect(replaceState).toHaveBeenCalledWith(null, '', expectedUrl.toString())
    expect(window.location.hash).toBe('#visible-heading')
  })

  it('scrolls the window to an off-screen heading with default behavior', () => {
    const heading = document.createElement('h2')
    document.body.append(heading)
    setRect(heading, 300, 340)
    vi.stubGlobal('innerHeight', 200)
    vi.stubGlobal('scrollY', 50)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      overflowY: 'visible',
    } as CSSStyleDeclaration)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

    navigateToHeading(tocItem({ dom: heading }), { topOffset: 10 })

    expect(scrollTo).toHaveBeenCalledWith({ top: 340, behavior: 'smooth' })
  })

  it('scrolls the nearest element container with custom behavior', () => {
    const container = document.createElement('div')
    const heading = document.createElement('h2')
    const scrollTo = vi.fn()
    container.append(heading)
    document.body.append(container)
    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 20 },
      scrollTo: { configurable: true, value: scrollTo },
    })
    setRect(container, 100, 200)
    setRect(heading, 400, 440)
    vi.stubGlobal('innerHeight', 200)
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({ overflowY: element === container ? 'scroll' : 'visible' }) as CSSStyleDeclaration,
    )

    navigateToHeading(tocItem({ dom: heading }), { topOffset: 15, behavior: 'auto' })

    expect(scrollTo).toHaveBeenCalledWith({ top: 305, behavior: 'auto' })
  })
})
