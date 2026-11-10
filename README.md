# @buefy/themes

Official themes for [Buefy](https://buefy.org) (Vue 3, built on Bulma v1). They add elevation, restrained materials, purposeful motion and calmer hierarchy, with no changes to your markup and no runtime JavaScript.

> **Status: pre-release.** `elevated`, `fluent` and `glass` are implemented; the multi-theme entry is not yet. Nothing here is published.

## Planned usage

```js
import 'buefy/dist/css/buefy.css'
import '@buefy/themes/fluent'   // or /elevated, /glass
```

| Subpath | Look |
|---|---|
| `@buefy/themes/elevated` | Conservative upgrade: keeps Bulma colours, adds a consistent four-level elevation scale, calmer motion, reduced-motion support and a visible focus ring. **Available now.** |
| `@buefy/themes/fluent` | Calm, precise, productivity-app feel: neutral two-layer surfaces, a generated blue accent, system font stack, tighter radii, hairline strokes, decelerate-in motion and acrylic-style frosted dropdown flyouts (solid fallback for reduced transparency, forced colours and older browsers). **Available now.** |
| `@buefy/themes/glass` | Frosted transient surfaces over an opaque page: dropdown flyouts, modal cards, neutral toasts and snackbars, plus an opt-in frosted navbar (`<nav class="navbar is-glass">`). Soft diffused shadows and rounder corners. Boxes, cards, tables, inputs and buttons stay opaque, and coloured toasts (`is-success`, `is-link`, …) keep Bulma's exact solid colour, because translucency would shift their meaning and break contrast. Everything has a solid fallback. **Available now.** |
| `@buefy/themes` | All themes, inactive until `<html data-buefy-theme="fluent">` is set. |

Sass users will be able to `@use "pkg:@buefy/themes/fluent"`.

## Frosted material and accessibility

Frosted surfaces (`fluent` flyouts, `glass`) are translucent over a blurred backdrop. They fall back to a solid surface when `backdrop-filter` is unsupported, under `prefers-reduced-transparency`, and in forced-colors mode. The tests check WCAG AA (4.5:1) text contrast over worst-case pure black and pure white backdrops, in light and dark. Custom colours added through Bulma's `$custom-colors` are not part of the standard-colour exclusion list, so verify the contrast of any custom-coloured toast under `glass`.

## Disclaimer

The `fluent` theme is inspired by Microsoft's Fluent Design System. This project is not affiliated with or endorsed by Microsoft, and ships no Microsoft fonts, icons or assets.

## Development

Requires Node 20 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run build    # compile src/entries/* to dist/
npm test         # build, check exports, publint, unit + contract + real-browser tests
npm run playground  # after a build: open playground/dist/index.html (THEME=fluent for fluent)
```

Browser tests use Playwright; install the browser once with `npx playwright-core install chromium-headless-shell`.

### How a theme is built

A theme only supplies values for the public `--buefy-*` tokens (`src/core/_tokens.scss`). `src/core/_mapping.scss` binds those tokens to the `--bulma-*` variables components read, on the same selectors Buefy uses so they win in the cascade. `tests/contract.test.mjs` fails if a selector or variable we override disappears from the installed Buefy.

Releases: bump `version` in `package.json`, then push a matching `v*` tag. The publish workflow runs `npm test` and publishes with provenance (needs an `NPM_TOKEN` repository secret and the `@buefy` npm org).

## License

[MIT](LICENSE)
