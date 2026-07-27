import type { JSONContent } from '@tiptap/core'

export const navigationAndChecklistContent: JSONContent[] = [
  {
    type: 'heading',
    attrs: {
      id: '6a90ecef-245d-4f75-9846-4fb16bb606ba',
      textAlign: null,
      backgroundColor: null,
      nodeTextAlign: null,
      nodeVerticalAlign: null,
      'data-toc-id': '6a90ecef-245d-4f75-9846-4fb16bb606ba',
      level: 2,
    },
    content: [
      {
        type: 'text',
        text: 'Table of Content',
      },
    ],
  },
  {
    type: 'tocNode',
    attrs: {
      id: '6efde07c-6858-45ac-8120-a01a77734907',
      backgroundColor: null,
      topOffset: null,
      maxShowCount: null,
      showTitle: true,
    },
  },
  {
    type: 'heading',
    attrs: {
      id: 'bf962ab5-f0a0-43f7-8473-de72f4a2b8ae',
      textAlign: null,
      backgroundColor: null,
      nodeTextAlign: null,
      nodeVerticalAlign: null,
      'data-toc-id': 'bf962ab5-f0a0-43f7-8473-de72f4a2b8ae',
      level: 2,
    },
    content: [
      {
        type: 'text',
        text: 'Checklist',
      },
    ],
  },
  {
    type: 'taskList',
    attrs: {
      id: '6e80de5f-0bc2-4b2e-81db-8a1c0b4d7dbd',
      backgroundColor: null,
    },
    content: [
      {
        type: 'taskItem',
        attrs: {
          checked: true,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: '9aa558bd-c8d2-4f38-a574-13505e158fe5',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Read up to this point',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'd9b7734a-4b28-4903-9f44-262450bb142d',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Try a slash command',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: '5cceb712-6cb7-4e26-a768-8fb28637b098',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Mention someone',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: '0e2cb9e4-0de9-47d0-8cba-084f8b0d7123',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Use the floating toolbar',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'd27c6c12-83db-41f6-bd1b-fa2e1a9bdc28',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Add a color highlight',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'e15353be-84c3-4922-9165-a74caf7daef1',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Explore the context menu & drag blocks',
              },
            ],
          },
        ],
      },
      {
        type: 'taskItem',
        attrs: {
          checked: false,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              id: 'e93482bb-0082-45e3-ba16-5e07fec3344f',
              textAlign: null,
              backgroundColor: null,
              nodeTextAlign: null,
              nodeVerticalAlign: null,
            },
            content: [
              {
                type: 'text',
                text: 'Ask the AI for help',
              },
            ],
          },
        ],
      },
    ],
  },
]
