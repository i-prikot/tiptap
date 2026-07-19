# `@i-prikot/editor` theming

`@i-prikot/editor` exposes a scoped CSS custom-property contract for theming.
Import the package stylesheet first, then load consumer overrides after it:

```css
@import '@i-prikot/editor/style.css';
@import './editor-theme.css';
```

Apply overrides to the editor root. This keeps separate editor instances
independent and avoids leaking styles into the surrounding application.

```css
/* Light editor instance */
.tinyfy-editor {
  --tt-bg-color: #ffffff;
  --tt-border-color: #d9d8ff;
  --tt-brand-color-500: #5540d9;
  --tt-color-text-blue: #246b9b;
  --tt-color-highlight-blue: #dff2ff;
  --tt-radius-md: 0.625rem;
  --tt-shadow-elevated-md: 0 18px 48px rgb(33 24 94 / 18%);
}

/* The same instance when it has the `dark` class */
.tinyfy-editor.dark {
  --tt-bg-color: #171622;
  --tt-border-color: #4c4970;
  --tt-brand-color-400: #9b8cff;
  --tt-color-text-blue: #83c7ff;
  --tt-color-highlight-blue: #324c6d;
  --tt-radius-md: 0.625rem;
  --tt-shadow-elevated-md: 0 18px 48px rgb(0 0 0 / 48%);
}
```

## Supported variables

Only the `--tt-*` names below are public and safe to override. Default values
and the built-in light/dark overrides are shipped in `@i-prikot/editor/style.css`.
Their source of truth is
[`packages/editor/src/styles/design-tokens.css`](https://github.com/i-prikot/tiptap/blob/main/packages/editor/src/styles/design-tokens.css).

| Family                    | Exact supported names                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Core surfaces             | `--tt-{bg,border,sidebar-bg,scrollbar,cursor,selection,card-bg,card-border}-color` and `--tt-border-color-tint`                           |
| Neutral light/dark scales | `--tt-gray-{light,dark}-{50,100,200,300,400,500,600,700,800,900}` and `--tt-gray-{light,dark}-a-{50,100,200,300,400,500,600,700,800,900}` |
| Brand scale               | `--tt-brand-color-{50,100,200,300,400,500,600,700,800,900,950}`                                                                           |
| Status scales             | `--tt-color-{green,yellow,red}-{inc-5,inc-4,inc-3,inc-2,inc-1,base,dec-1,dec-2,dec-3,dec-4,dec-5}`                                        |
| Semantic text             | `--tt-color-text-{gray,brown,orange,yellow,green,blue,purple,pink,red}` and each corresponding `-contrast` name                           |
| Semantic highlights       | `--tt-color-highlight-{yellow,green,blue,purple,red,gray,brown,orange,pink}` and each corresponding `-contrast` name                      |
| Elevation and shape       | `--tt-shadow-elevated-md`, `--tt-radius-{xxs,xs,sm,md,lg,xl}`                                                                             |
| Motion                    | `--tt-transition-duration-{short,default,long}`, `--tt-transition-easing-{default,cubic,quart,circ,back}`                                 |
| Contrast percentages      | `--tt-{accent,destructive,foreground}-contrast`                                                                                           |

The unprefixed `--white`, `--black`, and `--transparent` aliases are internal
implementation details. Do not override or depend on them. Other CSS custom
properties used by individual components are likewise not covered by this
contract.

## Compatibility

The documented `--tt-*` names are the public theming API of
`@i-prikot/editor`. Adding documented tokens is non-breaking. Removing or
renaming a documented token requires a versioned breaking-change path; it will
not be silently replaced.
