// Consumer test: pack the real tarball, install it into a fresh project with the
// current Vite, Vue, Sass and TypeScript, and use it the ways a user would.
// Needs network access (npm registry), so it is separate from `npm test`:
//
//   npm run test:consumers
//
// Set KEEP_CONSUMER_DIR=1 to keep the temporary project for inspection.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { root } from './helpers.mjs'

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

function sh(command, args, cwd) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', npm_config_loglevel: 'error' }
  })
  return { status: r.status, out: r.stdout ?? '', err: r.stderr ?? '' }
}

function must(command, args, cwd) {
  const r = sh(command, args, cwd)
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${r.status})\n${r.out}\n${r.err}`)
  return r.out
}

let work // temp directory holding the tarball and the consumer project
let project
let packed // result of `npm pack --json`

const write = (file, content) => {
  const target = path.join(project, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
}

const cssIn = (dir) => {
  const found = []
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) found.push(readFileSync(full, 'utf8'))
    }
  }
  walk(path.join(project, dir))
  return found.join('\n')
}

before(
  () => {
    work = mkdtempSync(path.join(tmpdir(), 'buefy-themes-consumer-'))
    project = path.join(work, 'app')
    mkdirSync(project)

    // Build explicitly, then pack without lifecycle scripts so stdout is clean JSON.
    must('npm', ['run', 'build'], root)
    packed = JSON.parse(must('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', work], root))[0]
    const tarball = path.join(work, packed.filename)

    write(
      'package.json',
      JSON.stringify(
        {
          name: 'consumer',
          private: true,
          type: 'module',
          dependencies: { '@buefy/themes': `file:${tarball}`, buefy: '^3.1.0', vue: '^3.5.0', bulma: '^1.0.4' },
          devDependencies: { vite: '^8.0.0', sass: '^1.89.0', typescript: '^7.0.0' }
        },
        null,
        2
      )
    )

    // --- Vite fixtures: a Vue + Buefy app per way of importing the package ---
    const page = (script) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><div id="app"></div><script type="module" src="${script}"></script></body></html>`
    const app = (themeImport) => `import { createApp } from 'vue'
import Buefy from 'buefy'
import 'buefy/dist/css/buefy.css'
${themeImport}
createApp({ render: () => null }).use(Buefy).mount('#app')
`
    write('fluent.html', page('/src/fluent.js'))
    write('src/fluent.js', app(`import '@buefy/themes/fluent'`))
    write('all.html', page('/src/all.js'))
    write('src/all.js', app(`import '@buefy/themes'`))
    write('cssimport.html', page('/src/cssimport.js'))
    write('src/cssimport.js', `import './style.css'\n`)
    write('src/style.css', `@import "buefy/dist/css/buefy.css";\n@import "@buefy/themes/glass";\n`)
    write(
      'src/server.js',
      `import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import 'buefy/dist/css/buefy.css'
import '@buefy/themes/fluent'
import '@buefy/themes'
const html = await renderToString(createSSRApp({ render: () => h('div', { class: 'box' }, 'ssr ok') }))
console.log(html)
`
    )
    write(
      'build.mjs',
      `import { build } from 'vite'
const targets = {
  fluent: { rollupOptions: { input: 'fluent.html' }, outDir: 'out/fluent' },
  all: { rollupOptions: { input: 'all.html' }, outDir: 'out/all' },
  cssimport: { rollupOptions: { input: 'cssimport.html' }, outDir: 'out/cssimport' },
  ssr: { ssr: 'src/server.js', outDir: 'out/ssr' }
}
const name = process.argv[2]
await build({ root: process.cwd(), logLevel: 'warn', build: { emptyOutDir: true, ...targets[name] } })
`
    )

    // --- Sass ---
    write(
      'sass.mjs',
      `import * as sass from 'sass'
import path from 'node:path'
const uses = {
  all: '@use "pkg:@buefy/themes";',
  elevated: '@use "pkg:@buefy/themes/elevated";',
  fluent: '@use "pkg:@buefy/themes/fluent";',
  glass: '@use "pkg:@buefy/themes/glass";'
}
const out = {}
for (const [name, source] of Object.entries(uses)) {
  out[name] = sass.compileString(source, {
    importers: [new sass.NodePackageImporter()],
    loadPaths: [path.resolve('node_modules')],
    quietDeps: true
  }).css
}
console.log(JSON.stringify(out))
`
    )

    // --- Node resolution ---
    write(
      'resolve.mjs',
      `const out = {
  fluent: import.meta.resolve('@buefy/themes/fluent'),
  root: import.meta.resolve('@buefy/themes'),
  manifest: import.meta.resolve('@buefy/themes/manifest')
}
const code = (specifier) => { try { import.meta.resolve(specifier); return 'resolved' } catch (e) { return e.code } }
out.unknownSubpath = code('@buefy/themes/nope')
out.deepSource = code('@buefy/themes/src/core/_tokens.scss')
out.manifestJson = (await import('@buefy/themes/manifest', { with: { type: 'json' } })).default
out.packageJson = (await import('@buefy/themes/package.json', { with: { type: 'json' } })).default
console.log(JSON.stringify(out))
`
    )

    // --- TypeScript ---
    const tsconfig = (file) =>
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          strict: true,
          noEmit: true,
          noUncheckedSideEffectImports: true,
          types: []
        },
        files: [file]
      })
    write('tsconfig.json', tsconfig('ts/ok.ts'))
    write('tsconfig.bad.json', tsconfig('ts/bad.ts'))
    write(
      'ts/ok.ts',
      `import '@buefy/themes'
import '@buefy/themes/elevated'
import '@buefy/themes/fluent'
import '@buefy/themes/glass'
import manifest from '@buefy/themes/manifest'

export const first: string = manifest.themes[0].name
export const attribute: string = manifest.activation.multiTheme.attribute
`
    )
    write('ts/bad.ts', `import '@buefy/themes/nope'\n`)

    must('npm', ['install', '--no-audit', '--no-fund'], project)
  },
  { timeout: 600000 }
)

after(() => {
  if (!process.env.KEEP_CONSUMER_DIR && work) rmSync(work, { recursive: true, force: true })
  else console.log(`# consumer project kept at ${project}`)
})

test('the tarball contains what is needed and nothing else', () => {
  const files = packed.files.map((f) => f.path)
  const has = (p) => files.includes(p)

  for (const required of [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/all.css',
    'dist/elevated.css',
    'dist/fluent.css',
    'dist/glass.css',
    'dist/manifest.json',
    'dist/css.d.ts',
    'src/entries/_all.scss',
    'src/entries/_fluent.scss',
    'src/core/_tokens.scss'
  ]) {
    assert.ok(has(required), `missing from tarball: ${required}`)
  }

  const unwanted = files.filter((p) => /^(tests|scripts|playground|\.github|node_modules)\//.test(p) || /\.(map|log)$/.test(p) || p.startsWith('size-budget'))
  assert.deepEqual(unwanted, [], 'development files must not be published')

  assert.ok(packed.size < 150 * 1024, `tarball is ${packed.size} bytes`)
  assert.ok(packed.unpackedSize < 600 * 1024, `unpacked is ${packed.unpackedSize} bytes`)
})

test('peer dependencies resolve cleanly (no warnings, buefy and bulma deduplicated)', () => {
  const tree = JSON.parse(must('npm', ['ls', '--all', '--json'], project))
  assert.ok(tree.dependencies['@buefy/themes'], 'themes must be installed')
  assert.equal(tree.problems, undefined, JSON.stringify(tree.problems))
  const themes = tree.dependencies['@buefy/themes']
  assert.equal(themes.version, pkg.version)
})

test('Vite + Vue + Buefy: import "@buefy/themes/fluent" ends up in the built CSS', () => {
  must('node', ['build.mjs', 'fluent'], project)
  const css = cssIn('out/fluent')
  assert.match(css, /--buefy-elevation-1:/)
  assert.match(css, /--bulma-radius-large:\s*8px/, 'fluent radii')
  assert.match(css, /\.dropdown-content/, "Buefy's own CSS is there too")
  assert.doesNotMatch(css, /data-buefy-theme/, 'a standalone theme must not be scoped')
})

test('Vite: import "@buefy/themes" builds the scoped multi-theme CSS', () => {
  must('node', ['build.mjs', 'all'], project)
  const css = cssIn('out/all')
  for (const name of ['elevated', 'fluent', 'glass']) {
    assert.match(css, new RegExp(`data-buefy-theme=["']?${name}`), `${name} must be present and scoped`)
  }
})

test('Vite: CSS @import "@buefy/themes/glass" resolves through the exports map', () => {
  must('node', ['build.mjs', 'cssimport'], project)
  const css = cssIn('out/cssimport')
  assert.match(css, /backdrop-filter/)
  assert.match(css, /--buefy-material-blur:/)
})

test('SSR build bundles and runs with theme CSS imports (Vite SSR; not Nuxt)', () => {
  must('node', ['build.mjs', 'ssr'], project)
  const out = must('node', ['out/ssr/server.js'], project)
  assert.match(out, /ssr ok/)
})

test('Sass: @use "pkg:@buefy/themes[/theme]" compiles every entry', () => {
  const css = JSON.parse(must('node', ['sass.mjs'], project))
  // ok() rather than match(): a failure would otherwise print the whole stylesheet.
  const has = (name, re, message) => assert.ok(re.test(css[name]), `${name}: ${message}`)

  for (const name of ['elevated', 'fluent', 'glass', 'all']) has(name, /--buefy-elevation-1:/, 'emits tokens')
  has('fluent', /--bulma-radius-large:\s*8px/, 'fluent radii')
  has('glass', /backdrop-filter/, 'glass material')
  // Sass output may or may not quote attribute values.
  for (const name of ['elevated', 'fluent', 'glass']) {
    has('all', new RegExp(`data-buefy-theme="?${name}"?`), `scopes ${name}`)
  }
  assert.ok(!/data-buefy-theme/.test(css.fluent), 'a standalone theme must not be scoped')
})

test('Node resolves the exports map and blocks everything else', () => {
  const out = JSON.parse(must('node', ['resolve.mjs'], project))
  assert.match(out.fluent, /node_modules\/@buefy\/themes\/dist\/fluent\.css$/)
  assert.match(out.root, /node_modules\/@buefy\/themes\/dist\/all\.css$/)
  assert.match(out.manifest, /node_modules\/@buefy\/themes\/dist\/manifest\.json$/)
  assert.equal(out.unknownSubpath, 'ERR_PACKAGE_PATH_NOT_EXPORTED')
  assert.equal(out.deepSource, 'ERR_PACKAGE_PATH_NOT_EXPORTED', 'private source files are not importable')
  assert.equal(out.manifestJson.name, '@buefy/themes')
  assert.equal(out.manifestJson.themes.length, 3)
  assert.equal(out.packageJson.version, pkg.version)
})

test('TypeScript: side-effect imports and the manifest typecheck under noUncheckedSideEffectImports', () => {
  const r = sh('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], project)
  assert.equal(r.status, 0, `${r.out}\n${r.err}`)
})

test('TypeScript: importing a subpath that does not exist is an error (the check is real)', () => {
  const r = sh('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.bad.json'], project)
  assert.notEqual(r.status, 0, 'tsc must reject @buefy/themes/nope')
  assert.match(r.out + r.err, /nope/)
})
