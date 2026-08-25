import type { ValidFixture } from '../types.js'
import { createLogger } from '../../utils/logger.js'

/** Representative documents that must remain valid across package releases. */
export const validDocuments: readonly ValidFixture[] = [
  {
    key: 'common-blocks-and-marks',
    description: 'Common top-level blocks, canonical IDs and roles, and every text mark.',
    document: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            level: 1,
            id: 'hero',
            blockRole: 'pricing',
            'data-toc-id': 'toc-hero',
          },
          content: [{ type: 'text', text: 'Pricing' }],
        },
        ...([2, 3, 4, 5, 6] as const).map((level) => ({
          type: 'heading',
          attrs: { level },
          content: [{ type: 'text', text: `Heading level ${level}` }],
        })),
        {
          type: 'paragraph',
          attrs: { id: 'intro', blockRole: 'cta' },
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' italic', marks: [{ type: 'italic' }] },
            { type: 'text', text: ' underline', marks: [{ type: 'underline' }] },
            { type: 'text', text: ' strike', marks: [{ type: 'strike' }] },
            { type: 'text', text: ' code', marks: [{ type: 'code' }] },
            {
              type: 'text',
              text: ' link',
              marks: [{ type: 'link', attrs: { href: 'https://example.com/docs' } }],
            },
            {
              type: 'text',
              text: ' styled',
              marks: [{ type: 'textStyle', attrs: { color: '#123456' } }],
            },
            {
              type: 'text',
              text: ' highlighted',
              marks: [{ type: 'highlight', attrs: { color: '#ffff00' } }],
            },
            { type: 'text', text: ' sub', marks: [{ type: 'subscript' }] },
            { type: 'text', text: ' super', marks: [{ type: 'superscript' }] },
          ],
        },
        {
          type: 'blockquote',
          attrs: { id: 'quote', blockRole: 'cases' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'A quote' }] },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'A nested list item' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { id: 'code', language: 'typescript' },
          content: [{ type: 'text', text: 'const ready = true' }],
        },
        { type: 'horizontalRule' },
        { type: 'blockMath', attrs: { latex: 'x^2 + y^2' } },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Inline formula: ' },
            { type: 'inlineMath', attrs: { latex: 'E = mc^2' } },
          ],
        },
      ],
    },
  },
  {
    key: 'lists-table-and-toc',
    description: 'Bullet, ordered and nested task lists, a table, and a TOC block.',
    document: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { id: 'bullets' },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { id: 'steps', start: 2 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step' }] }],
            },
          ],
        },
        {
          type: 'taskList',
          attrs: { id: 'tasks' },
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Parent task' }] },
                {
                  type: 'taskList',
                  content: [
                    {
                      type: 'taskItem',
                      attrs: { checked: false },
                      content: [
                        { type: 'paragraph', content: [{ type: 'text', text: 'Nested task' }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'table',
          attrs: { id: 'comparison' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 2, rowspan: 1, colwidth: [160, 160] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Plans' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: {
                    colspan: 1,
                    rowspan: 1,
                    colwidth: [160],
                    nodeTextAlign: 'left',
                    nodeVerticalAlign: 'middle',
                  },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Basic' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: {
                    colspan: 1,
                    rowspan: 1,
                    colwidth: [160],
                    nodeTextAlign: 'right',
                    nodeVerticalAlign: 'bottom',
                  },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pro' }] }],
                },
              ],
            },
          ],
        },
        {
          type: 'tocNode',
          attrs: { id: 'toc', topOffset: 48, maxShowCount: 12, showTitle: true },
        },
      ],
    },
  },
  {
    key: 'images-with-host-metadata',
    description: 'Image source, LQIP, intrinsic dimensions, caption, alignment, and table nesting.',
    document: {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://cdn.example.com/hero.webp',
            lqip: 'https://cdn.example.com/hero-lqip.webp',
            alt: 'Product screenshot',
            title: 'Product',
            width: 1280,
            height: 720,
            'data-align': 'center',
            showCaption: true,
          },
          content: [{ type: 'text', text: 'The product dashboard' }],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'image',
                      attrs: {
                        src: '/media/inside-table.png',
                        lqip: '/media/inside-table-lqip.png',
                        width: 320,
                        height: 180,
                        showCaption: false,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
] as const

createLogger('SchemaContractFixtures').debug('valid fixtures loaded', {
  count: validDocuments.length,
})
