// Static invariants of the shipped files: scoping of all.css, token integrity,
// and the manifest. No browser needed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { root } from './helpers.mjs'

const read = (file) => readFileSync(path.join(root, file), 'utf8')
const pkg = JSON.parse(read('package.json'))
const manifest = JSON.parse(read('dist/manifest.json'))
const THEMES = ['elevated', 'fluent', 'glass']
const OUTPUTS = [...THEMES, 'all']

const declared = (css) => {
  const props = new Set()
  postcss.parse(css).walkDecls(/^--buefy-/, (d) => props.add(d.prop))
  return props
}
const referenced = (css) => {
  const props = new Set()
  postcss.parse(css).walkDecls((d) => {
    for (const m of d.value.matchAll(/var\((--buefy-[\w-]+)/g)) props.add(m[1])
  })
  return props
}

for (const name of OUTPUTS) {
  test(`${name}: every --buefy token a rule reads is declared by the same file`, () => {
    const css = read(`dist/${name}.css`)
    const missing = [...referenced(css)].filter((p) => !declared(css).has(p))
    assert.deepEqual(missing, [], 'a rule reads a token this theme never sets (it would silently break)')
  })

  test(`${name}: only schema tokens are ever declared`, () => {
    const allowed = new Set(manifest.tokens.map((t) => t.property))
    const unknown = [...declared(read(`dist/${name}.css`))].filter((p) => !allowed.has(p))
    assert.deepEqual(unknown, [])
  })
}

test('all.css: nothing is global, every rule is scoped to a theme on <html>', () => {
  const tree = postcss.parse(read('dist/all.css'))
  const unscoped = []
  const seen = new Set()
  tree.walkRules((rule) => {
    for (const selector of rule.selectors) {
      const m = selector.match(/^:root:root\[data-buefy-theme="?(\w+)"?\]/)
      if (m) seen.add(m[1])
      else unscoped.push(selector)
    }
  })
  assert.deepEqual(unscoped, [], 'unscoped selectors would change the page even with no theme selected')
  assert.deepEqual([...seen].sort(), [...THEMES].sort())
})

test('all.css contains each theme’s rules exactly once per theme', () => {
  const all = read('dist/all.css')
  for (const name of THEMES) {
    const standalone = postcss.parse(read(`dist/${name}.css`))
    let count = 0
    standalone.walkRules(() => count++)
    let scoped = 0
    postcss.parse(all).walkRules((rule) => {
      if (rule.selectors.every((s) => s.includes(`data-buefy-theme="${name}"`) || s.includes(`data-buefy-theme=${name}`))) scoped++
    })
    assert.equal(scoped, count, `${name}: rule count differs between standalone and all.css`)
  }
})

test('manifest: themes match the package exports and the files on disk', () => {
  assert.equal(manifest.name, pkg.name)
  assert.equal(manifest.version, pkg.version)
  assert.equal(manifest.license, pkg.license)

  const exported = Object.keys(pkg.exports)
    .filter((k) => k.startsWith('./') && !['./manifest', './package.json'].includes(k))
    .map((k) => k.slice(2))
    .sort()
  assert.deepEqual(manifest.themes.map((t) => t.name).sort(), exported)
  assert.deepEqual(manifest.activation.multiTheme.values.slice().sort(), exported)

  for (const theme of manifest.themes) {
    assert.equal(theme.import, `${pkg.name}/${theme.name}`)
    assert.ok(`./${theme.name}` in pkg.exports, `${theme.name} must be an export`)
    assert.ok(theme.summary.length > 20)
    assert.equal(theme.size.bytes, statSync(path.join(root, 'dist', `${theme.name}.css`)).size)
  }
  assert.equal(manifest.all.import, pkg.name)
  assert.equal(manifest.all.size.bytes, statSync(path.join(root, 'dist/all.css')).size)
  assert.equal(manifest.activation.multiTheme.attribute, 'data-buefy-theme')
  assert.equal(manifest.requires.buefy, pkg.peerDependencies.buefy)
  assert.match(manifest.disclaimer, /not affiliated/i)
})

test('manifest: token list is the schema, and the richest theme sets every token', () => {
  assert.ok(manifest.tokens.length >= 19)
  for (const token of manifest.tokens) {
    assert.match(token.property, /^--buefy-/)
    assert.equal(token.property, `--buefy-${token.name}`)
    assert.ok(token.description.length > 5, `${token.name} needs a description`)
  }
  // fluent and glass set the full schema, so no token is documented but unused.
  const fluent = declared(read('dist/fluent.css'))
  const unused = manifest.tokens.map((t) => t.property).filter((p) => !fluent.has(p))
  assert.deepEqual(unused, [])
})
