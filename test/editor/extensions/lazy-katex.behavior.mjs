import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

const stylesheetAttribute = 'data-tinyfy-katex-stylesheet'
const inlineMathType = { name: 'inlineMath' }

const settle = () => new Promise((resolvePromise) => setTimeout(resolvePromise, 0))

async function withLazyKatex(callback) {
  const dom = new Window()
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousHTMLElement = globalThis.HTMLElement

  Object.assign(globalThis, {
    window: dom,
    document: dom.document,
    HTMLElement: dom.HTMLElement,
  })

  const server = await createServer({
    appType: 'custom',
    configFile: false,
    root: resolve('packages/editor'),
    server: { middlewareMode: true },
    resolve: {
      alias: {
        '@i-prikot/editor-schema': resolve('packages/schema/src/index.ts'),
      },
    },
    ssr: {
      noExternal: ['katex'],
    },
    plugins: [
      {
        enforce: 'pre',
        name: 'lazy-katex-behavior-fixture',
        resolveId(id) {
          if (id === 'katex') return '\0lazy-katex-runtime'
          if (id === 'katex/dist/katex.min.css?inline') {
            return '\0lazy-katex-stylesheet'
          }
        },
        load(id) {
          if (id === '\0lazy-katex-runtime') {
            return 'export default { render(latex, target) { target.textContent = `rendered:${latex}` } }'
          }

          if (id === '\0lazy-katex-stylesheet') {
            return "export default '.katex { color: black; }'"
          }
        },
      },
    ],
    optimizeDeps: {
      noDiscovery: true,
    },
  })

  try {
    const lazyKatex = await server.ssrLoadModule('/src/extensions/lazy-katex.ts')
    await callback(lazyKatex, dom.document)
  } finally {
    await server.close()
    dom.close()
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.HTMLElement = previousHTMLElement
  }
}

test('lazy KaTeX loader memoizes assets and node views avoid stale DOM updates', async () => {
  await withLazyKatex(async (lazyKatex, document) => {
    assert.equal(document.head.querySelector(`style[${stylesheetAttribute}]`), null)

    const firstLoad = lazyKatex.loadKatexAssets()
    const secondLoad = lazyKatex.loadKatexAssets()

    assert.equal(secondLoad, firstLoad)
    await firstLoad
    assert.equal(document.head.querySelectorAll(`style[${stylesheetAttribute}]`).length, 1)

    const nodeView = lazyKatex.createLazyKatexNodeView({ type: 'inlineMath' })({
      editor: { isEditable: false },
      getPos: () => 0,
      node: { attrs: { latex: 'x^2' }, type: inlineMathType },
    })

    await settle()

    assert.equal(nodeView.dom.getAttribute('data-type'), 'inline-math')
    assert.equal(nodeView.dom.getAttribute('data-latex'), 'x^2')
    assert.equal(nodeView.dom.textContent, 'rendered:x^2')

    const staleNodeView = lazyKatex.createLazyKatexNodeView({ type: 'inlineMath' })({
      editor: { isEditable: false },
      getPos: () => 0,
      node: { attrs: { latex: 'x^3' }, type: inlineMathType },
    })

    staleNodeView.destroy()
    await settle()

    assert.equal(staleNodeView.dom.textContent, '')
  })
})
