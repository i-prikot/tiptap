import type { EditorTranslationMenusMessages } from '../types'

export const menus = {
  groups: {
    ai: 'AI',
    style: 'Style',
    insert: 'Insert',
    upload: 'Upload',
  },
  slash: {
    continueWriting: {
      title: 'Continue Writing',
      description: 'Continue writing from the current position',
      keywords: 'continue|write|continue writing|ai',
    },
    askAi: {
      title: 'Ask AI',
      description: 'Ask AI to generate content',
      keywords: 'ai|ask|generate',
    },
    text: { title: 'Text', description: 'Regular text paragraph', keywords: 'p|paragraph|text' },
    heading1: { title: 'Heading 1', description: 'Top-level heading', keywords: 'h|heading1|h1' },
    heading2: {
      title: 'Heading 2',
      description: 'Key section heading',
      keywords: 'h2|heading2|subheading',
    },
    heading3: {
      title: 'Heading 3',
      description: 'Subsection and group heading',
      keywords: 'h3|heading3|subheading',
    },
    bulletList: {
      title: 'Bullet List',
      description: 'List with unordered items',
      keywords: 'ul|li|list|bulletlist|bullet list',
    },
    orderedList: {
      title: 'Numbered List',
      description: 'List with ordered items',
      keywords: 'ol|li|list|numberedlist|numbered list',
    },
    taskList: {
      title: 'To-do list',
      description: 'List with tasks',
      keywords: 'tasklist|task list|todo|checklist',
    },
    quote: { title: 'Blockquote', description: 'Blockquote block', keywords: 'quote|blockquote' },
    codeBlock: {
      title: 'Code Block',
      description: 'Code block with syntax highlighting',
      keywords: 'code|pre',
    },
    mention: {
      title: 'Mention',
      description: 'Mention a user or item',
      keywords: 'mention|user|item|tag',
    },
    emoji: { title: 'Emoji', description: 'Insert an emoji', keywords: 'emoji|emoticon|smiley' },
    table: { title: 'Table', description: 'Insert a table', keywords: 'table|insertTable' },
    divider: {
      title: 'Separator',
      description: 'Horizontal line to separate content',
      keywords: 'hr|horizontalRule|line|separator',
    },
    toc: {
      title: 'Table of contents',
      description: 'Insert a table of contents',
      keywords: 'toc|tableofcontents|table of contents',
    },
    image: {
      title: 'Image',
      description: 'Resizable image with caption',
      keywords: 'image|imageUpload|upload|img|picture|media|url',
    },
  },
} as const satisfies EditorTranslationMenusMessages
