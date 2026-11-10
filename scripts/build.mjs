// Baseline build: compiles each Sass entry to dist/<name>.css, writes the
// empty type shim and a manifest. Theme logic arrives in later milestones.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })

for (const [file, name] of Object.entries(entries)) {
  const result = sass.compile(path.join(root, 'src', 'entries', `${file}.scss`), {
    loadPaths: [path.join(root, 'node_modules')],
    importers: [new sass.NodePackageImporter()],
    style: 'expanded',
    // Bulma's own Sass triggers deprecation warnings we cannot fix here.
    quietDeps: true
  })
  const { code } = transform({
    filename: `${name}.css`,
    code: Buffer.from(result.css),
    minify: false,
    // Without targets Lightning CSS strips vendor prefixes it thinks are
    // unnecessary, which would drop -webkit-backdrop-filter for older Safari.
    targets
  })
  await writeFile(path.join(dist, `${name}.css`), code)
}

// Empty module so side-effect imports typecheck under noUncheckedSideEffectImports.
await writeFile(path.join(dist, 'css.d.ts'), 'export {}\n')

await writeFile(
  path.join(dist, 'manifest.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      themes: ['elevated', 'fluent', 'glass'].map((theme) => ({
        name: theme,
        import: `${pkg.name}/${theme}`
      })),
      all: { import: pkg.name, attribute: 'data-buefy-theme' }
    },
    null,
    2
  ) + '\n'
)

console.log(`built ${Object.keys(entries).length} entries -> ${pathToFileURL(dist).pathname}`)
