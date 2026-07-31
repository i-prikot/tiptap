import { afterEach, describe, expect, it } from 'vitest'

type LazyKatexModule = typeof import('../../../packages/editor/src/extensions/lazy-katex')

const stylesheetAttribute = 'data-tinyfy-katex-stylesheet'
const inlineMathType = { name: 'inlineMath' }
const blockMathType = { name: 'blockMath' }

async function loadLazyKatex(): Promise<LazyKatexModule> {
  return import('../../../packages/editor/src/extensions/lazy-katex')
}

function createNode(type: 'inlineMath' | 'blockMath', latex: string) {
  return {
    attrs: { latex },
    type: type === 'blockMath' ? blockMathType : inlineMathType,
  } as never
}

function createNodeView(
  lazyKatex: LazyKatexModule,
  type: 'inlineMath' | 'blockMath',
  latex: string,
  katexOptions?: object,
) {
  const renderer = lazyKatex.createLazyKatexNodeView({ type, katexOptions })

  return renderer({
    editor: { isEditable: false },
    getPos: () => 0,
    node: createNode(type, latex),
  } as never) as {
    destroy: () => void
    dom: HTMLElement
    update: (node: ReturnType<typeof createNode>) => boolean
  }
}

afterEach(() => {
  document.head.querySelector(`style[${stylesheetAttribute}]`)?.remove()
})

describe('lazy KaTeX assets', () => {
  it('shares one asset request and injects the stylesheet once', async () => {
    const lazyKatex = await loadLazyKatex()

    const firstLoad = lazyKatex.loadKatexAssets()
    const secondLoad = lazyKatex.loadKatexAssets()

    expect(secondLoad).toBe(firstLoad)
    await expect(firstLoad).resolves.toMatchObject({ render: expect.any(Function) })
    expect(document.head.querySelectorAll(`style[${stylesheetAttribute}]`)).toHaveLength(1)
  })
})

describe('lazy KaTeX node views', () => {
  it('creates a block-math node view with its loading metadata', async () => {
    const lazyKatex = await loadLazyKatex()

    expect(document.head.querySelector(`style[${stylesheetAttribute}]`)).toBeNull()

    const nodeView = createNodeView(lazyKatex, 'blockMath', 'x^2', {
      displayMode: false,
      throwOnError: false,
    })

    expect(nodeView.dom.getAttribute('aria-busy')).toBe('true')
    expect(nodeView.dom.getAttribute('data-type')).toBe('block-math')
    expect(nodeView.dom.getAttribute('data-latex')).toBe('x^2')
  })

  it('keeps node-view metadata in sync with the latest math node', async () => {
    const lazyKatex = await loadLazyKatex()
    const nodeView = createNodeView(lazyKatex, 'inlineMath', 'stale')

    expect(nodeView.update(createNode('inlineMath', 'current'))).toBe(true)

    expect(nodeView.dom.getAttribute('data-latex')).toBe('current')
  })
})
