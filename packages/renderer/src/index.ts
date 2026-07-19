import { createRendererExtensionKit, type JSONContent } from '@i-prikot/editor-schema'
import { generateHTML } from '@tiptap/html'
import { Window } from 'happy-dom'
import katex from 'katex'

const cssNamedColorPattern = /^[a-z]+$/i
const cssHexColorPattern = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
const cssColorVariablePattern = /^var\(--tt-[a-z\d-]+\)$/i
const cssRgbColorPattern =
  /^rgba?\(\s*\d+(?:\.\d+)?%?\s*,\s*\d+(?:\.\d+)?%?\s*,\s*\d+(?:\.\d+)?%?(?:\s*,\s*(?:0|1|0?\.\d+|\d+(?:\.\d+)?%))?\s*\)$/i
const cssHslColorPattern =
  /^hsla?\(\s*\d+(?:\.\d+)?(?:deg|grad|rad|turn)?\s*,\s*\d+(?:\.\d+)?%\s*,\s*\d+(?:\.\d+)?%(?:\s*,\s*(?:0|1|0?\.\d+|\d+(?:\.\d+)?%))?\s*\)$/i
const textAlignments = new Set(['left', 'center', 'right', 'justify'])
const tableAlignments = new Set(['left', 'center', 'right'])
const verticalAlignments = new Set(['top', 'middle', 'bottom'])
const editorOnlyNodeTypes = new Set(['tocNode', 'imageUpload'])
const mathNodeTypes = new Set(['inlineMath', 'blockMath'])

type JSONMark = NonNullable<JSONContent['marks']>[number]

function isAllowedCssColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (cssNamedColorPattern.test(value) ||
      cssHexColorPattern.test(value) ||
      cssColorVariablePattern.test(value) ||
      cssRgbColorPattern.test(value) ||
      cssHslColorPattern.test(value))
  )
}

function sanitizeNodeAttributes(node: JSONContent): JSONContent['attrs'] {
  if (!node.attrs || typeof node.attrs !== 'object' || Array.isArray(node.attrs)) return node.attrs

  const attributes = { ...node.attrs }
  delete attributes.style

  if (!isAllowedCssColor(attributes.backgroundColor)) delete attributes.backgroundColor
  if (!textAlignments.has(attributes.textAlign)) delete attributes.textAlign
  if (!textAlignments.has(attributes.nodeTextAlign)) delete attributes.nodeTextAlign
  if (!verticalAlignments.has(attributes.nodeVerticalAlign)) delete attributes.nodeVerticalAlign
  if (
    (node.type === 'tableCell' || node.type === 'tableHeader') &&
    !tableAlignments.has(attributes.align)
  ) {
    delete attributes.align
  }

  if (attributes.indent != null) {
    if (typeof attributes.indent === 'number' && Number.isInteger(attributes.indent)) {
      attributes.indent = Math.min(Math.max(attributes.indent, 0), 8)
    } else {
      delete attributes.indent
    }
  }

  return attributes
}

function sanitizeMark(mark: JSONMark): JSONMark {
  if ((mark.type !== 'textStyle' && mark.type !== 'highlight') || !mark.attrs) return mark

  const attributes = { ...mark.attrs }
  delete attributes.style
  if (!isAllowedCssColor(attributes.color)) delete attributes.color

  return { ...mark, attrs: attributes }
}

function disableGeneratedTaskCheckboxes(html: string): string {
  return html.replace(/<input\b(?=[^>]*\btype="checkbox")[^>]*>/g, (inputMarkup) => {
    if (/\bdisabled(?:\s|=|>)/i.test(inputMarkup)) return inputMarkup

    return `${inputMarkup.slice(0, -1)} disabled>`
  })
}

function assertValidMathNodes(node: JSONContent, path = 'document'): void {
  if (node.type && mathNodeTypes.has(node.type) && typeof node.attrs?.latex !== 'string') {
    throw new Error(`Invalid ${node.type} node at ${path}: attrs.latex must be a string`)
  }

  node.content?.forEach((child, index) => {
    assertValidMathNodes(child, `${path}.content[${index}]`)
  })
}

function renderMathPlaceholders(html: string): string {
  const window = new Window()

  try {
    const document = window.document
    document.body.innerHTML = html

    for (const placeholder of document.body.querySelectorAll(
      '[data-type="inline-math"], [data-type="block-math"]',
    )) {
      const type = placeholder.getAttribute('data-type')
      const latex = placeholder.getAttribute('data-latex')

      if (latex === null) {
        throw new Error(
          `Invalid ${type === 'block-math' ? 'blockMath' : 'inlineMath'} placeholder: data-latex is missing`,
        )
      }

      placeholder.innerHTML = katex.renderToString(latex, {
        displayMode: type === 'block-math',
        output: 'htmlAndMathml',
        throwOnError: false,
        trust: false,
      })
    }

    return document.body.innerHTML
  } finally {
    window.close()
  }
}

function normalizePublishableDocument(content: JSONContent): JSONContent | null {
  if (content.type && editorOnlyNodeTypes.has(content.type)) return null

  return {
    ...content,
    attrs: sanitizeNodeAttributes(content),
    marks: content.marks?.map(sanitizeMark),
    content: content.content
      ?.map(normalizePublishableDocument)
      .filter((child): child is JSONContent => child !== null),
  }
}

export function renderDocument(json: JSONContent): string {
  assertValidMathNodes(json)
  const document = normalizePublishableDocument(json)
  const html = generateHTML(document ?? json, createRendererExtensionKit())
  return disableGeneratedTaskCheckboxes(renderMathPlaceholders(html))
}
