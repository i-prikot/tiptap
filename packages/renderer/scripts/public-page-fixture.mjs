const text = (value, marks) =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }

const paragraph = (content) => ({ type: 'paragraph', content })

const listItem = (content) => ({ type: 'listItem', content: [paragraph([text(content)])] })

const taskItem = (checked, content) => ({
  type: 'taskItem',
  attrs: { checked },
  content: [paragraph([text(content)])],
})

export const publicPageFixtures = Object.freeze([
  {
    key: 'reader-basics',
    document: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'reader-basics', level: 1 },
          content: [text('Public reader payload')],
        },
        paragraph([
          text('Static '),
          text('bold', [{ type: 'bold' }]),
          text(', '),
          text('italic', [{ type: 'italic' }]),
          text(', '),
          text('code', [{ type: 'code' }]),
          text(', and '),
          text('a link', [{ type: 'link', attrs: { href: 'https://example.test/reader' } }]),
          text('.'),
        ]),
        {
          type: 'bulletList',
          content: [
            listItem('Parent item'),
            {
              type: 'listItem',
              content: [
                paragraph([text('Nested items')]),
                {
                  type: 'orderedList',
                  content: [listItem('First nested item'), listItem('Second nested item')],
                },
              ],
            },
          ],
        },
        {
          type: 'taskList',
          content: [taskItem(true, 'Published task'), taskItem(false, 'Pending task')],
        },
        {
          type: 'blockquote',
          content: [paragraph([text('A semantic quotation remains readable without JavaScript.')])],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [text('const payload = "static"\nconsole.log(payload)')],
        },
        {
          type: 'image',
          attrs: {
            alt: 'Reader fixture illustration',
            height: 360,
            showCaption: true,
            src: 'https://assets.example.test/public-reader.png',
            title: 'Reader fixture image',
            width: 640,
          },
          content: [text('A responsive static image')],
        },
        {
          type: 'table',
          attrs: { id: 'reader-table' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { align: 'left', colspan: 1, colwidth: [200], rowspan: 1 },
                  content: [paragraph([text('Metric')])],
                },
                {
                  type: 'tableHeader',
                  attrs: { align: 'right', colspan: 1, colwidth: [120], rowspan: 1 },
                  content: [paragraph([text('Value')])],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { align: 'left', colspan: 1, colwidth: [200], rowspan: 1 },
                  content: [paragraph([text('Delivery')])],
                },
                {
                  type: 'tableCell',
                  attrs: { align: 'right', colspan: 1, colwidth: [120], rowspan: 1 },
                  content: [paragraph([text('Static HTML')])],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'reader-math',
    usesKatex: true,
    document: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'reader-math', level: 2 },
          content: [text('Math-only supplemental CSS')],
        },
        paragraph([
          text('Inline math keeps its MathML fallback: '),
          { type: 'inlineMath', attrs: { latex: 'E = mc^2' } },
          text('.'),
        ]),
        { type: 'blockMath', attrs: { latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' } },
      ],
    },
  },
])

export const publicPageShell = (content, { usesKatex = false } = {}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="@i-prikot/editor-renderer/styles.css">
${usesKatex ? '    <link rel="stylesheet" href="@i-prikot/editor-renderer/katex.css">\n' : ''}  </head>
  <body>
    <main>
      <article class="tinyfy-public-document">${content}</article>
    </main>
  </body>
</html>`
