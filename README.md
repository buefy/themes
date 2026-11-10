# @buefy/themes

Official themes for [Buefy](https://buefy.org) (Vue 3, built on Bulma v1). They add elevation, restrained materials, purposeful motion and calmer hierarchy, with no changes to your markup and no runtime JavaScript.

> **Status: pre-release.** All three themes and the multi-theme entry are implemented. Nothing here is published yet.

## Usage

### One theme

Import **one** theme entry; it applies to the whole document immediately. Do not import more than one standalone entry.

```js
import 'buefy/dist/css/buefy.css'
import '@buefy/themes/fluent'   // or /elevated, /glass
```

### Several themes, switched at runtime

The root entry bundles all three themes, but every rule is scoped to `<html data-buefy-theme="NAME">`, so importing it changes nothing until you pick one.

```js
import 'buefy/dist/css/buefy.css'
import '@buefy/themes'
```

```html
<html data-buefy-theme="fluent">
```

```js
document.documentElement.dataset.buefyTheme = 'glass'   // switch
delete document.documentElement.dataset.buefyTheme      // back to plain Buefy
```

The attribute must be on `<html>` (themes are page-wide, not per subtree). It is independent of Bulma's light/dark switch and composes with it:

```html
<html data-buefy-theme="fluent" data-theme="dark">
```

Tests verify that the root entry renders **exactly** like the matching standalone entry, on every computed property of every element, in light and dark.

### Sass

```scss
@use "pkg:@buefy/themes/fluent";
```

The Sass route imports Bulma's mixins, so it needs `bulma` installed (an optional peer dependency).

### For tools and AI agents

`@buefy/themes/manifest` is a JSON description generated at build time: theme names and one-line summaries, exact import statements, the activation attribute, every public `--buefy-*` token with its description (read from the Sass source), opt-in classes, accessibility guarantees and file sizes.

```js
import manifest from '@buefy/themes/manifest' with { type: 'json' }
```

| Subpath | Look |
|---|---|
| `@buefy/themes/elevated` | Conservative upgrade: keeps Bulma colours, adds a consistent four-level elevation scale, calmer motion, reduced-motion support and a visible focus ring. **Available now.** |
| `@buefy/themes/fluent` | Calm, precise, productivity-app feel: neutral two-layer surfaces, a generated blue accent, system font stack, tighter radii, hairline strokes, decelerate-in motion and acrylic-style frosted dropdown flyouts (solid fallback for reduced transparency, forced colours and older browsers). **Available now.** |
| `@buefy/themes/glass` | Frosted transient surfaces over an opaque page: dropdown flyouts, modal cards, neutral toasts and snackbars, plus an opt-in frosted navbar (`<nav class="navbar is-glass">`). Soft diffused shadows and rounder corners. Boxes, cards, tables, inputs and buttons stay opaque, and coloured toasts (`is-success`, `is-link`, …) keep Bulma's exact solid colour, because translucency would shift their meaning and break contrast. Everything has a solid fallback. **Available now.** |
| `@buefy/themes` | All three themes, inactive until `<html data-buefy-theme="…">` is set. |

CSS sizes (unminified / gzipped): `elevated` 5.6 KB / 1.0 KB, `fluent` 24.5 KB / 2.8 KB, `glass` 12.1 KB / 1.6 KB, all three 46.5 KB / 4.1 KB. Exact figures for each build are in the manifest.

## Frosted material and accessibility

Frosted surfaces (`fluent` flyouts, `glass`) are translucent over a blurred backdrop. They fall back to a solid surface when `backdrop-filter` is unsupported, under `prefers-reduced-transparency`, and in forced-colors mode. Each fallback is exercised in a real browser.

What the test suite checks, in light and dark:

- **Contrast:** WCAG AA (4.5:1) for text on frosted surfaces over worst-case pure black and pure white backdrops, and for button text, body text and the focus ring (3:1).
- **axe-core audit** of a component gallery (WCAG 2.0, 2.1 and 2.2, levels A and AA). A theme must add no violation that plain Buefy does not already have. Plain Buefy itself has two contrast issues in the gallery (the default turquoise outlined button on white, and the `is-light` tag in dark mode); the themes neither add nor fix them, except that `fluent` replaces the turquoise.
- **Visual regression:** screenshots of the gallery for every theme in light and dark, at desktop and mobile width, and right-to-left. Text is rendered transparent so results do not depend on installed fonts.
- **Reduced motion, reduced transparency and forced colors** are emulated and verified.

Custom colours added through Bulma's `$custom-colors` are not part of the standard-colour exclusion list, so verify the contrast of any custom-coloured toast under `glass`.

## Disclaimer

The `fluent` theme is inspired by Microsoft's Fluent Design System. This project is not affiliated with or endorsed by Microsoft, and ships no Microsoft fonts, icons or assets.

## Development

Requires Node 20 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run build    # compile src/entries/* to dist/
npm test         # build, check exports, publint, unit + contract + real-browser tests
npm run playground  # after a build: open playground/dist/index.html (THEME=fluent|glass|all)
```

Browser tests use Playwright; install the browser once with `npx playwright-core install chromium-headless-shell`.

Visual baselines live in `tests/visual/baseline/`. After an intentional visual change, review the result with `npm run playground` and regenerate them with `UPDATE_VISUAL=1 npm run test:visual`. A failed comparison writes the actual image and a diff to `tests/visual/__diff__/` (git-ignored).

### How a theme is built

A theme only supplies values for the public `--buefy-*` tokens (`src/core/_tokens.scss`). `src/core/_mapping.scss` binds those tokens to the `--bulma-*` variables components read, on the same selectors Buefy uses so they win in the cascade. `tests/contract.test.mjs` fails if a selector or variable we override disappears from the installed Buefy.

Each theme (`src/themes/<name>/_index.scss`) exposes one `output($name: null)` mixin. The standalone entry calls it with no name; the root entry calls it with the theme name, which scopes every rule under `<html data-buefy-theme="NAME">`. Because both entries share that one mixin, they cannot drift apart.

Releases: bump `version` in `package.json`, then push a matching `v*` tag. The publish workflow runs `npm test` and publishes with provenance (needs an `NPM_TOKEN` repository secret and the `@buefy` npm org).

## License

[MIT](LICENSE)
