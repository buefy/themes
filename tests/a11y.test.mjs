// axe-core audit of the component gallery (WCAG 2.0/2.1/2.2 A and AA rules).
//
// Plain Buefy is audited first. A theme must introduce NO violation that plain
// Buefy does not already have, in light and dark, so we only ever fail on what
// a theme changed. Baseline issues are printed so they stay visible.
//
// The colourful #backdrop-demo section is excluded: axe cannot see through a
// backdrop-filter, so contrast over translucent surfaces is checked numerically
// against worst-case backdrops in fluent.test.mjs and glass.test.mjs instead.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { launch, shutdown, openGallery } from './harness.mjs'

before(launch)
after(shutdown)

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const THEMES = [
  { label: 'elevated', options: { theme: 'elevated' } },
  { label: 'fluent', options: { theme: 'fluent' } },
  { label: 'glass', options: { theme: 'glass' } },
  { label: 'all (fluent)', options: { theme: 'all', htmlAttrs: 'data-buefy-theme="fluent"' } },
  { label: 'all (glass)', options: { theme: 'all', htmlAttrs: 'data-buefy-theme="glass"' } }
]
const SCHEMES = ['light', 'dark']

async function audit(options) {
  const { page, close } = await openGallery(options)
  try {
    await page.addScriptTag({ content: axeSource })
    const violations = await page.evaluate(async () => {
      const results = await axe.run(
        { include: [['body']], exclude: [['#backdrop-demo']] },
        {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations']
        }
      )
      return results.violations.flatMap((v) =>
        v.nodes.map((n) => ({
          rule: v.id,
          target: n.target.join(' '),
          detail: (n.any[0] ?? n.all[0] ?? n.none[0])?.message ?? v.help
        }))
      )
    })
    return violations
  } finally {
    await close()
  }
}

const key = (v) => `${v.rule} @ ${v.target}`

for (const os of SCHEMES) {
  test(`axe: themes add no accessibility violations beyond plain Buefy (${os})`, async () => {
    const baseline = await audit({ os })
    const baselineKeys = new Set(baseline.map(key))
    if (baseline.length) {
      console.log(`# plain Buefy (${os}) already has ${baseline.length} violation(s):`)
      for (const v of baseline) console.log(`#   ${key(v)}: ${v.detail}`)
    }

    const introduced = []
    for (const { label, options } of THEMES) {
      for (const v of await audit({ ...options, os })) {
        if (!baselineKeys.has(key(v))) introduced.push(`${label}: ${key(v)}: ${v.detail}`)
      }
    }
    assert.deepEqual(introduced, [], 'a theme introduced violations that plain Buefy does not have')
  })
}

test('axe: the audit actually detects problems (guard against a vacuous pass)', async () => {
  const { page, close } = await openGallery({})
  try {
    await page.addScriptTag({ content: axeSource })
    // Inject a known violation: light grey text on white.
    await page.evaluate(() => {
      const p = document.createElement('p')
      p.id = 'bad'
      p.style.cssText = 'color:#ccc;background:#fff'
      p.textContent = 'Low contrast text that axe must flag'
      document.querySelector('main .container').append(p)
    })
    const rules = await page.evaluate(async () => {
      const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] }, resultTypes: ['violations'] })
      return results.violations.map((v) => v.id)
    })
    assert.ok(rules.includes('color-contrast'), `expected color-contrast, got ${rules.join(', ') || 'nothing'}`)
  } finally {
    await close()
  }
})
