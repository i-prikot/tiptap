import type { JSONContent } from '@i-prikot/editor-schema'

export interface RendererFixture {
  readonly key: string
  readonly document: JSONContent
}

export const representativeDocuments: readonly RendererFixture[] = Object.freeze([
  {
    key: 'paragraph-and-marks',
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            id: 'paragraph-marks',
            backgroundColor: 'var(--tt-color-highlight-yellow)',
            textAlign: 'center',
            nodeTextAlign: 'right',
            nodeVerticalAlign: 'middle',
            indent: 2,
          },
          content: [
            { type: 'text', text: 'Plain ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'strike' }], text: 'struck' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'code' }], text: 'code' },
            { type: 'text', text: ', ' },
            {
              type: 'text',
              marks: [
                { type: 'link', attrs: { href: 'https://example.test/docs', target: '_blank' } },
              ],
              text: 'link',
            },
            { type: 'text', text: ', ' },
            {
              type: 'text',
              marks: [{ type: 'textStyle', attrs: { color: '#2563eb' } }],
              text: 'color',
            },
            { type: 'text', text: ', ' },
            {
              type: 'text',
              marks: [{ type: 'highlight', attrs: { color: '#fde047' } }],
              text: 'highlight',
            },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'subscript' }], text: 'subscript' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'superscript' }], text: 'superscript' },
            { type: 'hardBreak' },
            { type: 'text', text: 'After break' },
          ],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'heading-levels',
    document: {
      type: 'doc',
      content: [1, 2, 3, 4, 5, 6].map((level) => ({
        type: 'heading',
        attrs: { id: `heading-${level}`, level },
        content: [{ type: 'text', text: `Heading ${level}` }],
      })),
    } satisfies JSONContent,
  },
  {
    key: 'blockquote-and-code-block',
    document: {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          attrs: { id: 'blockquote-example', backgroundColor: '#f3f4f6' },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A quoted paragraph.' }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { id: 'code-block-example', language: 'ts' },
          content: [{ type: 'text', text: 'const answer = 42\n' }],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'bullet-and-ordered-lists',
    document: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { id: 'bullet-list-example' },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Bullet item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { id: 'ordered-list-example', start: 3 },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Ordered item' }],
                },
              ],
            },
          ],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'task-list',
    document: {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          attrs: { id: 'task-list-example' },
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Completed task' }],
                },
              ],
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Pending task' }],
                },
              ],
            },
          ],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'horizontal-rule-and-image',
    document: {
      type: 'doc',
      content: [
        { type: 'horizontalRule' },
        {
          type: 'image',
          attrs: {
            alt: 'Renderer fixture image',
            height: 240,
            showCaption: true,
            src: 'https://assets.example.test/renderer-fixture.png',
            title: 'Static image title',
            width: 320,
            'data-align': 'center',
          },
          content: [{ type: 'text', text: 'Static image caption' }],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'table-with-attributes',
    document: {
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { id: 'table-example' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: {
                    align: 'center',
                    backgroundColor: '#e0f2fe',
                    colspan: 1,
                    colwidth: [180],
                    indent: 1,
                    nodeTextAlign: 'center',
                    nodeVerticalAlign: 'middle',
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Header' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  attrs: {
                    align: 'right',
                    backgroundColor: '#fef3c7',
                    colspan: 1,
                    colwidth: [160],
                    indent: 2,
                    nodeTextAlign: 'right',
                    nodeVerticalAlign: 'bottom',
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Cell' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'mention-and-emoji',
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', attrs: { id: 'user-42', label: 'Ada Lovelace' } },
            { type: 'text', text: ' ' },
            { type: 'emoji', attrs: { name: 'smile' } },
          ],
        },
      ],
    } satisfies JSONContent,
  },
  {
    key: 'inline-and-block-mathematics',
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Inline ' },
            { type: 'inlineMath', attrs: { latex: 'x^2 + y^2' } },
            { type: 'text', text: ' formula.' },
          ],
        },
        { type: 'blockMath', attrs: { latex: '\\frac{1}{2}' } },
      ],
    } satisfies JSONContent,
  },
])

export const editorOnlyDocument = {
  type: 'doc',
  content: [
    {
      type: 'tocNode',
      attrs: { id: 'table-of-contents', level: 2 },
    },
    {
      type: 'imageUpload',
      attrs: {
        id: 'image-upload-placeholder',
        src: 'https://assets.example.test/pending-upload.png',
      },
    },
  ],
} satisfies JSONContent
