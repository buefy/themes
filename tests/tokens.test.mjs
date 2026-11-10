import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compileFixture } from './helpers.mjs'

test('standalone output covers all four light/dark triggers', () => {
  const css = compileFixture('standalone')
  assert.match(css, /:root:root,\s*:root:root \[data-theme="?light"?\],\s*:root:root \.theme-light/)
  assert.match(css, /@media \(prefers-color-scheme: dark\)\s*{\s*:root:root:not\(\[data-theme="?light"?\]\):not\(\.theme-light\)/)
  assert.match(css, /:root:root\[data-theme="?dark"?\],\s*:root:root\.theme-dark,\s*:root:root \[data-theme="?dark"?\],\s*:root:root \.theme-dark/)
})

test('scoped output is keyed on data-buefy-theme', () => {
  const css = compileFixture('scoped')
  assert.match(css, /:root:root\[data-buefy-theme="?a"?\]/)
  assert.match(css, /:root:root\[data-buefy-theme="?b"?\]/)
  assert.doesNotMatch(css, /(^|\n):root:root,/, 'scoped output must not apply globally')
})

test('every emitted custom property uses the --buefy- prefix', () => {
  const props = [...compileFixture('standalone').matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1])
  assert.ok(props.length > 0)
  for (const p of props) assert.match(p, /^--buefy-/)
})

test('unknown tokens fail the build', () => {
  assert.throws(() => compileFixture('invalid-token'), /Unknown token "not-a-token"/)
})
