// fluent-specific behaviour: accent, neutral surfaces, radii, type, frosted
// flyouts, and accessibility (WCAG AA contrast) in light and dark.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { root } from './helpers.mjs'
import { launch, shutdown, open, style, rootVar, parseRgb, contrast } from './harness.mjs'

before(launch)
after(shutdown)

const OS = ['light', 'dark']

// The accent is defined as hsl(209, 85%, 40%) in src/themes/fluent/_index.scss.
// Resolve it through the browser so rounding matches exactly.
async function accentRgb(page) {
  return page.evaluate(() => {
    const el = document.createElement('i')
    el.style.color = 'hsl(209, 85%, 40%)'
    document.body.append(el)
    return getComputedStyle(el).color
  })
}

for (const os of OS) {
  test(`accent: primary and link buttons use the fluent blue (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      const accent = await accentRgb(page)
      assert.equal(await style(page, '#btn-primary', 'backgroundColor'), accent)
      assert.equal(await style(page, '#btn-link', 'backgroundColor'), accent)
    } finally {
      await close()
    }
  })

  test(`accent: button text meets WCAG AA 4.5:1 (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      for (const id of ['#btn-primary', '#btn-link']) {
        const ratio = contrast(await style(page, id, 'color'), await style(page, id, 'backgroundColor'))
        assert.ok(ratio >= 4.5, `${id} contrast ${ratio.toFixed(2)}`)
      }
    } finally {
      await close()
    }
  })

  test(`surfaces: greys are neutral and body text meets AA (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      const pageBg = await style(page, 'html', 'backgroundColor')
      const cardBg = await style(page, '.box', 'backgroundColor')
      for (const colour of [pageBg, cardBg]) {
        const { r, g, b } = parseRgb(colour)
        assert.ok(Math.abs(r - g) <= 1 && Math.abs(g - b) <= 1, `expected a neutral grey, got ${colour}`)
      }
      const text = await style(page, 'body', 'color')
      assert.ok(contrast(text, pageBg) >= 4.5, `text on page ${contrast(text, pageBg).toFixed(2)}`)
      assert.ok(contrast(text, cardBg) >= 4.5, `text on card ${contrast(text, cardBg).toFixed(2)}`)
    } finally {
      await close()
    }
  })

  test(`focus ring has at least 3:1 contrast against page and cards (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      const ring = await style(page, '#probe-color', 'color')
      for (const bg of [await style(page, 'html', 'backgroundColor'), await style(page, '.box', 'backgroundColor')]) {
        assert.ok(contrast(ring, bg) >= 3, `ring ${ring} on ${bg}: ${contrast(ring, bg).toFixed(2)}`)
      }
    } finally {
      await close()
    }
  })
}

test('radii are tighter than Bulma, including the hardcoded card radius', async () => {
  const { page, close } = await open({ theme: 'fluent' })
  try {
    assert.equal(await style(page, '.box', 'borderRadius'), '8px')
    assert.equal(await style(page, '.card', 'borderRadius'), '8px')
    assert.equal(await style(page, '#input', 'borderRadius'), '4px')
  } finally {
    await close()
  }
})

test('typography uses the system stack and bundles no webfonts', async () => {
  const { page, close } = await open({ theme: 'fluent' })
  try {
    const family = await style(page, 'body', 'fontFamily')
    assert.match(family, /Segoe UI Variable Text/)
    assert.match(family, /system-ui/)
  } finally {
    await close()
  }
  const css = readFileSync(path.join(root, 'dist/fluent.css'), 'utf8')
  assert.doesNotMatch(css, /@font-face|url\(/, 'fluent must not bundle fonts or assets')
})

for (const os of OS) {
  test(`material: dropdown flyouts are frosted, nothing else is (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      const frosted = await style(page, '.dropdown .dropdown-content', 'backdropFilter')
      assert.match(frosted, /blur\(30px\)/)
      assert.match(frosted, /saturate\(1\.25\)/)
      assert.ok(parseRgb(await style(page, '.dropdown .dropdown-content', 'backgroundColor')).a < 1, 'tint should be translucent')

      for (const selector of ['.box', '.card', '.modal-card', '.b-tooltip .tooltip-content', '.notices .toast', '#btn-primary']) {
        assert.equal(await style(page, selector, 'backdropFilter'), 'none', `${selector} must not be frosted`)
      }
    } finally {
      await close()
    }
  })

  test(`material: flyout text stays AA on the worst-case backdrop (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'fluent', os })
    try {
      // Worst case for a translucent tint: the backdrop is the opposite extreme.
      const tint = parseRgb(await style(page, '.dropdown .dropdown-content', 'backgroundColor'))
      const text = await style(page, 'body', 'color')
      const backdrop = os === 'light' ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }
      const mixed = `rgb(${[tint.r, tint.g, tint.b]
        .map((c, i) => Math.round(c * tint.a + [backdrop.r, backdrop.g, backdrop.b][i] * (1 - tint.a)))
        .join(', ')})`
      const ratio = contrast(text, mixed)
      assert.ok(ratio >= 4.5, `text on worst-case backdrop ${mixed}: ${ratio.toFixed(2)}`)
    } finally {
      await close()
    }
  })
}

test('material falls back to a solid surface in forced-colors mode', async () => {
  const { page, close } = await open({ theme: 'fluent', forcedColors: 'active' })
  try {
    assert.equal(await style(page, '.dropdown .dropdown-content', 'backdropFilter'), 'none')
  } finally {
    await close()
  }
})

test('material fallbacks exist in the shipped CSS (static check)', () => {
  const css = readFileSync(path.join(root, 'dist/fluent.css'), 'utf8')
  const tree = postcss.parse(css)
  const flyout = (atRule) => {
    let found
    atRule.walkRules((rule) => {
      if (rule.selectors.some((s) => s.endsWith('.dropdown-content'))) found = rule
    })
    return found
  }
  const at = (name, re) => {
    let match
    tree.walkAtRules(name, (rule) => {
      if (re.test(rule.params)) match = rule
    })
    return match
  }

  // blur is only applied inside a feature query, with the Safari prefix
  const supports = at('supports', /backdrop-filter/)
  assert.ok(supports, 'blur must sit behind @supports')
  assert.match(supports.params, /-webkit-backdrop-filter/)
  assert.match(supports.toString(), /-webkit-backdrop-filter:\s*blur/)

  // reduced transparency and forced colours both remove blur
  for (const [name, re] of [['media', /prefers-reduced-transparency:\s*reduce/], ['media', /forced-colors:\s*active/]]) {
    const rule = at(name, re)
    assert.ok(rule, `missing @media for ${re}`)
    assert.match(flyout(rule).toString(), /backdrop-filter:\s*none/)
  }
})
