> Thanks for contributing!

# Use of AI

We're fine with contributors using AI tools (Copilot, ChatGPT, Claude, etc.) to help write code, draft issues, or debug problems. Used well, they lower the barrier to contributing. In return, we ask for honesty and accountability:

- **Disclose it.** If AI materially helped produce a PR's code or an issue's content, say so by checking the corresponding box in the issue/PR template. This isn't about shaming AI use; it helps maintainers calibrate how closely to review.
- **You are responsible for it.** Submitting a contribution means you've read, understood, and verified it yourself. "The AI wrote it" is not an excuse for bugs, style violations, made-up APIs, or failing tests.
- **No fabricated or unverified bug reports.** Don't file issues describing behavior you haven't actually reproduced.
- **No unreviewed bulk/"slop" PRs.** Large AI-generated changes that weren't meaningfully reviewed by a human will be closed without much discussion.
- **Respect licensing.** Only submit AI-generated code you have the right to contribute under this project's MIT license.
- **Everything else still applies.** AI-assisted contributions go through the same bar as any other: tests must pass and the guidelines below still hold.

# Raising an Issue

- Make sure the issue hasn't been raised yet.
- Say which theme (`elevated`, `fluent`, `glass`, or the root entry) and whether it happens in light, dark or both.
- Include **screenshots** whenever the issue is visual.

# Submitting a Pull Request

- Branch from `main` and open the PR against `main`.
- It's OK to have multiple small commits while you work; the PR is squashed on merge. The squashed title should be a [Conventional Commit](https://www.conventionalcommits.org/) such as `fix(glass): ...` or `feat(fluent): ...`.
- Run `npm test` before opening the PR. It builds, checks the exports map, the size budget and publint, then runs the unit, contract, real-browser, accessibility and visual tests.
- If you changed packaging, also run `npm run test:consumers` (needs network).
- **Do not commit `dist/`**; it is built on demand and ignored by git.
- Include **screenshots** for visual changes. If the change is intentional, regenerate the baselines with `UPDATE_VISUAL=1 npm run test:visual` and review the images in the diff.
- If you add, rename or remove a `--buefy-*` token, update the schema in `src/core/_tokens.scss`, the README token table and `CHANGELOG.md`. Tokens are the public API.
- If you add a new feature, open a suggestion issue first and get it agreed before working on it.

## Principles

### 1. Keep Bulma and Buefy intact

Themes only restyle. They must not change markup, class names or behavior, and must keep working with the plain Buefy and Bulma CSS and with the user's own overrides.

### 2. Tokens in, Bulma variables out

A theme supplies values for the public `--buefy-*` tokens. `src/core/_mapping.scss` binds those tokens to the `--bulma-*` variables components read, on the same selectors Buefy uses. Prefer a token over a one-off rule; when a value is hardcoded upstream and no variable can reach it, add it to `src/core/_fixes.scss` with a comment so it can be removed when upstream changes.

### 3. Accessible by default

- Text contrast of at least 4.5:1 and focus rings of at least 3:1, in light and dark.
- Frosted (translucent) surfaces need a solid fallback for no `backdrop-filter`, `prefers-reduced-transparency` and `forced-colors`, and must be tested over worst-case black and white backdrops.
- Respect `prefers-reduced-motion`.
- A theme must not add an axe-core violation that plain Buefy does not already have.

### 4. Lightweight

There is no runtime JavaScript, and each CSS file has a size budget in `size-budget.json`. If growth is intended, raise the number in the same commit and explain why.

### 5. Both entries stay identical

Every theme exposes one `output($name: null)` mixin that the standalone entry and the root (`data-buefy-theme`) entry both call. Do not write separate rules for the two entries.

## Sass styleguide

- Use the `.scss` extension and kebab-case names; partials start with `_`.
- Use only double quotes `"`.
- No trailing spaces, and end files with a new line (see `.editorconfig`).
- Order declarations: direct styles, nested tags, pseudo-classes, modifiers, responsive styles.
- Comment anything that works around upstream behavior, and say what to look for to remove it.

# Development Setup

You need [Node.js](https://nodejs.org/) **version >= 20** (`.nvmrc` pins 22).

```bash
npm install
npx playwright-core install chromium-headless-shell   # once, for the browser tests
npm run build        # compile src/entries/* to dist/
npm test             # everything except the consumer tests
npm run test:consumers
BROWSER=firefox npm run test:cascade   # the same browser tests in Firefox (npx playwright-core install firefox)
npm run playground   # then open playground/dist/index.html (THEME=fluent|glass|all)
npm run docs:screenshots   # regenerate docs/images for the README
```

## Where things are

| Path | What |
|---|---|
| `src/core/` | token schema, scoping, mapping, fixes, motion, focus, material |
| `src/themes/<name>/` | token values for one theme and its `output()` mixin |
| `src/entries/` | one file per public subpath |
| `scripts/` | build, size check, exports check, gallery, playground, screenshots |
| `tests/` | unit, contract, real-browser, accessibility, visual and consumer tests |

# Releasing

Maintainers only. See the "Releasing" section of the [README](../README.md).
