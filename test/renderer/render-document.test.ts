// @vitest-environment node

import type { JSONContent } from '@i-prikot/editor-schema'
import { describe, expect, it } from 'vitest'
import { editorOnlyDocument, representativeDocuments } from './fixtures/representative-documents'
import { renderDocument } from '../../packages/renderer/src/index'

describe('renderDocument', () => {
  it('renders without browser globals', () => {
    expect(globalThis.window).toBeUndefined()
  })

  for (const fixture of representativeDocuments) {
    it(`renders ${fixture.key} deterministically`, () => {
      const firstRender = renderDocument(fixture.document)
      const secondRender = renderDocument(fixture.document)

      expect(secondRender, `${fixture.key} must produce identical HTML on repeated rendering`).toBe(
        firstRender,
      )
      expect(firstRender).toMatchSnapshot(fixture.key)
    })
  }

  it('omits tocNode and imageUpload editor-only nodes', () => {
    const html = renderDocument(editorOnlyDocument)

    expect(html).not.toContain('data-type="tocNode"')
    expect(html).not.toContain('data-type="imageUpload"')
    expect(html).not.toContain('table-of-contents')
    expect(html).not.toContain('pending-upload.png')
  })

  it('propagates errors for unsupported JSON nodes', () => {
    const unsupportedDocument = {
      type: 'doc',
      content: [{ type: 'unsupportedNode' }],
    } as JSONContent

    expect(() => renderDocument(unsupportedDocument)).toThrow(/unknown node type/i)
  })

  it('omits unsafe values from serialized style attributes', () => {
    const maliciousStyleDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            backgroundColor: 'red; background-image: url(https://attacker.example/pixel)',
            textAlign: 'left; background-image: url(https://attacker.example/pixel)',
            nodeTextAlign: 'left; background-image: url(https://attacker.example/pixel)',
            nodeVerticalAlign: 'top; background-image: url(https://attacker.example/pixel)',
            indent: '1; background-image: url(https://attacker.example/pixel)',
          },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'textStyle',
                  attrs: { color: 'red; background-image: url(https://attacker.example/pixel)' },
                },
                {
                  type: 'highlight',
                  attrs: { color: 'red; background-image: url(https://attacker.example/pixel)' },
                },
              ],
              text: 'Untrusted style value',
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { backgroundColor: 'var(--tt-color-highlight-yellow)' },
          content: [{ type: 'text', text: 'Allowed style value' }],
        },
      ],
    } satisfies JSONContent

    const html = renderDocument(maliciousStyleDocument)

    expect(html).not.toContain('attacker.example')
    expect(html).not.toContain('background-image')
    expect(html).toContain('background-color: var(--tt-color-highlight-yellow)')
  })
})
