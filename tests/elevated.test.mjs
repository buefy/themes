// Real-browser test: the elevated theme must actually win over Buefy's own
// component rules, in light and dark, regardless of stylesheet order.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { root } from './helpers.mjs'

const buefyCss = readFileSync(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const themeCss = readFileSync(path.join(root, 'dist/elevated.css'), 'utf8')

// [selector of the element to read, pseudo-element or '', expected elevation level]
const SURFACES = [
  ['.box', '', 1],
  ['.card', '', 1],
  ['.dropdown .dropdown-content', '', 2],
  ['.datepicker .dropdown-content', '', 2],
  ['.navbar .navbar-dropdown.is-boxed', '', 2],
  ['.b-tooltip .tooltip-content', '', 2],
  ['.carousel-list.has-shadow', '', 2],
  ['.notices .toast', '', 3],
  ['.notices .snackbar', '', 3],
  ['.b-sidebar .sidebar-content', '', 4],
  ['.modal-card', '', 4],
  ['.modal-card-head', '', 1],
  ['.b-table .table-wrapper.is-card-list tr', '', 1],
  ['.switch .check', ':before', 1]
]

const MARKUP = `
  <div class="box"></div>
  <div class="card"></div>
  <div class="dropdown"><div class="dropdown-content"></div></div>
  <div class="datepicker"><div class="dropdown-content"></div></div>
  <nav class="navbar"><div class="navbar-dropdown is-boxed"></div></nav>
  <div class="b-tooltip"><div class="tooltip-content"></div></div>
  <div class="carousel-list has-shadow"></div>
  <div class="notices"><div class="toast"></div><div class="snackbar"></div></div>
  <div class="b-sidebar"><div class="sidebar-content"></div></div>
  <div class="modal"><div class="modal-card"><header class="modal-card-head"></header></div></div>
  <div class="b-table"><div class="table-wrapper is-card-list"><table><tr><td>x</td></tr></table></div></div>
  <label class="switch"><input type="checkbox"><span class="check"></span></label>
  <a id="link" href="#x">link</a>
  <i id="probe-color" style="color: var(--buefy-focus-ring-color)"></i>
  <i id="probe-1" style="box-shadow: var(--buefy-elevation-1)"></i>
  <i id="probe-2" style="box-shadow: var(--buefy-elevation-2)"></i>
  <i id="probe-3" style="box-shadow: var(--buefy-elevation-3)"></i>
  <i id="probe-4" style="box-shadow: var(--buefy-elevation-4)"></i>`

let browser
before(async () => {
  browser = await chromium.launch()
})
after(async () => {
  await browser?.close()
})

async function open({ os = 'light', order = 'theme-first', theme = true, reducedMotion = 'no-preference' } = {}) {
  const sheets = theme ? (order === 'theme-first' ? [themeCss, buefyCss] : [buefyCss, themeCss]) : [buefyCss]
  const context = await browser.newContext({ colorScheme: os, reducedMotion })
  const page = await context.newPage()
  await page.setContent(
    `<!doctype html><html><head>${sheets.map((s) => `<style>${s}</style>`).join('')}</head><body>${MARKUP}</body></html>`
  )
  return { page, close: () => context.close() }
}

const shadow = (page, selector, pseudo) =>
  page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s), p || null).boxShadow, [selector, pseudo])

for (const os of ['light', 'dark']) {
  for (const order of ['theme-first', 'buefy-first']) {
    test(`elevated surfaces use their elevation token (${os} OS, ${order})`, async () => {
      const { page, close } = await open({ os, order })
      try {
        const failures = []
        for (const [selector, pseudo, level] of SURFACES) {
          const expected = await shadow(page, `#probe-${level}`)
          const actual = await shadow(page, selector, pseudo)
          if (actual !== expected) failures.push(`${selector}${pseudo}: expected elevation-${level} (${expected}), got ${actual}`)
        }
        assert.deepEqual(failures, [])
      } finally {
        await close()
      }
    })
  }
}

test('elevation tokens differ between light and dark', async () => {
  const light = await open({ os: 'light' })
  const dark = await open({ os: 'dark' })
  try {
    for (const level of [1, 2, 3, 4]) {
      assert.notEqual(await shadow(light.page, `#probe-${level}`), await shadow(dark.page, `#probe-${level}`))
    }
  } finally {
    await light.close()
    await dark.close()
  }
})

test('sanity baseline: without the theme Buefy has no modal-card shadow', async () => {
  const bare = await open({ theme: false })
  const themed = await open({})
  try {
    assert.equal(await shadow(bare.page, '.modal-card'), 'none')
    assert.notEqual(await shadow(themed.page, '.modal-card'), 'none')
  } finally {
    await bare.close()
    await themed.close()
  }
})

test('motion variables follow tokens, and collapse under reduced motion', async () => {
  const read = (page, name) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)
  const normal = await open({})
  const reduced = await open({ reducedMotion: 'reduce' })
  try {
    assert.equal(await read(normal.page, '--bulma-speed-slow'), await read(normal.page, '--buefy-motion-duration-normal'))
    assert.equal(await read(normal.page, '--bulma-easing'), await read(normal.page, '--buefy-motion-ease-standard'))
    for (const v of ['--bulma-speed', '--bulma-speed-slow', '--bulma-speed-slower', '--bulma-duration']) {
      // The CSS minifier may print 0.01ms as .01ms, so compare numerically.
      const value = await read(reduced.page, v)
      assert.ok(value.endsWith('ms') && parseFloat(value) === 0.01, `${v} was ${value}`)
    }
  } finally {
    await normal.close()
    await reduced.close()
  }
})

for (const os of ['light', 'dark']) {
  test(`keyboard focus ring uses the focus token (${os} OS)`, async () => {
    const { page, close } = await open({ os })
    try {
      const expected = await page.evaluate(() => getComputedStyle(document.getElementById('probe-color')).color)
      const ringOf = (selector) =>
        page.evaluate((sel) => {
          const s = getComputedStyle(document.querySelector(sel))
          return { color: s.outlineColor, width: s.outlineWidth, offset: s.outlineOffset, style: s.outlineStyle }
        }, selector)
      const expectRing = (ring) => {
        assert.equal(ring.color, expected)
        assert.equal(ring.width, '2px')
        assert.equal(ring.offset, '2px')
        assert.equal(ring.style, 'solid')
      }

      // Tab order: the switch's hidden checkbox comes first, then the link.
      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement?.type), 'checkbox')
      expectRing(await ringOf('.switch .check'))

      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'link')
      expectRing(await ringOf('#link'))
    } finally {
      await close()
    }
  })
}
