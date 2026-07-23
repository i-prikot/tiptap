import type { NodeViewRenderer } from '@tiptap/core'
import type { KatexOptions } from 'katex'
import type { MathematicsNodeViewOptions } from '@i-prikot/editor-schema'

type KatexRuntime = {
  render: (latex: string, element: HTMLElement, options?: KatexOptions) => void
}

let katexAssetsPromise: Promise<KatexRuntime> | undefined

const katexStylesheetAttribute = 'data-tinyfy-katex-stylesheet'

const isKatexRuntime = (value: unknown): value is KatexRuntime =>
  typeof value === 'object' &&
  value !== null &&
  'render' in value &&
  typeof value.render === 'function'

const loadKatexStylesheet = async () => {
  if (document.querySelector(`style[${katexStylesheetAttribute}]`)) {
    return
  }

  const stylesheetModule = await import('katex/dist/katex.min.css?inline')

  if (typeof stylesheetModule.default !== 'string') {
    throw new Error('KaTeX stylesheet is unavailable')
  }

  const stylesheet = document.createElement('style')
  stylesheet.setAttribute(katexStylesheetAttribute, '')
  stylesheet.textContent = stylesheetModule.default
  document.head.appendChild(stylesheet)
}

export function loadKatexAssets(): Promise<KatexRuntime> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('KaTeX assets require a browser environment'))
  }

  if (katexAssetsPromise) {
    return katexAssetsPromise
  }

  const loadingPromise = Promise.all([import('katex'), loadKatexStylesheet()]).then(
    ([katexModule]) => {
      const runtime = katexModule.default ?? katexModule

      if (!isKatexRuntime(runtime)) {
        throw new Error('KaTeX runtime is unavailable')
      }

      return runtime
    },
  )
  const retryablePromise = loadingPromise.catch((error) => {
    if (katexAssetsPromise === retryablePromise) {
      katexAssetsPromise = undefined
    }

    throw error
  })

  katexAssetsPromise = retryablePromise

  return retryablePromise
}

const getLatex = (value: unknown) => (typeof value === 'string' ? value : '')

export function createLazyKatexNodeView(options: MathematicsNodeViewOptions): NodeViewRenderer {
  return ({ editor, getPos, node }) => {
    const isBlockMath = options.type === 'blockMath'
    const wrapper = document.createElement(isBlockMath ? 'div' : 'span')
    const renderTarget = isBlockMath ? document.createElement('div') : wrapper
    let currentNode = node
    let destroyed = false
    let renderVersion = 0

    wrapper.className = 'tiptap-mathematics-render'

    if (editor.isEditable) {
      wrapper.classList.add('tiptap-mathematics-render--editable')
    }

    if (isBlockMath) {
      renderTarget.className = 'block-math-inner'
      wrapper.appendChild(renderTarget)
    }

    const syncAttributes = () => {
      wrapper.dataset.type = isBlockMath ? 'block-math' : 'inline-math'
      wrapper.setAttribute('data-latex', getLatex(currentNode.attrs.latex))
    }

    const showLoading = () => {
      renderTarget.replaceChildren()
      wrapper.classList.remove(isBlockMath ? 'block-math-error' : 'inline-math-error')
      wrapper.setAttribute('aria-busy', 'true')
      wrapper.setAttribute('aria-label', 'Loading mathematical expression')
      wrapper.setAttribute('role', 'img')
    }

    const showUnavailable = () => {
      renderTarget.replaceChildren()
      wrapper.classList.add(isBlockMath ? 'block-math-error' : 'inline-math-error')
      wrapper.removeAttribute('aria-busy')
      wrapper.setAttribute('aria-label', 'Mathematical expression is unavailable')
      wrapper.setAttribute('role', 'img')
    }

    const renderMath = () => {
      renderVersion += 1
      const version = renderVersion
      const latex = getLatex(currentNode.attrs.latex)
      const katexOptions = isBlockMath
        ? {
            ...(options.katexOptions as KatexOptions | undefined),
            displayMode: true,
          }
        : (options.katexOptions as KatexOptions | undefined)

      syncAttributes()
      showLoading()

      void loadKatexAssets()
        .then((katex) => {
          if (destroyed || version !== renderVersion) {
            return
          }

          try {
            renderTarget.replaceChildren()
            katex.render(latex, renderTarget, katexOptions)
            wrapper.classList.remove(isBlockMath ? 'block-math-error' : 'inline-math-error')
            wrapper.removeAttribute('aria-busy')
            wrapper.removeAttribute('aria-label')
            wrapper.removeAttribute('role')
          } catch {
            if (!destroyed && version === renderVersion) {
              showUnavailable()
            }
          }
        })
        .catch(() => {
          if (!destroyed && version === renderVersion) {
            showUnavailable()
          }
        })
    }

    const handleClick = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()

      const pos = getPos()

      if (typeof pos === 'number') {
        options.onClick?.(currentNode, pos)
      }
    }

    if (options.onClick) {
      wrapper.addEventListener('click', handleClick)
    }

    renderMath()

    return {
      dom: wrapper,
      update(updatedNode) {
        if (updatedNode.type !== currentNode.type) {
          return false
        }

        currentNode = updatedNode
        renderMath()

        return true
      },
      destroy() {
        destroyed = true
        renderVersion += 1
        wrapper.removeEventListener('click', handleClick)
      },
    }
  }
}
