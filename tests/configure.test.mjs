// Sass configuration of the fluent accent, through the public entry files:
//   @use "pkg:@buefy/themes/fluent" with ($accent: ...)
// Each case compiles the real entry, loads it in a browser next to Buefy's CSS
// and checks what users actually see (colours, contrast), not the Sass text.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import * as sass from 'sass'
import { root } from './helpers.mjs'
import { launch, shutdown, open, style, contrast } from './harness.mjs'

before(launch)
after(shutdown)

function compile(source) {
  return sass.compileString(source, {
    importers: [new sass.NodePackageImporter()],
    loadPaths: [root, path.join(root, 'node_modules')],
    quietDeps: true
  }).css
}

const fluent = (config) => compile(`@use "src/entries/fluent"${config ? ` with (${config})` : ''};`)
const all = (config) => compile(`@use "src/entries/all"${config ? ` with (${config})` : ''};`)

// Resolve a CSS colour to the browser's computed rgb() string.
const rgb = (page, color) =>
  page.evaluate((c) => {
    const el = document.createElement('i')
    el.style.color = c
    document.body.append(el)
    return getComputedStyle(el).color
  }, color)

// Colours round-trip through HSL, so channels may differ by 1-2.
const near = (actual, expected, message) => {
  const a = actual.match(/\d+/g).slice(0, 3).map(Number)
  const b = expected.match(/\d+/g).slice(0, 3).map(Number)
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) <= 2), `${message ?? "colour"}: ${actual} vs ${expected}`)
}

const PURPLE = '#7957d5' // Buefy's own brand purple

for (const os of ['light', 'dark']) {
  test(`$accent: a custom colour drives primary and link buttons, with readable text (${os} OS)`, async () => {
    const { page, close } = await open({ css: fluent(`$accent: ${PURPLE}`), os })
    try {
      for (const id of ['#btn-primary', '#btn-link']) {
        const bg = await style(page, id, 'backgroundColor')
        const text = await style(page, id, 'color')
        if (os === "light") near(bg, await rgb(page, PURPLE), `${id} uses the accent in light`)
        assert.ok(contrast(text, bg) >= 4.5, `${id} text contrast ${contrast(text, bg).toFixed(2)}`)
      }
    } finally {
      await close()
    }
  })
}

test('$accent alone: dark mode gets a lighter accent that is readable on the dark page', async () => {
  const css = fluent(`$accent: ${PURPLE}`)
  const light = await open({ css, os: 'light' })
  const dark = await open({ css, os: 'dark' })
  try {
    const lightBg = await style(light.page, '#btn-primary', 'backgroundColor')
    const darkBg = await style(dark.page, '#btn-primary', 'backgroundColor')
    assert.notEqual(lightBg, darkBg, 'dark accent should differ from the light one')
    const page = await style(dark.page, 'html', 'backgroundColor')
    assert.ok(contrast(darkBg, page) >= 4.5, `accent on dark page ${contrast(darkBg, page).toFixed(2)}:1`)
  } finally {
    await light.close()
    await dark.close()
  }
})

test('$accent-dark is used as given in dark mode', async () => {
  const { page, close } = await open({ css: fluent(`$accent: ${PURPLE}, $accent-dark: #b39cf0`), os: 'dark' })
  try {
    near(await style(page, "#btn-primary", "backgroundColor"), await rgb(page, "#b39cf0"), "accent-dark")
  } finally {
    await close()
  }
})

test('$accent: none keeps the app\u2019s own Bulma palette (no accent is generated)', async () => {
  const bare = await open({})
  const themed = await open({ css: fluent('$accent: none') })
  const defaults = await open({ theme: 'fluent' })
  try {
    assert.equal(
      await style(themed.page, '#btn-primary', 'backgroundColor'),
      await style(bare.page, '#btn-primary', 'backgroundColor'),
      'primary stays Bulma turquoise'
    )
    // ...while the rest of the theme still applies.
    assert.equal(await style(themed.page, '.box', 'borderRadius'), '8px')
    assert.notEqual(
      await style(themed.page, '#btn-primary', 'backgroundColor'),
      await style(defaults.page, '#btn-primary', 'backgroundColor')
    )
    assert.ok(!/--bulma-primary-h:/.test(fluent('$accent: none')), 'no palette variables are emitted')
  } finally {
    await bare.close()
    await themed.close()
    await defaults.close()
  }
})

test('no configuration is identical to the shipped default (standalone and root entry)', () => {
  assert.equal(fluent(), fluent('$accent: null'))
  assert.equal(all(), all('$fluent-accent: null'))
})

test('root entry: $fluent-accent configures only the fluent scope', async () => {
  const { page, close } = await open({ css: all(`$fluent-accent: ${PURPLE}`), htmlAttrs: 'data-buefy-theme="fluent"' })
  try {
    near(await style(page, "#btn-primary", "backgroundColor"), await rgb(page, PURPLE), "fluent scope accent")
  } finally {
    await close()
  }
  // elevated and glass keep Bulma's turquoise primary.
  const bare = await open({})
  for (const name of ['elevated', 'glass']) {
    const other = await open({ css: all(`$fluent-accent: ${PURPLE}`), htmlAttrs: `data-buefy-theme="${name}"` })
    try {
      assert.equal(await style(other.page, '#btn-primary', 'backgroundColor'), await style(bare.page, '#btn-primary', 'backgroundColor'), name)
    } finally {
      await other.close()
    }
  }
  await bare.close()
})

test('invalid configuration fails the build with a helpful message', () => {
  assert.throws(() => fluent('$accent: "blue"'), /\$accent must be a colour, null \(the default\) or none/)
  assert.throws(() => fluent('$accent: 12px'), /\$accent must be a colour/)
  assert.throws(() => fluent(`$accent: ${PURPLE}, $accent-dark: nope`), /\$accent-dark must be a colour/)
})

test('unknown configuration variables are rejected by Sass', () => {
  assert.throws(() => fluent('$acent: red'), /This variable was not declared with !default/)
})

// A spread of brand colours: dark, mid-tone, bright, warm, cool, grey.
const BRANDS = ['#7957d5', '#d13438', '#107c10', '#ffb900', '#00b7c3', '#e3008c', '#767676', '#0f6cbd', '#8764b8']

test('any single accent gives readable filled buttons, and an accent readable on the dark page', async () => {
  const failures = []
  for (const brand of BRANDS) {
    const css = fluent(`$accent: ${brand}`)
    for (const os of ['light', 'dark']) {
      const { page, close } = await open({ css, os })
      try {
        const bg = await style(page, '#btn-primary', 'backgroundColor')
        const text = await style(page, '#btn-primary', 'color')
        const ratio = contrast(text, bg)
        if (ratio < 4.5) failures.push(`${brand} ${os}: filled button text ${ratio.toFixed(2)}:1`)
        if (os === 'dark') {
          const onPage = contrast(bg, await style(page, 'html', 'backgroundColor'))
          if (onPage < 4.5) failures.push(`${brand} dark: accent on page ${onPage.toFixed(2)}:1`)
        }
      } finally {
        await close()
      }
    }
  }
  assert.deepEqual(failures, [])
})
