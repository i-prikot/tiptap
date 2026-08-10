# `@i-prikot/editor` styling

The editor does not create or require an application container class. The host
owns the container, its isolation, and theme selection. Base component styles
are separate from theme values.

## CSS entry points

Import the base stylesheet first. It contains only editor component and layout
rules and does not reset the page or theme a host container.

```css
@import '@i-prikot/editor/styles.css';
```

`@i-prikot/editor/style.css` remains a compatibility alias for `styles.css`.
The optional entry points are:

| Import            | Contains                                                           | Use it when                                     |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `styles.css`      | Component/layout CSS                                               | Always, including a fully custom theme.         |
| `light-theme.css` | Light tokens, normalization, and the light component-default layer | An editor root has `data-tiptap-theme="light"`. |
| `dark-theme.css`  | Dark tokens, normalization, and the dark component-default layer   | An editor root has `data-tiptap-theme="dark"`.  |

Light only:

```css
@import '@i-prikot/editor/styles.css';
@import '@i-prikot/editor/light-theme.css';

.invoice-editor {
}
.invoice-editor[data-tiptap-theme='light'] {
}
```

Dark only:

```css
@import '@i-prikot/editor/styles.css';
@import '@i-prikot/editor/dark-theme.css';
```

For a switchable interface, load both files once. Each editor chooses its own
theme, so separate instances do not affect one another or the rest of the page.

```css
@import '@i-prikot/editor/styles.css';
@import '@i-prikot/editor/light-theme.css';
@import '@i-prikot/editor/dark-theme.css';
```

```html
<section class="invoice-editor" data-tiptap-theme="light">
  <!-- NotionEditor and its overlay target -->
</section>
<section class="notes-editor" data-tiptap-theme="dark">
  <!-- another independent NotionEditor -->
</section>
```

## Public tokens

Declare public `--tt-*` properties on the same consumer-owned themed
container. Values inherit into the editor, menus, and overlays rendered inside
it. Every supported token is listed below with its exact source default for
both bundled themes. When a theme defines a token more than once, the listed
value is the last declaration that wins in the CSS cascade.

| Token                       | Family   | Allowed value  | Purpose                     | Light default                                                                                                    | Dark default                                                                                                     |
| --------------------------- | -------- | -------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--tt-accent-contrast`      | Contrast | CSS percentage | Minimum contrast adjustment | `8%`                                                                                                             | `8%`                                                                                                             |
| `--tt-brand-color-100`      | Palette  | CSS color      | Brand palette step          | `#dedbff`                                                                                                        | `#dedbff`                                                                                                        |
| `--tt-brand-color-200`      | Palette  | CSS color      | Brand palette step          | `#c3bdff`                                                                                                        | `#c3bdff`                                                                                                        |
| `--tt-brand-color-300`      | Palette  | CSS color      | Brand palette step          | `#9d8aff`                                                                                                        | `#9d8aff`                                                                                                        |
| `--tt-brand-color-400`      | Palette  | CSS color      | Brand palette step          | `#7a52ff`                                                                                                        | `#7a52ff`                                                                                                        |
| `--tt-brand-color-50`       | Palette  | CSS color      | Brand palette step          | `#efeeff`                                                                                                        | `#efeeff`                                                                                                        |
| `--tt-brand-color-500`      | Palette  | CSS color      | Brand palette step          | `#6229ff`                                                                                                        | `#6229ff`                                                                                                        |
| `--tt-brand-color-600`      | Palette  | CSS color      | Brand palette step          | `#5400e5`                                                                                                        | `#5400e5`                                                                                                        |
| `--tt-brand-color-700`      | Palette  | CSS color      | Brand palette step          | `#4b00cc`                                                                                                        | `#4b00cc`                                                                                                        |
| `--tt-brand-color-800`      | Palette  | CSS color      | Brand palette step          | `#380099`                                                                                                        | `#380099`                                                                                                        |
| `--tt-brand-color-900`      | Palette  | CSS color      | Brand palette step          | `#2b1966`                                                                                                        | `#2b1966`                                                                                                        |
| `--tt-brand-color-950`      | Palette  | CSS color      | Brand palette step          | `#0d002e`                                                                                                        | `#0d002e`                                                                                                        |
| `--tt-color-green-base`     | Status   | CSS color      | Status palette step         | `#01fe73`                                                                                                        | `#01fe73`                                                                                                        |
| `--tt-color-green-dec-1`    | Status   | CSS color      | Status palette step         | `#03ce5e`                                                                                                        | `#03ce5e`                                                                                                        |
| `--tt-color-green-dec-2`    | Status   | CSS color      | Status palette step         | `#02a247`                                                                                                        | `#02a247`                                                                                                        |
| `--tt-color-green-dec-3`    | Status   | CSS color      | Status palette step         | `#007a35`                                                                                                        | `#007a35`                                                                                                        |
| `--tt-color-green-dec-4`    | Status   | CSS color      | Status palette step         | `#005221`                                                                                                        | `#005221`                                                                                                        |
| `--tt-color-green-dec-5`    | Status   | CSS color      | Status palette step         | `#002e0f`                                                                                                        | `#002e0f`                                                                                                        |
| `--tt-color-green-inc-1`    | Status   | CSS color      | Status palette step         | `#67fe92`                                                                                                        | `#67fe92`                                                                                                        |
| `--tt-color-green-inc-2`    | Status   | CSS color      | Status palette step         | `#90fea8`                                                                                                        | `#90fea8`                                                                                                        |
| `--tt-color-green-inc-3`    | Status   | CSS color      | Status palette step         | `#b8ffc5`                                                                                                        | `#b8ffc5`                                                                                                        |
| `--tt-color-green-inc-4`    | Status   | CSS color      | Status palette step         | `#d6ffdc`                                                                                                        | `#d6ffdc`                                                                                                        |
| `--tt-color-green-inc-5`    | Status   | CSS color      | Status palette step         | `#f0fff2`                                                                                                        | `#f0fff2`                                                                                                        |
| `--tt-color-red-base`       | Status   | CSS color      | Status palette step         | `#ff3014`                                                                                                        | `#ff3014`                                                                                                        |
| `--tt-color-red-dec-1`      | Status   | CSS color      | Status palette step         | `#d11800`                                                                                                        | `#d11800`                                                                                                        |
| `--tt-color-red-dec-2`      | Status   | CSS color      | Status palette step         | `#a30e00`                                                                                                        | `#a30e00`                                                                                                        |
| `--tt-color-red-dec-3`      | Status   | CSS color      | Status palette step         | `#7a0800`                                                                                                        | `#7a0800`                                                                                                        |
| `--tt-color-red-dec-4`      | Status   | CSS color      | Status palette step         | `#520400`                                                                                                        | `#520400`                                                                                                        |
| `--tt-color-red-dec-5`      | Status   | CSS color      | Status palette step         | `#2e0100`                                                                                                        | `#2e0100`                                                                                                        |
| `--tt-color-red-inc-1`      | Status   | CSS color      | Status palette step         | `#ff5d47`                                                                                                        | `#ff5d47`                                                                                                        |
| `--tt-color-red-inc-2`      | Status   | CSS color      | Status palette step         | `#ff8a75`                                                                                                        | `#ff8a75`                                                                                                        |
| `--tt-color-red-inc-3`      | Status   | CSS color      | Status palette step         | `#fa9`                                                                                                           | `#fa9`                                                                                                           |
| `--tt-color-red-inc-4`      | Status   | CSS color      | Status palette step         | `#ffcdc2`                                                                                                        | `#ffcdc2`                                                                                                        |
| `--tt-color-red-inc-5`      | Status   | CSS color      | Status palette step         | `#ffeeeb`                                                                                                        | `#ffeeeb`                                                                                                        |
| `--tt-color-yellow-base`    | Status   | CSS color      | Status palette step         | `#fd0`                                                                                                           | `#fd0`                                                                                                           |
| `--tt-color-yellow-dec-1`   | Status   | CSS color      | Status palette step         | `#d1b500`                                                                                                        | `#d1b500`                                                                                                        |
| `--tt-color-yellow-dec-2`   | Status   | CSS color      | Status palette step         | `#a38d00`                                                                                                        | `#a38d00`                                                                                                        |
| `--tt-color-yellow-dec-3`   | Status   | CSS color      | Status palette step         | `#7a6a00`                                                                                                        | `#7a6a00`                                                                                                        |
| `--tt-color-yellow-dec-4`   | Status   | CSS color      | Status palette step         | `#524500`                                                                                                        | `#524500`                                                                                                        |
| `--tt-color-yellow-dec-5`   | Status   | CSS color      | Status palette step         | `#2e2600`                                                                                                        | `#2e2600`                                                                                                        |
| `--tt-color-yellow-inc-1`   | Status   | CSS color      | Status palette step         | `#ffe45c`                                                                                                        | `#ffe45c`                                                                                                        |
| `--tt-color-yellow-inc-2`   | Status   | CSS color      | Status palette step         | `#ffeb8a`                                                                                                        | `#ffeb8a`                                                                                                        |
| `--tt-color-yellow-inc-3`   | Status   | CSS color      | Status palette step         | `#fff1ad`                                                                                                        | `#fff1ad`                                                                                                        |
| `--tt-color-yellow-inc-4`   | Status   | CSS color      | Status palette step         | `#fff7d1`                                                                                                        | `#fff7d1`                                                                                                        |
| `--tt-color-yellow-inc-5`   | Status   | CSS color      | Status palette step         | `#fffcf0`                                                                                                        | `#fffcf0`                                                                                                        |
| `--tt-destructive-contrast` | Contrast | CSS percentage | Minimum contrast adjustment | `8%`                                                                                                             | `8%`                                                                                                             |
| `--tt-foreground-contrast`  | Contrast | CSS percentage | Minimum contrast adjustment | `8%`                                                                                                             | `8%`                                                                                                             |
| `--tt-gray-dark-100`        | Palette  | CSS color      | Neutral palette step        | `#202022`                                                                                                        | `#202022`                                                                                                        |
| `--tt-gray-dark-200`        | Palette  | CSS color      | Neutral palette step        | `#2d2d2f`                                                                                                        | `#2d2d2f`                                                                                                        |
| `--tt-gray-dark-300`        | Palette  | CSS color      | Neutral palette step        | `#464649`                                                                                                        | `#464649`                                                                                                        |
| `--tt-gray-dark-400`        | Palette  | CSS color      | Neutral palette step        | `#636369`                                                                                                        | `#636369`                                                                                                        |
| `--tt-gray-dark-50`         | Palette  | CSS color      | Neutral palette step        | `#19191a`                                                                                                        | `#19191a`                                                                                                        |
| `--tt-gray-dark-500`        | Palette  | CSS color      | Neutral palette step        | `#7c7c83`                                                                                                        | `#7c7c83`                                                                                                        |
| `--tt-gray-dark-600`        | Palette  | CSS color      | Neutral palette step        | `#a3a3a8`                                                                                                        | `#a3a3a8`                                                                                                        |
| `--tt-gray-dark-700`        | Palette  | CSS color      | Neutral palette step        | `#c0c0c3`                                                                                                        | `#c0c0c3`                                                                                                        |
| `--tt-gray-dark-800`        | Palette  | CSS color      | Neutral palette step        | `#e0e0e1`                                                                                                        | `#e0e0e1`                                                                                                        |
| `--tt-gray-dark-900`        | Palette  | CSS color      | Neutral palette step        | `#f5f5f5`                                                                                                        | `#f5f5f5`                                                                                                        |
| `--tt-gray-dark-a-100`      | Palette  | CSS color      | Neutral palette step        | `#e7e7f312`                                                                                                      | `#e7e7f312`                                                                                                      |
| `--tt-gray-dark-a-200`      | Palette  | CSS color      | Neutral palette step        | `#eeeef61c`                                                                                                      | `#eeeef61c`                                                                                                      |
| `--tt-gray-dark-a-300`      | Palette  | CSS color      | Neutral palette step        | `#efeff538`                                                                                                      | `#efeff538`                                                                                                      |
| `--tt-gray-dark-a-400`      | Palette  | CSS color      | Neutral palette step        | `#f4f4ff5e`                                                                                                      | `#f4f4ff5e`                                                                                                      |
| `--tt-gray-dark-a-50`       | Palette  | CSS color      | Neutral palette step        | `#e8e8fd0d`                                                                                                      | `#e8e8fd0d`                                                                                                      |
| `--tt-gray-dark-a-500`      | Palette  | CSS color      | Neutral palette step        | `#eceefd80`                                                                                                      | `#eceefd80`                                                                                                      |
| `--tt-gray-dark-a-600`      | Palette  | CSS color      | Neutral palette step        | `#f7f7fda3`                                                                                                      | `#f7f7fda3`                                                                                                      |
| `--tt-gray-dark-a-700`      | Palette  | CSS color      | Neutral palette step        | `#fbfbfebf`                                                                                                      | `#fbfbfebf`                                                                                                      |
| `--tt-gray-dark-a-800`      | Palette  | CSS color      | Neutral palette step        | `#fdfdfde0`                                                                                                      | `#fdfdfde0`                                                                                                      |
| `--tt-gray-dark-a-900`      | Palette  | CSS color      | Neutral palette step        | `#fffffff5`                                                                                                      | `#fffffff5`                                                                                                      |
| `--tt-gray-light-100`       | Palette  | CSS color      | Neutral palette step        | `#f4f4f5`                                                                                                        | `#f4f4f5`                                                                                                        |
| `--tt-gray-light-200`       | Palette  | CSS color      | Neutral palette step        | `#eaeaeb`                                                                                                        | `#eaeaeb`                                                                                                        |
| `--tt-gray-light-300`       | Palette  | CSS color      | Neutral palette step        | `#d5d6d7`                                                                                                        | `#d5d6d7`                                                                                                        |
| `--tt-gray-light-400`       | Palette  | CSS color      | Neutral palette step        | `#a6a7ab`                                                                                                        | `#a6a7ab`                                                                                                        |
| `--tt-gray-light-50`        | Palette  | CSS color      | Neutral palette step        | `#fafafa`                                                                                                        | `#fafafa`                                                                                                        |
| `--tt-gray-light-500`       | Palette  | CSS color      | Neutral palette step        | `#7d7f82`                                                                                                        | `#7d7f82`                                                                                                        |
| `--tt-gray-light-600`       | Palette  | CSS color      | Neutral palette step        | `#53565a`                                                                                                        | `#53565a`                                                                                                        |
| `--tt-gray-light-700`       | Palette  | CSS color      | Neutral palette step        | `#404145`                                                                                                        | `#404145`                                                                                                        |
| `--tt-gray-light-800`       | Palette  | CSS color      | Neutral palette step        | `#2c2d30`                                                                                                        | `#2c2d30`                                                                                                        |
| `--tt-gray-light-900`       | Palette  | CSS color      | Neutral palette step        | `#222325`                                                                                                        | `#222325`                                                                                                        |
| `--tt-gray-light-a-100`     | Palette  | CSS color      | Neutral palette step        | `#0f16240d`                                                                                                      | `#0f16240d`                                                                                                      |
| `--tt-gray-light-a-200`     | Palette  | CSS color      | Neutral palette step        | `#25272d1a`                                                                                                      | `#25272d1a`                                                                                                      |
| `--tt-gray-light-a-300`     | Palette  | CSS color      | Neutral palette step        | `#2f323733`                                                                                                      | `#2f323733`                                                                                                      |
| `--tt-gray-light-a-400`     | Palette  | CSS color      | Neutral palette step        | `#282c336b`                                                                                                      | `#282c336b`                                                                                                      |
| `--tt-gray-light-a-50`      | Palette  | CSS color      | Neutral palette step        | `#3838380a`                                                                                                      | `#3838380a`                                                                                                      |
| `--tt-gray-light-a-500`     | Palette  | CSS color      | Neutral palette step        | `#34373ca3`                                                                                                      | `#34373ca3`                                                                                                      |
| `--tt-gray-light-a-600`     | Palette  | CSS color      | Neutral palette step        | `#24272ec7`                                                                                                      | `#24272ec7`                                                                                                      |
| `--tt-gray-light-a-700`     | Palette  | CSS color      | Neutral palette step        | `#23252ade`                                                                                                      | `#23252ade`                                                                                                      |
| `--tt-gray-light-a-800`     | Palette  | CSS color      | Neutral palette step        | `#1e2024f2`                                                                                                      | `#1e2024f2`                                                                                                      |
| `--tt-gray-light-a-900`     | Palette  | CSS color      | Neutral palette step        | `#1d1e20fa`                                                                                                      | `#1d1e20fa`                                                                                                      |
| `--tt-radius-lg`            | Radii    | CSS length     | Component corner radius     | `0.75rem`                                                                                                        | `0.75rem`                                                                                                        |
| `--tt-radius-md`            | Radii    | CSS length     | Component corner radius     | `0.5rem`                                                                                                         | `0.5rem`                                                                                                         |
| `--tt-radius-sm`            | Radii    | CSS length     | Component corner radius     | `0.375rem`                                                                                                       | `0.375rem`                                                                                                       |
| `--tt-radius-xl`            | Radii    | CSS length     | Component corner radius     | `1rem`                                                                                                           | `1rem`                                                                                                           |
| `--tt-radius-xs`            | Radii    | CSS length     | Component corner radius     | `0.25rem`                                                                                                        | `0.25rem`                                                                                                        |
| `--tt-radius-xxs`           | Radii    | CSS length     | Component corner radius     | `0.125rem`                                                                                                       | `0.125rem`                                                                                                       |
| `--tt-shadow-elevated-md`   | Shadows  | CSS shadow     | Elevated surface shadow     | `0px 16px 48px 0px #1118270a, 0px 12px 24px 0px #1118270a, 0px 6px 8px 0px #11182705, 0px 2px 3px 0px #11182705` | `0px 16px 48px 0px #00000080, 0px 12px 24px 0px #0000003d, 0px 6px 8px 0px #00000038, 0px 2px 3px 0px #0000001f` |

| `--tt-transition-duration-default` | Animation | CSS time | Transition duration | `0.2s` | `0.2s` |
| `--tt-transition-duration-long` | Animation | CSS time | Transition duration | `0.64s` | `0.64s` |
| `--tt-transition-duration-short` | Animation | CSS time | Transition duration | `0.1s` | `0.1s` |
| `--tt-transition-easing-back` | Animation | CSS easing function | Transition timing curve | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |
| `--tt-transition-easing-circ` | Animation | CSS easing function | Transition timing curve | `cubic-bezier(0.79, 0.14, 0.15, 0.86)` | `cubic-bezier(0.79, 0.14, 0.15, 0.86)` |
| `--tt-transition-easing-cubic` | Animation | CSS easing function | Transition timing curve | `cubic-bezier(0.65, 0.05, 0.36, 1)` | `cubic-bezier(0.65, 0.05, 0.36, 1)` |
| `--tt-transition-easing-default` | Animation | CSS easing function | Transition timing curve | `cubic-bezier(0.46, 0.03, 0.52, 0.96)` | `cubic-bezier(0.46, 0.03, 0.52, 0.96)` |
| `--tt-transition-easing-quart` | Animation | CSS easing function | Transition timing curve | `cubic-bezier(0.77, 0, 0.18, 1)` | `cubic-bezier(0.77, 0, 0.18, 1)` |
| `--tt-bg-color` | Surfaces | CSS color | Main editor surface | `var(--white)` | `var(--black)` |
| `--tt-border-color` | Borders | CSS color | Standard component border | `var(--tt-gray-light-a-200)` | `var(--tt-gray-dark-a-200)` |
| `--tt-border-color-tint` | Borders | CSS color | Subtle component border | `var(--tt-gray-light-a-100)` | `var(--tt-gray-dark-a-100)` |
| `--tt-sidebar-bg-color` | Surfaces | CSS color | Sidebar surface | `var(--tt-gray-light-100)` | `var(--tt-gray-dark-100)` |
| `--tt-scrollbar-color` | Surfaces | CSS color | Scrollbar thumb | `var(--tt-gray-light-a-200)` | `var(--tt-gray-dark-a-200)` |
| `--tt-cursor-color` | Palette | CSS color | Text cursor | `var(--tt-brand-color-500)` | `var(--tt-brand-color-400)` |
| `--tt-selection-color` | Palette | CSS color | Selected-text background | `#9d8aff33` | `#7a52ff33` |
| `--tt-card-bg-color` | Surfaces | CSS color | Card surface | `var(--white)` | `var(--tt-gray-dark-50)` |
| `--tt-card-border-color` | Borders | CSS color | Card border | `var(--tt-gray-light-a-100)` | `var(--tt-gray-dark-a-50)` |
| `--tt-color-text-gray` | Text | CSS color | Gray semantic text | `#787673` | `#9c9c9c` |
| `--tt-color-text-brown` | Text | CSS color | Brown semantic text | `#9d6a53` | `#b9856e` |
| `--tt-color-text-orange` | Text | CSS color | Orange semantic text | `#d9730d` | `#c77d48` |
| `--tt-color-text-yellow` | Text | CSS color | Yellow semantic text | `#ca922f` | `#ca994e` |
| `--tt-color-text-green` | Text | CSS color | Green semantic text | `#448361` | `#519e71` |
| `--tt-color-text-blue` | Text | CSS color | Blue semantic text | `#327da9` | `#3699d3` |
| `--tt-color-text-purple` | Text | CSS color | Purple semantic text | `#8f64af` | `#9e69d3` |
| `--tt-color-text-pink` | Text | CSS color | Pink semantic text | `#c24c8b` | `#d15796` |
| `--tt-color-text-red` | Text | CSS color | Red semantic text | `#d34a45` | `#df5553` |
| `--tt-color-text-gray-contrast` | Text | CSS color | Gray text contrast background | `#54473126` | `#ffffff17` |
| `--tt-color-text-brown-contrast` | Text | CSS color | Brown text contrast background | `#d2a28e59` | `#b9674640` |
| `--tt-color-text-orange-contrast` | Text | CSS color | Orange text contrast background | `#e07b3845` | `#e97d2533` |
| `--tt-color-text-yellow-contrast` | Text | CSS color | Yellow text contrast background | `#ecbe4163` | `#b3823d33` |
| `--tt-color-text-green-contrast` | Text | CSS color | Green text contrast background | `#7bb78145` | `#2d9a6533` |
| `--tt-color-text-blue-contrast` | Text | CSS color | Blue text contrast background | `#5ea6cf45` | `#327da933` |
| `--tt-color-text-purple-contrast` | Text | CSS color | Purple text contrast background | `#a881c545` | `#9b60d22e` |
| `--tt-color-text-pink-contrast` | Text | CSS color | Pink text contrast background | `#e189b445` | `#dc4c9238` |
| `--tt-color-text-red-contrast` | Text | CSS color | Red text contrast background | `#f4aa9f66` | `#dd555540` |
| `--tt-color-highlight-yellow` | Palette | CSS color | Yellow semantic highlight | `#fef9c3` | `#6b6524` |
| `--tt-color-highlight-green` | Palette | CSS color | Green semantic highlight | `#dcfce7` | `#509568` |
| `--tt-color-highlight-blue` | Palette | CSS color | Blue semantic highlight | `#e0f2fe` | `#6e92aa` |
| `--tt-color-highlight-purple` | Palette | CSS color | Purple semantic highlight | `#f3e8ff` | `#583e74` |
| `--tt-color-highlight-red` | Palette | CSS color | Red semantic highlight | `#ffe4e6` | `#743e42` |
| `--tt-color-highlight-gray` | Palette | CSS color | Gray semantic highlight | `#f8f8f7` | `#2f2f2f` |
| `--tt-color-highlight-brown` | Palette | CSS color | Brown semantic highlight | `#f4eeee` | `#4a3228` |
| `--tt-color-highlight-orange` | Palette | CSS color | Orange semantic highlight | `#fbecdd` | `#5c3b23` |
| `--tt-color-highlight-pink` | Palette | CSS color | Pink semantic highlight | `#fcf1f6` | `#4e2c3c` |
| `--tt-color-highlight-yellow-contrast` | Palette | CSS color | Yellow highlight contrast | `#fbe604` | `#58531e` |
| `--tt-color-highlight-green-contrast` | Palette | CSS color | Green highlight contrast | `#c7fad8` | `#47855d` |
| `--tt-color-highlight-blue-contrast` | Palette | CSS color | Blue highlight contrast | `#ceeafd` | `#5e86a1` |
| `--tt-color-highlight-purple-contrast` | Palette | CSS color | Purple highlight contrast | `#e4ccff` | `#4c3564` |
| `--tt-color-highlight-red-contrast` | Palette | CSS color | Red highlight contrast | `#ffccd0` | `#643539` |
| `--tt-color-highlight-gray-contrast` | Palette | CSS color | Gray highlight contrast | `#54483126` | `#ffffff18` |
| `--tt-color-highlight-brown-contrast` | Palette | CSS color | Brown highlight contrast | `#d2a28d59` | `#b8654540` |
| `--tt-color-highlight-orange-contrast` | Palette | CSS color | Orange highlight contrast | `#e07c3945` | `#e97e2533` |
| `--tt-color-highlight-pink-contrast` | Palette | CSS color | Pink highlight contrast | `#e188b345` | `#dc4c9138` |

The internal `--white`, `--black`, and `--transparent` aliases are not public.
Neither are component implementation variables such as `--tt-toolbar-*`,
`--tt-table-*`, or `--tt-badge-*`; their names and defaults may change. The
built-in theme files are the documented component-default layer: they define
those implementation variables for every editor component. Build a theme by
overriding the public tokens above rather than copying or relying on internal
component variables.

## Custom theme

Import the base asset and the component-default layer, then override public
tokens on one editor container. The component-default layer is required: base
component rules reference internal variables for controls such as buttons,
menus, inputs, and tables. Its values follow the public palette and semantic
tokens, so a custom theme remains complete without taking ownership of the
internal component contract. Load both built-in layers when the custom theme
has a dark variation.

```css
@import '@i-prikot/editor/styles.css';
@import '@i-prikot/editor/light-theme.css';
@import '@i-prikot/editor/dark-theme.css';

.contract-editor[data-tiptap-theme] {
  --tt-bg-color: #ffffff;
  --tt-sidebar-bg-color: #f3f6fb;
  --tt-card-bg-color: #ffffff;
  --tt-border-color: #cbd5e1;
  --tt-border-color-tint: #e2e8f0;
  --tt-card-border-color: #dbe4ef;
  --tt-scrollbar-color: #cbd5e1;
  --tt-cursor-color: #0f766e;
  --tt-selection-color: rgb(20 184 166 / 25%);
  --tt-brand-color-400: #14b8a6;
  --tt-brand-color-500: #0f766e;
  --tt-color-text-blue: #0369a1;
  --tt-color-highlight-blue: #dbeafe;
  --tt-radius-md: 0.375rem;
  --tt-shadow-elevated-md: 0 12px 28px rgb(15 23 42 / 16%);
}

.contract-editor[data-tiptap-theme='dark'] {
  --tt-bg-color: #101827;
  --tt-sidebar-bg-color: #182235;
  --tt-card-bg-color: #182235;
  --tt-border-color: #334155;
  --tt-border-color-tint: #263449;
  --tt-card-border-color: #334155;
  --tt-scrollbar-color: #334155;
  --tt-cursor-color: #5eead4;
  --tt-selection-color: rgb(94 234 212 / 25%);
  --tt-brand-color-400: #5eead4;
  --tt-brand-color-500: #2dd4bf;
  --tt-color-text-blue: #7dd3fc;
  --tt-color-highlight-blue: #1e3a5f;
  --tt-shadow-elevated-md: 0 12px 28px rgb(0 0 0 / 45%);
}
```

This selector deliberately targets only `.contract-editor`; it cannot change
another editor instance, `html`, `body`, or application controls outside that
container.
