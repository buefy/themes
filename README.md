# @buefy/themes

Official themes for [Buefy](https://buefy.org) (Vue 3, built on Bulma v1). They add elevation, restrained materials, purposeful motion and calmer hierarchy, with no changes to your markup and no runtime JavaScript.

> **Status: pre-release scaffold.** The package structure and build pipeline exist; the themes themselves are not implemented yet. Nothing here is published.

## Planned usage

```js
import 'buefy/dist/css/buefy.css'
import '@buefy/themes/fluent'   // or /elevated, /glass
```

| Subpath | Look |
|---|---|
| `@buefy/themes/elevated` | Conservative upgrade: keeps Bulma colours, adds a consistent elevation scale, radii, motion and focus. |
| `@buefy/themes/fluent` | Calm, precise, productivity-app feel. |
| `@buefy/themes/glass` | Frosted transient surfaces (dropdowns, modals, toasts). |
| `@buefy/themes` | All themes, inactive until `<html data-buefy-theme="fluent">` is set. |

Sass users will be able to `@use "pkg:@buefy/themes/fluent"`.

## Disclaimer

The `fluent` theme is inspired by Microsoft's Fluent Design System. This project is not affiliated with or endorsed by Microsoft, and ships no Microsoft fonts, icons or assets.

## Development

Requires Node 20 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run build    # compile src/entries/* to dist/
npm test         # build, check the exports map, run publint
```

Releases: bump `version` in `package.json`, then push a matching `v*` tag. The publish workflow runs `npm test` and publishes with provenance (needs an `NPM_TOKEN` repository secret and the `@buefy` npm org).

## License

[MIT](LICENSE)
