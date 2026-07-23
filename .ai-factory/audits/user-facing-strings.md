# User-Facing String Audit

## Purpose and Row Format

This ledger inventories text that can be presented to a person using the
editor. Each row records a distinct value and presentation surface; identical
text is deduplicated only when it is used by the same control or state.

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |

## Coverage Rules

### Included

- Visible button labels, menu labels, headings, descriptions, empty states,
  captions, placeholders, user-visible error messages, and seeded demo copy.
- Tooltips, `aria-label` values, and keyboard-search keywords when they are
  exposed through an interactive control.
- Fixed color names and runtime/configuration values whose text can be shown.
- Consumer- or runtime-supplied content recorded as provenance, not as an
  invented fixed English string.

### Excluded

- Component names, CSS selectors, schema/node/mark keys, TypeScript types,
  telemetry, console logging, thrown developer diagnostics, and test fixtures
  unless the value is rendered to an editor user.
- Strings generated exclusively by third-party dependencies, where repository
  source does not control or enumerate the resulting text.

## Coverage Matrix

| Area | Reviewed source boundary | Status |
| --- | --- | --- |
| Toolbar and formatting | `components/ui/{toolbar,formatting,mobile-toolbar,turn-into}` and related composables | Complete |
| Slash, mention, emoji, and drag menus | `components/ui/{slash-menu,mention-menu,emoji-menu,drag-context-menu}` | Complete |
| Table controls | `components/table`, `composables/useTable*.ts`, `utils/table-actions` | Complete |
| Colors | `components/ui/color`, `composables/useColor*.ts`, color types/data | Complete |
| Links | `components/ui/link`, `composables/useLinkPopover.ts` | Complete |
| Image UI | `components/ui/image`, `nodes/{image,image-upload}`, image composables | Complete |
| Editor states and errors | notion editor/public API, feedback, TOC, upload composables | Complete |
| Accessibility | Vue `aria-*` bindings and tooltip labels across editor controls | Complete |
| Playground demo content | `apps/playground/src/{components,App.vue,content,composables}` | Complete |

## Editor Package

### Slash Menu

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Filter...` | Placeholder / decoration | Empty slash-menu trigger after `/` | `components/ui/slash-menu/SlashDropdownMenu.vue` `SuggestionMenu` `decoration-content`; rendered by `styles/slash-decoration.css` `.tiptap-slash-decoration.is-empty:after` | editor | CSS renders `data-decoration-content` only while the slash suggestion decoration is empty. |
| `AI` | Group heading | AI command group | `components/ui/slash-menu/slash-menu-items.ts` `ITEM_METADATA` | editor | Shown only when the matching AI extension is available. |
| `Style` | Group heading | Formatting command group | `components/ui/slash-menu/slash-menu-items.ts` `ITEM_METADATA` | editor | — |
| `Insert` | Group heading | Insertion command group | `components/ui/slash-menu/slash-menu-items.ts` `ITEM_METADATA` | editor | — |
| `Upload` | Group heading | Media command group | `components/ui/slash-menu/slash-menu-items.ts` `ITEM_METADATA` | editor | — |
| `Continue Writing` | Label | AI command | `slash-menu-items.ts` `continue_writing.title` | editor | — |
| `Continue writing from the current position` | Description | AI command | `slash-menu-items.ts` `continue_writing.subtext` | editor | — |
| `continue`, `write`, `continue writing`, `ai` | Search keywords | AI command | `slash-menu-items.ts` `continue_writing.keywords` | editor | Keyboard-search metadata. |
| `Ask AI` | Label | AI command | `slash-menu-items.ts` `ai_ask_button.title` | editor | — |
| `Ask AI to generate content` | Description | AI command | `slash-menu-items.ts` `ai_ask_button.subtext` | editor | — |
| `ai`, `ask`, `generate` | Search keywords | AI command | `slash-menu-items.ts` `ai_ask_button.keywords` | editor | Keyboard-search metadata. |
| `Text` | Label | Paragraph command | `slash-menu-items.ts` `text.title` | editor | Also a different-surface Turn Into label. |
| `Regular text paragraph` | Description | Paragraph command | `slash-menu-items.ts` `text.subtext` | editor | — |
| `p`, `paragraph`, `text` | Search keywords | Paragraph command | `slash-menu-items.ts` `text.keywords` | editor | Keyboard-search metadata. |
| `Heading 1` | Label | Heading command | `slash-menu-items.ts` `heading_1.title` | editor | Also used by Turn Into. |
| `Top-level heading` | Description | Heading 1 command | `slash-menu-items.ts` `heading_1.subtext` | editor | — |
| `h`, `heading1`, `h1` | Search keywords | Heading 1 command | `slash-menu-items.ts` `heading_1.keywords` | editor | Keyboard-search metadata. |
| `Heading 2` | Label | Heading command | `slash-menu-items.ts` `heading_2.title` | editor | Also used by Turn Into. |
| `Key section heading` | Description | Heading 2 command | `slash-menu-items.ts` `heading_2.subtext` | editor | — |
| `h2`, `heading2`, `subheading` | Search keywords | Heading 2 command | `slash-menu-items.ts` `heading_2.keywords` | editor | Keyboard-search metadata. |
| `Heading 3` | Label | Heading command | `slash-menu-items.ts` `heading_3.title` | editor | Also used by Turn Into. |
| `Subsection and group heading` | Description | Heading 3 command | `slash-menu-items.ts` `heading_3.subtext` | editor | — |
| `h3`, `heading3`, `subheading` | Search keywords | Heading 3 command | `slash-menu-items.ts` `heading_3.keywords` | editor | Keyboard-search metadata. |
| `Bullet List` | Label | Bullet-list command | `slash-menu-items.ts` `bullet_list.title` | editor | Capitalization differs from Turn Into. |
| `List with unordered items` | Description | Bullet-list command | `slash-menu-items.ts` `bullet_list.subtext` | editor | — |
| `ul`, `li`, `list`, `bulletlist`, `bullet list` | Search keywords | Bullet-list command | `slash-menu-items.ts` `bullet_list.keywords` | editor | Keyboard-search metadata. |
| `Numbered List` | Label | Ordered-list command | `slash-menu-items.ts` `ordered_list.title` | editor | Capitalization differs from Turn Into. |
| `List with ordered items` | Description | Ordered-list command | `slash-menu-items.ts` `ordered_list.subtext` | editor | — |
| `ol`, `li`, `list`, `numberedlist`, `numbered list` | Search keywords | Ordered-list command | `slash-menu-items.ts` `ordered_list.keywords` | editor | Keyboard-search metadata. |
| `To-do list` | Label | Task-list command | `slash-menu-items.ts` `task_list.title` | editor | Also used by Turn Into. |
| `List with tasks` | Description | Task-list command | `slash-menu-items.ts` `task_list.subtext` | editor | — |
| `tasklist`, `task list`, `todo`, `checklist` | Search keywords | Task-list command | `slash-menu-items.ts` `task_list.keywords` | editor | Keyboard-search metadata. |
| `Blockquote` | Label | Quote command | `slash-menu-items.ts` `quote.title` | editor | Also used by Turn Into. |
| `Blockquote block` | Description | Quote command | `slash-menu-items.ts` `quote.subtext` | editor | — |
| `quote`, `blockquote` | Search keywords | Quote command | `slash-menu-items.ts` `quote.keywords` | editor | Keyboard-search metadata. |
| `Code Block` | Label | Code-block command | `slash-menu-items.ts` `code_block.title` | editor | Capitalization differs from Turn Into. |
| `Code block with syntax highlighting` | Description | Code-block command | `slash-menu-items.ts` `code_block.subtext` | editor | — |
| `code`, `pre` | Search keywords | Code-block command | `slash-menu-items.ts` `code_block.keywords` | editor | Keyboard-search metadata. |
| `Mention` | Label | Mention command | `slash-menu-items.ts` `mention.title` | editor | — |
| `Mention a user or item` | Description | Mention command | `slash-menu-items.ts` `mention.subtext` | editor | — |
| `mention`, `user`, `item`, `tag` | Search keywords | Mention command | `slash-menu-items.ts` `mention.keywords` | editor | Keyboard-search metadata. |
| `Emoji` | Label | Emoji command | `slash-menu-items.ts` `emoji.title` | editor | — |
| `Insert an emoji` | Description | Emoji command | `slash-menu-items.ts` `emoji.subtext` | editor | — |
| `emoji`, `emoticon`, `smiley` | Search keywords | Emoji command | `slash-menu-items.ts` `emoji.keywords` | editor | Keyboard-search metadata. |
| `Table` | Label | Table-insert command | `slash-menu-items.ts` `table.title` | editor | Inserts a 3 × 3 table. |
| `Insert a table` | Description | Table-insert command | `slash-menu-items.ts` `table.subtext` | editor | — |
| `table`, `insertTable` | Search keywords | Table-insert command | `slash-menu-items.ts` `table.keywords` | editor | Keyboard-search metadata. |
| `Separator` | Label | Divider command | `slash-menu-items.ts` `divider.title` | editor | — |
| `Horizontal line to separate content` | Description | Divider command | `slash-menu-items.ts` `divider.subtext` | editor | — |
| `hr`, `horizontalRule`, `line`, `separator` | Search keywords | Divider command | `slash-menu-items.ts` `divider.keywords` | editor | Keyboard-search metadata. |
| `Table of contents` | Label | TOC command | `slash-menu-items.ts` `toc.title` | editor | Also an accessibility/visible title elsewhere. |
| `Insert a table of contents` | Description | TOC command | `slash-menu-items.ts` `toc.subtext` | editor | — |
| `toc`, `tableofcontents`, `table of contents` | Search keywords | TOC command | `slash-menu-items.ts` `toc.keywords` | editor | Keyboard-search metadata. |
| `Image` | Label | Image-upload command | `slash-menu-items.ts` `image.title` | editor | — |
| `Resizable image with caption` | Description | Image-upload command | `slash-menu-items.ts` `image.subtext` | editor | — |
| `image`, `imageUpload`, `upload`, `img`, `picture`, `media`, `url` | Search keywords | Image-upload command | `slash-menu-items.ts` `image.keywords` | editor | Keyboard-search metadata. |
| `Insert slash command` | Tooltip and accessibility name | Mobile slash trigger | `components/ui/slash-menu/SlashCommandTriggerButton.vue` | editor | Same wording on `aria-label` and tooltip. |

### Toolbar, Formatting, Links, and Context Menus

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Bold`, `Italic`, `Underline`, `Strike`, `Code`, `Superscript`, `Subscript` | Tooltip and accessibility name | Mark buttons | `composables/useMark.ts` `useMark` | editor | Derived from the mark type; keyboard shortcuts are separately rendered only when requested by consumers. |
| `Increase indent`, `Decrease indent` | Tooltip and accessibility name | Indent/outdent buttons | `composables/useIndent.ts` `labelsByAction` | editor | Shortcuts: `Tab` and `Shift-Tab`. |
| `Align left`, `Align center`, `Align right`, `Align justify` | Tooltip and accessibility name | Text alignment buttons | `composables/useTextAlign.ts` `TEXT_ALIGN_LABELS` | editor | Shortcuts: `Mod-Shift-L/E/R/J`. |
| `Undo`, `Redo` | Tooltip and accessibility name | History buttons | `composables/useUndoRedo.ts` `labelsByAction` | editor | — |
| `Move Up`, `Move Down` | Tooltip and accessibility name | Move-node buttons | `composables/useMoveNode.ts` | editor | — |
| `Delete` | Tooltip and accessibility name | Delete-node button | `composables/useDeleteNode.ts` | editor | — |
| `Turn into` | Visible label/group heading/tooltip | Turn Into dropdown and drag menu | `components/ui/{turn-into/TurnIntoDropdownContent,drag-context-menu/DragContextMenuTurnInto}.vue` | editor | The trigger also has `Turn into (current: {activeBlock.label})` as a dynamic `aria-label`. |
| `Text`, `Heading 1`, `Heading 2`, `Heading 3`, `Bulleted list`, `Numbered list`, `To-do list`, `Blockquote`, `Code block` | Menu labels | Turn Into options | `composables/useTurnInto.ts` `TURN_INTO_BLOCKS` | editor | Different labels/capitalization from some slash commands are retained. |
| `More options` | Tooltip | Floating toolbar overflow | `components/ui/toolbar/NotionToolbarFloating.vue` | editor | — |
| `Click for options` | Tooltip | Drag context-menu trigger | `components/ui/drag-context-menu/DragContextMenu.vue` | editor | — |
| `Reset formatting` | Menu label | Drag/mobile context menu | `composables/useResetAllFormatting.ts`; `MobileToolbarMain.vue` | editor | — |
| `Duplicate node` | Menu label | Drag/mobile context menu | `composables/useDuplicate.ts`; `MobileToolbarMain.vue` | editor | — |
| `Copy to clipboard` | Menu label | Drag/mobile context menu | `composables/useCopyToClipboard.ts`; `MobileToolbarMain.vue` | editor | — |
| `Copy anchor link` | Menu label | Drag/mobile context menu | `composables/useCopyAnchorLink.ts`; `MobileToolbarMain.vue` | editor | — |
| `Link` | Tooltip and accessibility name | Link button/popover trigger | `components/ui/link/LinkButton.vue`; `composables/useLinkPopover.ts` | editor | — |
| `Paste a link...` | Placeholder | Link URL input | `components/ui/link/LinkContent.vue` | editor | — |
| `Apply link`, `Open in new window`, `Remove link` | Title tooltip | Link editor actions | `components/ui/link/LinkContent.vue` | editor | Native `title` presentation surface. |
| Consumer-provided `text` props | Visible label | Formatting and toolbar controls | `components/ui/{formatting,toolbar,mobile-toolbar}/**` | editor | Displayed only when a consumer supplies text. |

### Mention and Emoji Runtime Data

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `MentionUser.name` | Visible menu item and inserted mention label | Mention suggestion | `components/ui/mention-menu/Mention{DropdownMenu,MenuItem}.vue` | editor | Runtime/consumer-supplied user data; no fixed English name in package source. |
| `emoji.name` | Visible menu item title | Emoji suggestion | `components/ui/emoji-menu/EmojiDropdownMenu.vue` | editor | Sourced from emoji metadata; metadata inventory is external to this package. |
| Emoji glyph/metadata keyword set | Visible glyph and search behaviour | Emoji suggestion | `components/ui/emoji-menu/EmojiDropdownMenu.vue` | editor | Third-party/dependency-provided data is not enumerated from repository source. |

### Colors

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Color` | Menu label | Drag/mobile color menu | `components/ui/color/ColorMenu.vue` | editor | Consumer-overridable `label` prop. |
| `Text color` | Tooltip/accessibility name and group heading | Text-color popover | `ColorTextPopover.vue`; `ColorTextPopoverContent.vue` | editor | Heading and tooltip are differing presentation surfaces. |
| `Highlight` | Tooltip | Highlight popover trigger | `components/ui/color/ColorHighlightPopoverButton.vue` | editor | Differs from the control's fixed accessibility name. |
| `Highlight text` | Accessibility name | Highlight popover trigger | `components/ui/color/ColorHighlightPopoverButton.vue` | editor | Fixed `aria-label`; recorded separately because it differs from the tooltip. |
| `Highlight color` | Group heading | Combined color popover | `components/ui/color/ColorTextPopoverContent.vue` | editor | — |
| `Background color` | Group heading | Context color menu | `components/ui/color/ColorMenu.vue` | editor | — |
| `Recently used` | Group heading | Combined color popover | `components/ui/color/ColorTextPopoverContent.vue` | editor | — |
| `Recent colors` | Group heading | Context color menu | `components/ui/color/ColorMenu.vue` | editor | Different wording from combined popover. |
| `Remove highlight` | Label, tooltip, and accessibility name | Highlight removal action | `ColorHighlightPopoverContent.vue`; `useColorHighlight.ts` | editor | — |
| `Default text`, `Gray text`, `Brown text`, `Orange text`, `Yellow text`, `Green text`, `Blue text`, `Purple text`, `Pink text`, `Red text` | Tooltip/button label | Text palette | `composables/useColorText.ts` `TEXT_COLORS` | editor | Also becomes `{color.label} text color` as each swatch `aria-label`. |
| `Default background`, `Gray background`, `Brown background`, `Orange background`, `Yellow background`, `Green background`, `Blue background`, `Purple background`, `Pink background`, `Red background` | Tooltip/button label | Highlight/background palette | `composables/useColorHighlight.ts` `HIGHLIGHT_COLORS` | editor | Also becomes `{color.label} highlight color` as each swatch `aria-label`. |
| Stored recent color label or raw color value | Tooltip/button label | Recent colors | `composables/useRecentColors.ts`; `ColorTextPopoverContent.vue` | editor | Runtime state; raw custom values display as their stored value when not in a fixed palette. |
| `Toggle highlight ({highlightColor})` | Tooltip/accessibility fallback | Standalone highlight button | `components/ui/color/ColorHighlightButton.vue` | editor | Dynamic fallback if no label/text prop is supplied. |

### Tables

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Alignment` | Menu label | Table alignment menu | `components/table/table-align/TableAlignMenu.vue` | editor | — |
| `Align left`, `Align center`, `Align right`, `Justify` | Menu label | Table text alignment | `composables/useTableAlignCell.ts` `TEXT_LABELS` | editor | `Justify` differs from generic text alignment’s `Align justify`. |
| `Align top`, `Align middle`, `Align bottom` | Menu label | Table vertical alignment | `composables/useTableAlignCell.ts` `VERTICAL_LABELS` | editor | — |
| `Table cells option` | Accessibility name | Table cell-handle trigger | `components/table/table-cell-handle/TableCellHandleMenu.vue` | editor | — |
| `Row actions`, `Column actions` | Accessibility name | Row and column table-handle triggers | `components/table/table-handle/TableHandleControl.vue` `ariaLabel` | editor | Fixed names selected from the control's `orientation` prop. |
| `Clear contents` | Visible label | Table cell-handle action / fallback | `TableCellHandleMenu.vue`; `TableHandleMenuContent.vue` | editor | — |
| `Add or remove rows` | Accessibility name | Row extend buttons | `components/table/table-extend/TableExtendRowColumnButtons.vue` | editor | — |
| `Add or remove columns` | Accessibility name | Column extend buttons | `components/table/table-extend/TableExtendRowColumnButtons.vue` | editor | — |
| `Insert row above`, `Insert row below`, `Insert column left`, `Insert column right` | Menu label | Table insertion actions | `utils/table-actions/add-delete.ts` | editor | — |
| `Duplicate row`, `Duplicate column` | Menu label | Table duplication actions | `utils/table-actions/add-delete.ts` | editor | — |
| `Delete row`, `Delete column` | Menu label | Table deletion actions | `utils/table-actions/add-delete.ts` | editor | — |
| `Clear row contents`, `Clear column contents`, `Clear all contents` | Menu label | Table clearing actions | `utils/table-actions/clearing.ts` | editor | — |
| `Header row`, `Header column` | Menu label | Table header actions | `utils/table-actions/headers.ts` `HEADER_LABELS` | editor | Toggle state is expressed by the control, not its text. |
| `Move row up`, `Move row down`, `Move row left`, `Move row right`, `Move column up`, `Move column down`, `Move column left`, `Move column right` | Menu label | Table movement actions | `utils/table-actions/movement.ts` `MOVE_LABELS` | editor | Runtime availability limits rows to up/down and columns to left/right. |
| `Sort row A-Z`, `Sort row Z-A`, `Sort column A-Z`, `Sort column Z-A` | Menu label | Table sort actions | `utils/table-actions/sorting.ts` `SORT_LABELS` | editor | — |
| `Fit to width` | Menu label | Table width action | `composables/useTableFitToWidth.ts` | editor | Also exposed from drag context menu. |

### Images, Editor States, Accessibility, and Public Configuration

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Start writing...` | Editor placeholder | Default empty editor | `components/notion/notion-editor/{EditorProvider,NotionEditor,NotionEditorContent}.vue` | editor | Public `placeholder` prop overrides this default. |
| Consumer-provided `placeholder` | Editor placeholder | Empty editor | `components/notion/notion-editor/public-api.ts` `NotionEditorProps` | editor | Runtime public configuration; provenance only. |
| `toolbar` | Accessibility name | Primitive toolbar landmark | `components/primitives/toolbar/Toolbar.vue` | editor | Lowercase fixed `aria-label`. |
| `Table of contents` | Visible title and accessibility name | TOC node and sidebar navigation | `nodes/toc/TocNodeView.vue`; `components/notion/toc/TocSidebar.vue` | editor | The node title is conditional on `showTitle`. |
| `Add headings to create a table of contents.` | Empty state | Empty TOC node | `nodes/toc/TocNodeView.vue` | editor | — |
| `Image align left`, `Image align center`, `Image align right` | Tooltip and accessibility name | Image alignment buttons | `composables/useImageAlign.ts` `labelsByAlign` | editor | — |
| `Caption` | Tooltip and accessibility name | Image-caption toggle | `components/ui/image/ImageCaptionButton.vue` | editor | — |
| `Download image` | Tooltip and accessibility name | Image download action | `composables/useImageDownload.ts` | editor | — |
| `Replace` | Tooltip | Image replace/upload action | `components/ui/image/ImageNodeFloating.vue` | editor | — |
| `Add image` | Tooltip and accessibility name | Image upload button | `components/ui/image/ImageUploadButton.vue` | editor | Consumer can override tooltip; accessibility name remains fixed. |
| `Add a caption...` | Placeholder | Editable image caption | `nodes/image/ImageNodeView.vue` | editor | — |
| `Click to upload` | Visible upload instruction | Image upload node | `nodes/image-upload/ImageUploadNodeView.vue` | editor | Appears with the fixed continuation below. |
| `or drag and drop` | Visible upload instruction | Image upload node | `nodes/image-upload/ImageUploadNodeView.vue` | editor | — |
| `Maximum {limit} file(s), {maxSize}MB each.` | Visible upload instruction | Image upload node | `nodes/image-upload/ImageUploadNodeView.vue` | editor | Dynamic count and configured maximum. |
| `Uploading {fileItems.length} files` | Upload state | Multi-file upload header | `nodes/image-upload/ImageUploadNodeView.vue` | editor | Runtime count. |
| `Clear All` | Button label | Multi-file upload header | `nodes/image-upload/ImageUploadNodeView.vue` | editor | — |
| `item.file.name`, formatted file size, and `{progress}%` | Upload state | Per-file preview | `nodes/image-upload/ImageUploadNodeView.vue` | editor | Runtime user file data; ledger records provenance only. |
| `item.errorMessage` | User-visible error | Per-file upload error | `nodes/image-upload/ImageUploadNodeView.vue` | editor | Value originates in `useImageUpload`. |
| `Image upload failed` | User-visible error | Failed upload | `composables/useImageUpload.ts` | editor | Default rendered error message. |
| `image upload adapter is not configured` | User-visible error | Failed default adapter | `EditorProvider.vue`; `useImageUpload.ts` | editor | A rejected default adapter becomes the rendered per-file error. |
| Uploaded `File.name` | Image alt/title attribute | Successful upload | `composables/useImageUpload.ts` | editor | Runtime file metadata copied to image node `alt` and `title`; no fixed literal. |
| `tooltip` prop | Tooltip content | Primitive and public UI controls | `components/primitives/button/Button.vue`; image/formatting controls | editor | Consumer-supplied runtime text is intentionally not enumerated. |

### Reconciled Supporting Surfaces

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Suggestions` | Accessibility name | Shared suggestion listbox | `components/ui/suggestion/SuggestionMenu.vue` | editor | Applies to suggestion UI beyond the specialized mention/emoji renderers. |
| `Show title` | Menu label | TOC title visibility action | `composables/useTocShowTitle.ts` | editor | Added to the drag-context menu when the TOC node is selected. |
| `Merge cells`, `Split cell` | Menu label | Table merge/split actions | `utils/table-actions/merge-split.ts` `MERGE_SPLIT_LABELS` | editor | — |
| `Text`, `Heading {level}`, `Bullet List`, `Numbered List`, `To-do list`, `Blockquote`, `Code Block` | Conversion labels | Block-conversion composables | `composables/blocks/useBlockConversions.ts` | editor | Used by formatting controls; some values duplicate slash-menu copy but remain a distinct source/presentation path. |
| `user.name` or `Anonymous` | Visible collaborator menu item and avatar fallback | Collaboration users menu | `components/notion/collaboration/CollabUsers.vue` | editor | Runtime collaboration data; `Anonymous` is the fixed fallback. |
| `Connecting...` | Visible loading state | Loading spinner | `components/notion/feedback/LoadingSpinner.vue` | editor | Consumer may override the `text` prop. |

## Playground-Only

None of the values below are published by `@i-prikot/editor`; they are visible
only in the playground shell or its one-time seeded demonstration document.

### Shell, CTA, and Theme Control

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Notion-like Template` | Dialog accessibility name and visible heading | CTA popup | `apps/playground/src/components/CtaPopup.vue` | playground-only | The same exact text is exposed on `aria-label` and `<h3>`. |
| `Close` | Accessibility name | CTA close button | `apps/playground/src/components/CtaPopup.vue` | playground-only | — |
| `Share your unique link to collaborate.` | Visible subtitle | CTA popup | `apps/playground/src/components/CtaPopup.vue` | playground-only | — |
| `Copy link`, `Copied!` | Button label / completed state | CTA copy-link action | `apps/playground/src/components/CtaPopup.vue` | playground-only | `Copied!` is shown for 1.5 seconds after a successful clipboard write. |
| `Start now` | Button label | CTA documentation action | `apps/playground/src/components/CtaPopup.vue` | playground-only | — |
| `Built with Tiptap, by Tiptap` | Visible footer | CTA popup | `apps/playground/src/components/CtaPopup.vue` | playground-only | — |
| `Switch to light mode`, `Switch to dark mode` | Dynamic accessibility name | Theme toggle | `apps/playground/src/components/ThemeToggle.vue` | playground-only | Selected from `isDarkMode`; the control has no visible text. |
| `Upload cancelled` | Adapter error (excluded from rendered copy) | Playground fake image upload | `apps/playground/src/App.vue` `imageUpload` | playground-only | Thrown for cancellation only; library maps this to the rendered generic `Image upload failed`, so it is not a separate visible message. |

### Seeded Demo Document

All rows below are text leaves or image accessibility metadata from
`apps/playground/src/content/default-content.ts` `defaultContent`. Whitespace-only
text leaves are intentionally excluded because they add no independently
perceivable copy.

| Text or dynamic source | Surface / category | Control or state | Source and symbol | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| `Welcome to Notion-like template ` | Heading | Demo document opening | `defaultContent` | playground-only | Followed by the `sparkles` emoji node. |
| ` Invite your colleagues to make this fun! ` | Bold quotation text | Demo document opening | `defaultContent` | playground-only | Preceded by the `love_letter` emoji node. |
| `Just copy the URL from your browser and share it – everyone with the link can join in and collaborate in real time.` | Paragraph | Collaboration introduction | `defaultContent` | playground-only | — |
| `Start writing your thoughts here … ` | Paragraph | Writing prompt | `defaultContent` | playground-only | Followed by the `pencil` emoji node. |
| `Try some `; `Markdown:`; `# Headings\n- Lists\n> Quotes\n\`Inline code\`` | Paragraph/code content | Markdown demonstration | `defaultContent` | playground-only | Separate text leaves, retained as exact values. |
| `Or type `; `/`; ` to open the command menu and discover blocks, formatting, and hidden features.` | Paragraph | Slash-menu demonstration | `defaultContent` | playground-only | `/` is a separately marked text leaf. |
| `Make it yours` | Heading | Formatting walkthrough | `defaultContent` | playground-only | — |
| `Select text`; ` to reveal a floating toolbar: `; `Quickly italicize, `; `color`; `, add `; `links`; `, or `; `highlight text`; ` just as you're used to..` | Paragraph | Floating-toolbar walkthrough | `defaultContent` | playground-only | Includes exact marked text leaves. |
| `Hover near any block`; ` to reveal the context handle `; `⠿`; `Click to open the context menu (duplicate, delete, reset formatting, and more) or simply drag to move your content anywhere you like!` | Paragraph | Drag-context-menu walkthrough | `defaultContent` | playground-only | Handle glyph is a visible text leaf. |
| `Mention teammates with `; `@`; ` and add some fun with emoji `; `:` | Paragraph | Mention and emoji walkthrough | `defaultContent` | playground-only | Marker characters are separate text leaves. |
| `Switch between `; ` light and `; ` dark mode – whatever fits your mood.` | Paragraph | Theme walkthrough | `defaultContent` | playground-only | — |
| `Need a spark? `; `Summon the AI Assistant with `; `/ask ai`; ` from the context menu, or by selecting text and choosing `; `Improve`; `.`; `Polish your writing, or try a ready-made prompt—the AI menu appears with helpful suggestions.` | Paragraph | AI walkthrough | `defaultContent` | playground-only | Includes exact marked command/action leaves. |
| `Interactive Tables Included` | Heading | Table feature section | `defaultContent` | playground-only | — |
| `This template comes with the full-featured table component. Click row or column handles for sorting and formatting, use the extend buttons (+ icons) to add rows or columns, drag and drop to reorder rows, and select cells to format or merge content.` | Paragraph | Table feature description | `defaultContent` | playground-only | — |
| `Name`, `Role`, `Department`, `Location` | Table header cells | Demo table | `defaultContent` | playground-only | — |
| `Alice Johnson`, `Senior Developer`, `Engineering`, `San Francisco` | Table data cells | Demo table, first row | `defaultContent` | playground-only | — |
| `Bob Smith`, `Product Manager`, `Product`, `New York` | Table data cells | Demo table, second row | `defaultContent` | playground-only | — |
| `Carol White`, `UX Designer`, `Design`, `London` | Table data cells | Demo table, third row | `defaultContent` | playground-only | — |
| `David Chen`, `Data Analyst`, `Analytics`, `Remote` | Table data cells | Demo table, fourth row | `defaultContent` | playground-only | — |
| `Table of Content` | Heading | Demo TOC section | `defaultContent` | playground-only | Singular form differs from the editor UI’s `Table of contents`. |
| `Checklist` | Heading | Demo task-list section | `defaultContent` | playground-only | — |
| `Read up to this point`, `Try a slash command`, `Mention someone`, `Use the floating toolbar`, `Add a color highlight`, `Explore the context menu & drag blocks`, `Ask the AI for help` | Task labels | Demo checklist | `defaultContent` | playground-only | Fixed seeded task copy. |
| `Developer quickstart` | Heading | Demo developer section | `defaultContent` | playground-only | — |
| `Ready to build your own editor? Just run:`; `npx @tiptap/cli init` | Paragraph/code block | Demo developer quickstart | `defaultContent` | playground-only | The command is visible code text. |
| `Did you know? `; `Many features here are powered by open-source Tiptap UI Components. Some advanced tools – like the AI Assistant, advanced color palettes, or context menus – are exclusive to paid users. `; `Unlock even more possibilities by `; `upgrading your plan`; `!` | Paragraph | Demo product note | `defaultContent` | playground-only | Includes link text as a separate leaf. |
| `Short description` | Heading | Demo cards section | `defaultContent` | playground-only | — |
| `Content blocks = Node Components`, `Toolbars, menus, and buttons = UI Components` | Card text | Demo component-description cards | `defaultContent` | playground-only | — |
| `P.S.`; `You’re using the Notion-like template, available for paid users.` | Paragraph | Demo closing note | `defaultContent` | playground-only | — |
| `Screenshot 2025-02-23 at 19.22.27` | Image `alt` and `title` | Seeded demonstration image | `defaultContent` | playground-only | Accessibility metadata, not visible caption text. |
| Emoji node names `sparkles`, `love_letter`, `pencil` | Rendered emoji metadata | Seeded demo content | `defaultContent` | playground-only | Values resolve through the emoji extension/metadata; glyph presentation is dependency-driven. |

## Audit Notes and Reconciliation

### Static Search Evidence

- Task 2 source pass: `git grep` over the named command-menu, toolbar, link,
  formatting, and composable boundaries for `label`, `title`, `description`,
  `keywords`, `placeholder`, `aria-label`, and `tooltip` attributes.
- Task 3 source pass: the same source-only attribute/literal scan over table,
  color, image, notion-editor, and primitive boundaries, plus fixed palette
  and table-action constant inspection.
- Task 4 source pass: `git grep` across `packages/editor/src` and
  `apps/playground/src` for the same presentation attributes and literal
  candidates; 250 editor-package candidate lines were reviewed. The package
  and playground source maps were also checked for all requested boundaries.
- Rework source trace: `SlashDropdownMenu.vue` passes `Filter...` through
  `SuggestionMenu` as `decoration-content`; `styles/slash-decoration.css`
  renders that value with `content: attr(data-decoration-content)` for an
  empty slash decoration.
- The scan records metadata and source literals only; it does not retain
  document content, uploaded file data, URLs, or user identities outside the
  deliberate, fixed playground seed content listed above.

### Intentional Exclusions

- Development diagnostics in `createDevelopmentDiagnostics`, `console.error`
  calls, lifecycle metadata, and developer-only thrown errors are excluded
  unless their text is passed into `item.errorMessage` and rendered by the
  image-upload node.
- The playground’s `Upload cancelled` error is intentionally excluded from
  visible copy because the library’s rendering path converts it to `Image
  upload failed`.
- Tiptap schema keys, icons, CSS classes, internal action keys, test fixtures,
  and non-rendered configuration identifiers are not user-facing copy.
- Mention users, emoji metadata, consumer props, and browser/third-party UI
  remain provenance entries because repository source does not define every
  value they may present.

### Totals and Known Gaps

- Coverage: all nine required source boundaries are complete; the ledger
  separates published editor strings from playground-only strings.
- Inventory: 135 editor-package ledger rows and 38 playground-only ledger
  rows, including grouped exact keyword, palette, and seeded-content sets.
- Known gaps: emoji names/glyphs, browser-native file-picker text, and
  third-party Tiptap/browser accessibility text cannot be exhaustively
  enumerated from repository source.
