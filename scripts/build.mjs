// Build: compiles each Sass entry to dist/<name>.css, writes the type shim and
// dist/manifest.json (a machine-readable description for tools and AI agents).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import * as sass from 'sass'
import { transform } from 'lightningcss'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = path.join(root, 'dist')
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

// Lightning CSS encodes versions as major << 16 | minor << 8.
const v = (major, minor = 0) => (major << 16) | (minor << 8)
const targets = { chrome: v(100), edge: v(100), firefox: v(100), safari: v(15, 4) }

// entry file -> output name
const entries = {
  _all: 'all',
  _elevated: 'elevated',
  _fluent: 'fluent',
  _glass: 'glass'
}

const sassOptions = {
  loadPaths: [path.join(root, 'node_modules')],
  importers: [new sass.NodePackageImporter()],
  style: 'expanded',
  // Bulma's own Sass triggers deprecation warnings we cannot fix here.
  quietDeps: true
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })

const sizes = {}
for (const [file, name] of Object.entries(entries)) {
  const result = sass.compile(path.join(root, 'src', 'entries', `${file}.scss`), sassOptions)
  const { code } = transform({
    filename: `${name}.css`,
    code: Buffer.from(result.css),
    minify: false,
    // Without targets Lightning CSS strips vendor prefixes it thinks are
    // unnecessary, which would drop -webkit-backdrop-filter for older Safari.
    targets
  })
  await writeFile(path.join(dist, `${name}.css`), code)
  sizes[name] = { bytes: code.length, gzip: gzipSync(code).length }
}

// Empty module so side-effect imports typecheck under noUncheckedSideEffectImports.
await writeFile(path.join(dist, 'css.d.ts'), 'export {}\n')

// --- manifest ---------------------------------------------------------------

// The token schema is read from the Sass source itself, so the manifest cannot
// drift from what the build actually validates.
const tokens = []
sass.compileString('@use "src/core/tokens"; $_: capture(tokens.$schema);', {
  ...sassOptions,
  loadPaths: [root, ...sassOptions.loadPaths],
  functions: {
    'capture($map)': (args) => {
      for (const [key, value] of args[0].assertMap('map').contents) {
        tokens.push({
          name: key.assertString().text,
          property: `--buefy-${key.assertString().text}`,
          description: value.assertString().text
        })
      }
      return sass.sassNull
    }
  }
})
if (!tokens.length) throw new Error('could not read the token schema from src/core/_tokens.scss')

const THEMES = [
  {
    name: 'elevated',
    summary:
      "Conservative upgrade: keeps Bulma's colours and adds a four-level elevation scale, calmer motion, reduced-motion support and a visible focus ring."
  },
  {
    name: 'fluent',
    summary:
      'Calm, precise productivity-app feel: neutral two-layer surfaces, generated blue accent, system font stack, tighter radii, hairline strokes, decelerate-in motion and frosted dropdown flyouts.'
  },
  {
    name: 'glass',
    summary:
      'Frosted transient surfaces over an opaque page: dropdown flyouts, modal cards, neutral toasts and snackbars, and an opt-in frosted navbar. Soft shadows, rounder corners.'
  }
]

const manifest = {
  name: pkg.name,
  version: pkg.version,
  requires: {
    buefy: pkg.peerDependencies.buefy,
    bulma: `${pkg.peerDependencies.bulma} (only for the Sass route)`
  },
  activation: {
    standalone:
      'Import ONE theme entry (e.g. import "@buefy/themes/fluent"). It applies to the whole document immediately. Do not import more than one standalone entry.',
    multiTheme: {
      import: pkg.name,
      attribute: 'data-buefy-theme',
      element: 'html',
      values: THEMES.map((t) => t.name),
      note: 'Inactive until the attribute is set on <html>. Change it at runtime to switch themes; remove it to return to plain Buefy.'
    },
    lightDark:
      "Themes follow Bulma's light/dark switching: prefers-color-scheme, [data-theme=light|dark], .theme-light/.theme-dark, including nested subtrees. The theme axis is independent of the light/dark axis."
  },
  themes: THEMES.map((theme) => ({
    ...theme,
    import: `${pkg.name}/${theme.name}`,
    importStatement: `import '${pkg.name}/${theme.name}'`,
    sass: `@use "pkg:${pkg.name}/${theme.name}";`,
    scoped: { attribute: 'data-buefy-theme', value: theme.name },
    size: sizes[theme.name]
  })),
  all: {
    import: pkg.name,
    importStatement: `import '${pkg.name}'`,
    sass: `@use "pkg:${pkg.name}";`,
    size: sizes.all
  },
  tokens,
  optIn: [
    {
      theme: 'glass',
      selector: 'navbar.is-glass',
      markup: '<nav class="navbar is-glass">',
      description:
        'Frosted navbar. Blur is on a ::before layer so the navbar does not become the containing block for fixed-position mobile dropdowns.'
    }
  ],
  accessibility: {
    contrast:
      'Text contrast of frosted surfaces is tested at WCAG AA (4.5:1) over worst-case pure black and white backdrops, in light and dark. Coloured toasts (is-success, is-link, ...) are never frosted.',
    fallbacks: 'Frosted surfaces fall back to solid without backdrop-filter, under prefers-reduced-transparency, and in forced-colors mode.',
    motion: 'prefers-reduced-motion collapses transition and animation durations.'
  },
  license: pkg.license,
  disclaimer:
    "The fluent theme is inspired by Microsoft's Fluent Design System. This project is not affiliated with or endorsed by Microsoft and ships no Microsoft fonts, icons or assets."
}

await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log(`built ${Object.keys(entries).length} entries -> ${pathToFileURL(dist).pathname}`)
