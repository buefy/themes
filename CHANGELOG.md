# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/). Until 1.0, a change to the
public token schema (`--buefy-*`) may happen in a minor release; it will be listed
here.

## [Unreleased]

### Added

- **Sass configuration of the `fluent` accent:** `@use "pkg:@buefy/themes/fluent" with ($accent: …, $accent-dark: …)`, `$accent: none` to keep your own Bulma palette, and `$fluent-accent` / `$fluent-accent-dark` on the root entry. A single `$accent` derives a dark-mode accent that is readable on the dark page, and filled-button text is chosen for contrast. Default output is unchanged.
- README: token reference, how to override a token (`html:root:root:root:root:root`), screenshots.
- Repository files: `.editorconfig`, issue and pull request templates, `CONTRIBUTING.md`, funding, CodeQL.

### Changed

- Glass contrast tests now include the toast's element opacity (tests only; no CSS change).
- The real-browser tests also run in Firefox (`BROWSER=firefox npm run test:cascade`, and a CI job). Visual regression and the `prefers-reduced-transparency` tests remain Chromium-only; WebKit is still untested.
- CI and publish workflows use `actions/*@v7`; Dependabot keeps dependencies and Actions current.

## [0.1.0] - Unreleased

First release.

### Added

- **Three themes**, each importable on its own:
  - `@buefy/themes/elevated`: keeps Bulma's colours; adds a four-level elevation
    scale, calmer motion, reduced-motion support and a visible focus ring.
  - `@buefy/themes/fluent`: neutral two-layer surfaces, a generated blue accent
    (lighter in dark mode), system font stack, tighter radii, hairline strokes,
    decelerate-in motion and frosted dropdown flyouts. Inspired by Microsoft's
    Fluent Design System; not affiliated with Microsoft.
  - `@buefy/themes/glass`: frosted dropdown flyouts, modal cards, neutral toasts
    and snackbars, plus an opt-in frosted navbar (`<nav class="navbar is-glass">`).
    Soft shadows and rounder corners. Page content and coloured toasts stay opaque.
- **`@buefy/themes`**: all three themes, scoped under `<html data-buefy-theme="NAME">`
  for switching at runtime. Inert until the attribute is set.
- **`@buefy/themes/manifest`**: machine-readable description (themes, imports,
  activation, every public token, sizes, accessibility guarantees).
- **Public token schema** of 19 `--buefy-*` custom properties (elevation, motion,
  focus, material, surface).
- **Sass route**: `@use "pkg:@buefy/themes[/theme]"`.
- Frosted surfaces fall back to solid without `backdrop-filter`, under
  `prefers-reduced-transparency`, and in forced-colors mode.

### Quality gates

- Contract test against the installed Buefy CSS (fails if an overridden selector or
  variable disappears upstream).
- Real-browser tests in light and dark: elevation, motion, focus rings, material,
  stylesheet-order independence, nested light/dark subtrees.
- Root entry verified to render exactly like each standalone entry, on every
  computed property of every element.
- WCAG AA contrast over worst-case black and white backdrops; axe-core audit of a
  component gallery; visual regression screenshots (desktop, mobile, RTL).
- Consumer tests: the packed tarball installed into a fresh project and used from
  Vite, CSS `@import`, Vite SSR, Sass, Node ESM and TypeScript.
- Size budget enforced in CI.

### Known limitations

See the "Limitations" section of the README.
