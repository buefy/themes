// The multi-theme entry (@buefy/themes -> dist/all.css) must be inert until
// <html data-buefy-theme="NAME"> is set, and then render EXACTLY like importing
// that theme's standalone entry. Compared on every computed property of every
// element (and ::before), so any drift between the two outputs fails here.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { launch, shutdown, open, snapshot, diffSnapshots, style } from './harness.mjs'

before(launch)
after(shutdown)

const THEMES = ['elevated', 'fluent', 'glass']

// [label, open() options shared by both pages]
const MODES = [
  ['light OS', { os: 'light' }],
  ['dark OS', { os: 'dark' }],
  ['light OS, forced data-theme=dark', { os: 'light', dataTheme: 'dark' }],
  ['dark OS, forced data-theme=light', { os: 'dark', dataTheme: 'light' }],
  ['reduced transparency', { os: 'light', reducedTransparency: true }],
  ['forced colors', { os: 'light', forcedColors: 'active' }],
  ['reduced motion', { os: 'dark', reducedMotion: 'reduce' }]
]

const withAttrs = ({ dataTheme, ...rest }, extra = '') => ({
  ...rest,
  htmlAttrs: `${dataTheme ? `data-theme="${dataTheme}"` : ''} ${extra}`.trim()
})

async function snap(options) {
  const { page, close } = await open(options)
  try {
    return await snapshot(page)
  } finally {
    await close()
  }
}

for (const [label, mode] of MODES) {
  test(`all.css is inert without the attribute (${label})`, async () => {
    const bare = await snap(withAttrs(mode))
    const all = await snap({ ...withAttrs(mode), theme: 'all' })
    assert.deepEqual(diffSnapshots(bare, all), [])
  })

  for (const theme of THEMES) {
    test(`all.css [data-buefy-theme=${theme}] renders exactly like the standalone ${theme} entry (${label})`, async () => {
      const standalone = await snap({ ...withAttrs(mode), theme })
      const scoped = await snap({ ...withAttrs(mode, `data-buefy-theme="${theme}"`), theme: 'all' })
      assert.deepEqual(diffSnapshots(standalone, scoped), [])
    })
  }
}

test('sanity: every theme really differs from plain Buefy (so the equality tests are not vacuous)', async () => {
  const bare = await snap({})
  for (const theme of THEMES) {
    const themed = await snap({ theme })
    assert.ok(diffSnapshots(bare, themed, Infinity).length > 20, `${theme} should change many computed properties`)
  }
  // ...and the themes differ from each other
  const [a, b] = [await snap({ theme: 'elevated' }), await snap({ theme: 'glass' })]
  assert.ok(diffSnapshots(a, b, Infinity).length > 20)
})

test('all.css matches standalone regardless of stylesheet order', async () => {
  for (const theme of THEMES) {
    const standalone = await snap({ theme, order: 'buefy-first' })
    const scoped = await snap({ theme: 'all', order: 'buefy-first', htmlAttrs: `data-buefy-theme="${theme}"` })
    assert.deepEqual(diffSnapshots(standalone, scoped), [], theme)
  }
})

test('switching the attribute at runtime re-themes the page, and removing it restores plain Buefy', async () => {
  const expected = {
    bare: await snap({}),
    ...Object.fromEntries(await Promise.all(THEMES.map(async (theme) => [theme, await snap({ theme })])))
  }

  const { page, close } = await open({ theme: 'all' })
  try {
    const setTheme = (name) =>
      page.evaluate((n) => (n ? document.documentElement.setAttribute('data-buefy-theme', n) : document.documentElement.removeAttribute('data-buefy-theme')), name)

    // Walk through every ordering of a switch, including repeats and removal.
    for (const name of ['fluent', 'glass', 'elevated', 'glass', 'fluent', 'fluent', null, 'elevated', null]) {
      await setTheme(name)
      assert.deepEqual(diffSnapshots(expected[name ?? 'bare'], await snapshot(page)), [], `after switching to ${name ?? 'no theme'}`)
    }
  } finally {
    await close()
  }
})

test('the attribute only works on <html>, and unknown values do nothing', async () => {
  const bare = await snap({})
  assert.deepEqual(
    diffSnapshots(bare, await snap({ theme: 'all', bodyAttrs: 'data-buefy-theme="fluent"' })),
    [],
    'attribute on <body> must have no effect'
  )
  assert.deepEqual(
    diffSnapshots(bare, await snap({ theme: 'all', htmlAttrs: 'data-buefy-theme="nope"' })),
    [],
    'unknown theme name must have no effect'
  )
})

test('the theme attribute composes with the light/dark switch (themed subtrees too)', async () => {
  const { page, close } = await open({ theme: 'all', os: 'light', htmlAttrs: 'data-buefy-theme="fluent"' })
  try {
    const light = await style(page, '.box', 'boxShadow')
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    const dark = await style(page, '.box', 'boxShadow')
    assert.notEqual(light, dark, 'forcing dark must change the elevation')
    await page.evaluate(() => document.documentElement.removeAttribute('data-buefy-theme'))
    assert.notEqual(await style(page, '.box', 'boxShadow'), dark, 'removing the theme must drop its shadow')
  } finally {
    await close()
  }
})
