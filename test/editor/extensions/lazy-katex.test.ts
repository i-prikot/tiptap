import { afterEach, describe, expect, it, vi } from 'vitest'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

type KatexRenderCall = {
  latex: string
  options: unknown
}

type LazyKatexModule = typeof import('../../../packages/editor/src/extensions/lazy-katex')

const stylesheetAttribute = 'data-tinyfy-katex-stylesheet'
const inlineMathType = { name: 'inlineMath' }
const blockMathType = { name: 'blockMath' }

let stylesheetText = '.katex { color: black; }'
let katexRuntime = createKatexRuntime()

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function createKatexRuntime() {
  const calls: KatexRenderCall[] = []

  return {
    calls,
    render: vi.fn((latex: string, target: HTMLElement, options?: unknown) => {
      calls.push({ latex, options })
      target.textContent = `rendered:${latex}`
    }),
  }
}

async function loadLazyKatex({
  katexImport,
}: {
  katexImport?: Promise<{ default: typeof katexRuntime }>
} = {}): Promise<LazyKatexModule> {
  vi.resetModules()
  vi.doMock('katex', () => katexImport ?? { default: katexRuntime })
  vi.doMock('katex/dist/katex.min.css?inline', () => ({
    get default() {
      return stylesheetText
    },
  }))

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

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  document.head.querySelector(`style[${stylesheetAttribute}]`)?.remove()
  stylesheetText = '.katex { color: black; }'
  katexRuntime = createKatexRuntime()
  vi.doUnmock('katex')
  vi.doUnmock('katex/dist/katex.min.css?inline')
  vi.restoreAllMocks()
})

describe('lazy KaTeX assets', () => {
  it('shares one asset request, injects the stylesheet once, and retries after a failed stylesheet load', async () => {
    const lazyKatex = await loadLazyKatex()

    const firstLoad = lazyKatex.loadKatexAssets()
    const secondLoad = lazyKatex.loadKatexAssets()

    expect(secondLoad).toBe(firstLoad)
    await expect(firstLoad).resolves.toBe(katexRuntime)
    expect(document.head.querySelectorAll(`style[${stylesheetAttribute}]`)).toHaveLength(1)

    stylesheetText = ''
    const failedLazyKatex = await loadLazyKatex()

    await expect(failedLazyKatex.loadKatexAssets()).rejects.toThrow(
      'KaTeX stylesheet is unavailable',
    )

    stylesheetText = '.katex { color: blue; }'
    await expect(failedLazyKatex.loadKatexAssets()).resolves.toBe(katexRuntime)
    expect(document.head.querySelectorAll(`style[${stylesheetAttribute}]`)).toHaveLength(1)
  })
})

describe('lazy KaTeX node views', () => {
  it('renders a math node after a formula-free startup and preserves block display options', async () => {
    const lazyKatex = await loadLazyKatex()

    expect(document.head.querySelector(`style[${stylesheetAttribute}]`)).toBeNull()

    const nodeView = createNodeView(lazyKatex, 'blockMath', 'x^2', {
      displayMode: false,
      throwOnError: false,
    })

    expect(nodeView.dom).toHaveAttribute('aria-busy', 'true')
    expect(nodeView.dom).toHaveAttribute('data-type', 'block-math')
    expect(nodeView.dom).toHaveAttribute('data-latex', 'x^2')

    await flushPromises()

    expect(katexRuntime.render).toHaveBeenCalledOnce()
    expect(katexRuntime.calls).toEqual([
      {
        latex: 'x^2',
        options: { displayMode: true, throwOnError: false },
      },
    ])
    expect(nodeView.dom).not.toHaveAttribute('aria-busy')
    expect(nodeView.dom.textContent).toBe('rendered:x^2')
  })

  it('renders only the newest math node when the shared asset load resolves late', async () => {
    const deferredRuntime = createDeferred<{ default: typeof katexRuntime }>()
    const lazyKatex = await loadLazyKatex({ katexImport: deferredRuntime.promise })
    const nodeView = createNodeView(lazyKatex, 'inlineMath', 'stale')

    expect(nodeView.update(createNode('inlineMath', 'current'))).toBe(true)

    deferredRuntime.resolve({ default: katexRuntime })
    await flushPromises()

    expect(katexRuntime.calls).toEqual([{ latex: 'current', options: undefined }])
    expect(nodeView.dom).toHaveAttribute('data-latex', 'current')
    expect(nodeView.dom.textContent).toBe('rendered:current')
  })
})
