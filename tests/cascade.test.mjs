// Real-browser cascade test: computes --buefy-material-tint (a marker token)
// across OS colour scheme, forced themes, nested subtrees and import order
// relative to Buefy's own CSS.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { browserType } from './harness.mjs'
import { compileFixture, root } from './helpers.mjs'

const buefyCss = readFileSync(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const read = (el) => el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue('--buefy-material-tint').trim()

let browser
before(async () => { browser = await browserType.launch() })
after(async () => { await browser?.close() })

async function probe({ css, os, html = '', sub = '' }, order) {
  const sheets = order === 'theme-first' ? [css, buefyCss] : [buefyCss, css]
  const context = await browser.newContext({ colorScheme: os })
  const page = await context.newPage()
  await page.setContent(
    `<!doctype html><html ${html}><head>${sheets.map((s) => `<style>${s}</style>`).join('')}</head>` +
      `<body><div id="sub" ${sub}></div></body></html>`
  )
  const result = await page.evaluate(
    ([fn]) => {
      const read = new Function('el', `return (${fn})(el)`)
      return { root: read(document.documentElement), sub: read(document.getElementById('sub')) }
    },
    [read.toString()]
  )
  await context.close()
  return result
}

const standalone = compileFixture('standalone')
const scoped = compileFixture('scoped')

const standaloneCases = [
  ['light OS, no attributes', { os: 'light' }, 'L', 'L'],
  ['dark OS, no attributes', { os: 'dark' }, 'D', 'D'],
  ['light OS, html data-theme=dark', { os: 'light', html: 'data-theme="dark"' }, 'D', 'D'],
  ['dark OS, html data-theme=light', { os: 'dark', html: 'data-theme="light"' }, 'L', 'L'],
  ['light OS, html.theme-dark', { os: 'light', html: 'class="theme-dark"' }, 'D', 'D'],
  ['dark OS, html.theme-light', { os: 'dark', html: 'class="theme-light"' }, 'L', 'L'],
  ['light OS, dark subtree', { os: 'light', sub: 'data-theme="dark"' }, 'L', 'D'],
  ['dark OS, light subtree', { os: 'dark', sub: 'data-theme="light"' }, 'D', 'L'],
  ['light OS, .theme-dark subtree', { os: 'light', sub: 'class="theme-dark"' }, 'L', 'D'],
  ['dark OS, .theme-light subtree', { os: 'dark', sub: 'class="theme-light"' }, 'D', 'L']
]

const scopedCases = [
  ['no data-buefy-theme: inactive', { os: 'light' }, '', ''],
  ['theme a, light OS', { os: 'light', html: 'data-buefy-theme="a"' }, 'A-L', 'A-L'],
  ['theme a, dark OS', { os: 'dark', html: 'data-buefy-theme="a"' }, 'A-D', 'A-D'],
  ['theme b, light OS', { os: 'light', html: 'data-buefy-theme="b"' }, 'B-L', 'B-L'],
  ['theme b, forced dark on light OS', { os: 'light', html: 'data-buefy-theme="b" data-theme="dark"' }, 'B-D', 'B-D'],
  ['theme b, forced light on dark OS', { os: 'dark', html: 'data-buefy-theme="b" data-theme="light"' }, 'B-L', 'B-L'],
  ['theme a, dark subtree on light OS', { os: 'light', html: 'data-buefy-theme="a"', sub: 'data-theme="dark"' }, 'A-L', 'A-D']
]

for (const order of ['theme-first', 'buefy-first']) {
  for (const [name, opts, root_, sub_] of standaloneCases) {
    test(`standalone, ${order}: ${name}`, async () => {
      assert.deepEqual(await probe({ css: standalone, ...opts }, order), { root: root_, sub: sub_ })
    })
  }
  for (const [name, opts, root_, sub_] of scopedCases) {
    test(`scoped, ${order}: ${name}`, async () => {
      assert.deepEqual(await probe({ css: scoped, ...opts }, order), { root: root_, sub: sub_ })
    })
  }
}
