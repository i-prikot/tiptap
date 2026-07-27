import type { JSONContent } from '@tiptap/core'

export const customizationContent: JSONContent[] = [
  {
    type: 'bulletList',
    attrs: {
      id: 'a13c0ca7-0402-40b1-ab87-f87a649a1edf',
      backgroundColor: null,
    },
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'de2491d7-c6a1-4283-94b1-cd2a8c0d81f1',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                  },
                ],
                text: 'Select text',
              },
              {
                type: 'text',
                text: ' to reveal a floating toolbar: ',
              },
              {
                type: 'hardBreak',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                ],
                text: 'Quickly italicize, ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'textStyle',
                    attrs: {
                      color: 'var(--tt-color-text-blue)',
                    },
                  },
                  {
                    type: 'italic',
                  },
                ],
                text: 'color',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                ],
                text: ', add ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'https://tiptap.dev/docs/ui-components/getting-started/overview',
                      target: '_blank',
                      rel: 'noopener noreferrer nofollow',
                      class: null,
                    },
                  },
                  {
                    type: 'italic',
                  },
                ],
                text: 'links',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                ],
                text: ', or ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                  {
                    type: 'highlight',
                    attrs: {
                      color: 'var(--tt-color-highlight-green)',
                    },
                  },
                ],
                text: 'highlight text',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                ],
                text: " just as you're used to..",
              },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: '10d47502-caac-4074-99e5-717d56b6c056',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                  },
                ],
                text: 'Hover near any block',
              },
              {
                type: 'text',
                text: ' to reveal the context handle ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'code',
                  },
                ],
                text: '⠿',
              },
              {
                type: 'hardBreak',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                  },
                ],
                text: 'Click to open the context menu (duplicate, delete, reset formatting, and more) or simply drag to move your content anywhere you like!',
              },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'c69fb59a-c96f-4a98-96e5-9d8fc1fbbc20',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Mention teammates with ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'code',
                  },
                ],
                text: '@',
              },
              {
                type: 'text',
                text: ' and add some fun with emoji ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'code',
                  },
                ],
                text: ':',
              },
              {
                type: 'text',
                text: '  ',
              },
              {
                type: 'emoji',
                attrs: {
                  name: 'hooray',
                },
              },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'ddd83b89-a2e4-481a-ab94-20583b471eee',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Switch between ',
              },
              {
                type: 'emoji',
                attrs: {
                  name: 'sun',
                },
              },
              {
                type: 'text',
                text: ' light and ',
              },
              {
                type: 'emoji',
                attrs: {
                  name: 'new_moon',
                },
              },
              {
                type: 'text',
                text: ' dark mode – whatever fits your mood.',
              },
            ],
          },
        ],
      },
    ],
  },
]
