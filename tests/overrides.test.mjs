// How an app overrides a theme token. The README documents the selector that
// works; this test proves it, and records which simpler selectors do NOT work
// (so the README's advice cannot quietly become wrong).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { launch, shutdown, open, style } from './harness.mjs'

before(launch)
after(shutdown)

const MARK = 'rgb(255, 0, 0) 0px 0px 0px 7px' // computed form of the override below (Chromium puts the colour first)
const OVERRIDE = '0 0 0 7px red'

// Scenarios in which a token override must still apply.
const SCENARIOS = [
  ['light OS', { os: 'light' }],
  ['dark OS (system preference)', { os: 'dark' }],
  ['light OS, html data-theme=dark', { os: 'light', htmlAttrs: 'data-theme="dark"' }],
  ['dark OS, html data-theme=light', { os: 'dark', htmlAttrs: 'data-theme="light"' }],
  ['dark OS, html.theme-dark', { os: 'dark', htmlAttrs: 'class="theme-dark"' }]
]

async function elevation1(selector, options, theme = 'fluent') {
  const { page, close } = await open({ theme, ...options })
  try {
    // Appended last, like an app stylesheet loaded after the theme.
    await page.addStyleTag({ content: `${selector} { --buefy-elevation-1: ${OVERRIDE}; }` })
    return await style(page, '#probe-1', 'boxShadow')
  } finally {
    await close()
  }
}

for (const theme of ['elevated', 'fluent', 'glass']) {
  for (const [label, options] of SCENARIOS) {
    test(`override: html:root:root:root:root:root wins (${theme}, ${label})`, async () => {
      assert.equal(await elevation1('html:root:root:root:root:root', options, theme), MARK)
    })
  }
}

test('override works for the root entry too (data-buefy-theme)', async () => {
  for (const [label, base] of SCENARIOS) {
    const { page, close } = await open({
      theme: 'all',
      ...base,
      htmlAttrs: `${base.htmlAttrs ?? ''} data-buefy-theme="fluent"`.trim()
    })
    try {
      await page.addStyleTag({ content: `html:root:root:root:root:root { --buefy-elevation-1: ${OVERRIDE}; }` })
      assert.equal(await style(page, '#probe-1', 'boxShadow'), MARK, label)
    } finally {
      await close()
    }
  }
})

test('a plain :root rule does NOT override (the README says to use the longer selector)', async () => {
  assert.notEqual(await elevation1(':root', { os: 'light' }), MARK)
})

test('a :root:root rule works in light but loses to the dark scheme, so it is not recommended', async () => {
  assert.equal(await elevation1(':root:root', { os: 'light' }), MARK)
  assert.notEqual(await elevation1(':root:root', { os: 'dark' }), MARK)
})
