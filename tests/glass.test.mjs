// glass-specific behaviour: which surfaces are frosted (and which must not be),
// WCAG AA contrast over worst-case backdrops, the opt-in navbar, and fallbacks.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { root } from './helpers.mjs'
import { launch, shutdown, open, style, parseRgb, contrast, compositeOver, fade, BACKDROPS } from './harness.mjs'

before(launch)
after(shutdown)

const OS = ['light', 'dark']
const css = readFileSync(path.join(root, 'dist/glass.css'), 'utf8')

const FROSTED = ['.dropdown .dropdown-content', '.modal-card', '.notices .toast', '.notices .snackbar']
const OPAQUE = [
  '.box',
  '.card',
  '.b-tooltip .tooltip-content',
  '.b-sidebar .sidebar-content',
  '.b-table .table-wrapper.is-card-list tr',
  '#btn-primary',
  '#input',
  '#plain-nav'
]
const COLOURED_TOASTS = ['#toast-primary', '#toast-link', '#toast-info', '#toast-success', '#toast-warning', '#toast-danger']

for (const os of OS) {
  test(`frosted: flyouts, modal card, notices and the glass navbar blur (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'glass', os })
    try {
      for (const selector of FROSTED) {
        const filter = await style(page, selector, 'backdropFilter')
        assert.match(filter, /blur\(24px\)/, `${selector}: ${filter}`)
        assert.match(filter, /saturate\(1\.6\)/, selector)
        assert.ok(parseRgb(await style(page, selector, 'backgroundColor')).a < 1, `${selector} tint should be translucent`)
      }
      // The navbar blurs on its ::before layer, not on the element itself.
      assert.match(await style(page, '#glass-nav', 'backdropFilter', '::before'), /blur\(24px\)/)
      assert.ok(parseRgb(await style(page, '#glass-nav', 'backgroundColor', '::before')).a < 1)
    } finally {
      await close()
    }
  })

  test(`opaque: page content is never frosted (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'glass', os })
    try {
      for (const selector of OPAQUE) {
        assert.equal(await style(page, selector, 'backdropFilter'), 'none', `${selector} must not be frosted`)
      }
      for (const selector of ['.box', '.card', '#input']) {
        assert.equal(parseRgb(await style(page, selector, 'backgroundColor')).a, 1, `${selector} must stay opaque`)
      }
    } finally {
      await close()
    }
  })

  test(`modal card: head, body and foot are transparent over the frosted card (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'glass', os })
    try {
      for (const selector of ['.modal-card-head', '.modal-card-body', '.modal-card-foot']) {
        assert.equal(parseRgb(await style(page, selector, 'backgroundColor')).a, 0, selector)
      }
      assert.equal(await style(page, '.modal-card', 'borderRadius'), '16px')
    } finally {
      await close()
    }
  })

  // Worst case for any translucent surface: the page behind it is pure black or
  // pure white. Text must stay AA (4.5:1) on both.
  test(`contrast: text on every frosted surface meets AA over black and white backdrops (${os} OS)`, async () => {
    const { page, close } = await open({ theme: 'glass', os })
    try {
      const cases = [
        ['dropdown item', '#dd-item', '.dropdown .dropdown-content'],
        ['modal body', '#modal-body', '.modal-card'],
        ['snackbar', '#snackbar .text', '#snackbar'],
        // success-green text: the tightest case (4.36:1 at 90% opacity over white)
        ['snackbar action button', '#snackbar-action', '#snackbar'],
        ['neutral toast', '#toast-default', '#toast-default'],
        ['glass navbar item', '#glass-nav-item', '#glass-nav', '::before']
      ]
      const failures = []
      for (const [label, textSelector, surfaceSelector, pseudo] of cases) {
        const text = await style(page, textSelector, 'color')
        const surface = await style(page, surfaceSelector, 'backgroundColor', pseudo)
        // `opacity` on the surface element fades its text and background together
        // over the backdrop (Buefy gives toasts and snackbars opacity 0.92).
        const opacity = parseFloat(await style(page, surfaceSelector, 'opacity'))
        for (const [name, backdrop] of Object.entries(BACKDROPS)) {
          const seenText = compositeOver(fade(text, opacity), backdrop)
          const seenSurface = compositeOver(fade(surface, opacity), backdrop)
          const ratio = contrast(seenText, seenSurface)
          if (ratio < 4.5) failures.push(`${label} over ${name}: ${ratio.toFixed(2)}:1 (${text} on ${surface}, element opacity ${opacity})`)
        }
      }
      assert.deepEqual(failures, [])
    } finally {
      await close()
    }
  })
}

test('coloured toasts keep Bulma colours exactly: solid, no blur', async () => {
  const bare = await open({})
  for (const os of OS) {
    const { page, close } = await open({ theme: 'glass', os })
    const base = await open({ os })
    try {
      for (const id of COLOURED_TOASTS) {
        assert.equal(await style(page, id, 'backdropFilter'), 'none', `${id} must not be frosted`)
        assert.equal(
          await style(page, id, 'backgroundColor'),
          await style(base.page, id, 'backgroundColor'),
          `${id} must keep Bulma's colour`
        )
      }
    } finally {
      await close()
      await base.close()
    }
  }
  await bare.close()
})

test('navbar: glass is opt-in, and the blur layer does not trap fixed children', async () => {
  const bare = await open({})
  const { page, close } = await open({ theme: 'glass' })
  try {
    // A plain navbar is untouched.
    assert.equal(
      await style(page, '#plain-nav', 'backgroundColor'),
      await style(bare.page, '#plain-nav', 'backgroundColor')
    )
    assert.equal(await style(page, '#plain-nav', 'backgroundColor', '::before'), await style(bare.page, '#plain-nav', 'backgroundColor', '::before'))
    assert.equal(parseRgb(await style(page, '#glass-nav', 'backgroundColor')).a, 0)

    // backdrop-filter on the navbar itself would make it the containing block for
    // fixed descendants (the mobile dropdown). The layer lives on ::before, so a
    // fixed child inside a navbar far down the page still anchors to the viewport.
    for (const prop of ['backdropFilter', 'filter', 'transform']) {
      assert.equal(await style(page, '#glass-nav', prop), 'none', prop)
    }
    const top = await page.evaluate(() => document.getElementById('fixed-child').getBoundingClientRect().top)
    assert.equal(top, 0, 'fixed child must stay anchored to the viewport')
    assert.ok(
      (await page.evaluate(() => document.getElementById('glass-nav').getBoundingClientRect().top)) > 0,
      'sanity: the navbar itself is not at the top of the page'
    )
  } finally {
    await bare.close()
    await close()
  }
})

test('radii are rounder than Bulma', async () => {
  const { page, close } = await open({ theme: 'glass' })
  try {
    assert.equal(await style(page, '.box', 'borderRadius'), '16px')
    assert.equal(await style(page, '.card', 'borderRadius'), '16px')
    assert.equal(await style(page, '#input', 'borderRadius'), '8px')
  } finally {
    await close()
  }
})

test('forced-colors mode removes every blur layer', async () => {
  const { page, close } = await open({ theme: 'glass', forcedColors: 'active' })
  try {
    for (const selector of FROSTED) {
      assert.equal(await style(page, selector, 'backdropFilter'), 'none', selector)
    }
    assert.equal(await style(page, '#glass-nav', 'display', '::before'), 'none')
  } finally {
    await close()
  }
})

test('prefers-reduced-transparency removes every blur layer and restores solid surfaces', async () => {
  const bare = await open({})
  const frosted = await open({ theme: 'glass' })
  const { page, close } = await open({ theme: 'glass', reducedTransparency: true })
  try {
    assert.equal(
      await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
      true,
      'emulation must be active for this test to mean anything'
    )
    for (const selector of FROSTED) {
      assert.match(await style(frosted.page, selector, 'backdropFilter'), /blur/, `sanity: ${selector} is frosted without the preference`)
      assert.equal(await style(page, selector, 'backdropFilter'), 'none', selector)
    }
    for (const selector of ['.dropdown .dropdown-content', '.modal-card']) {
      assert.equal(parseRgb(await style(page, selector, 'backgroundColor')).a, 1, `${selector} must be opaque`)
    }
    for (const selector of ['#toast-default', '#snackbar']) {
      assert.equal(await style(page, selector, 'backgroundColor'), await style(bare.page, selector, 'backgroundColor'), selector)
    }
    // The glass navbar goes back to Bulma's solid navbar with no blur layer.
    assert.equal(await style(page, '#glass-nav', 'backgroundColor'), await style(bare.page, '#glass-nav', 'backgroundColor'))
    assert.equal(await style(page, '#glass-nav', 'display', '::before'), 'none')
  } finally {
    await bare.close()
    await frosted.close()
    await close()
  }
})

test('without @supports (no backdrop-filter/color-mix) every surface stays solid', async () => {
  // Simulate an old browser by deleting every @supports block from the theme.
  const tree = postcss.parse(css)
  tree.walkAtRules('supports', (rule) => rule.remove())
  const [bare, solid] = await Promise.all([open({}), open({ css: tree.toString() })])
  try {
    for (const selector of FROSTED) {
      assert.equal(await style(solid.page, selector, 'backdropFilter'), 'none', selector)
    }
    // Dropdown and modal fall back to the opaque raised surface.
    for (const selector of ['.dropdown .dropdown-content', '.modal-card']) {
      assert.equal(parseRgb(await style(solid.page, selector, 'backgroundColor')).a, 1, selector)
    }
    // Notices keep exactly Bulma's own colours.
    for (const selector of ['#toast-default', '#toast-success', '#toast-danger', '#snackbar']) {
      assert.equal(await style(solid.page, selector, 'backgroundColor'), await style(bare.page, selector, 'backgroundColor'), selector)
    }
    // The glass navbar keeps Bulma's solid navbar background and shows no layer.
    assert.equal(await style(solid.page, '#glass-nav', 'backgroundColor'), await style(bare.page, '#glass-nav', 'backgroundColor'))
    assert.equal(await style(solid.page, '#glass-nav', 'backdropFilter', '::before'), 'none')
  } finally {
    await bare.close()
    await solid.close()
  }
})

test('fallbacks exist in the shipped CSS for every frosted surface (static check)', () => {
  const tree = postcss.parse(css)
  const rulesIn = (atRule, endsWith) => {
    const found = []
    atRule.walkRules((rule) => {
      if (rule.selectors.some((s) => s.includes(endsWith))) found.push(rule.toString())
    })
    return found
  }
  const atRules = (name, re) => {
    const found = []
    tree.walkAtRules(name, (rule) => {
      if (re.test(rule.params)) found.push(rule)
    })
    return found
  }

  // blur only inside a feature query, with the Safari prefix
  const supports = atRules('supports', /backdrop-filter/)
  assert.ok(supports.length >= 4, 'dropdown/modal, toast, snackbar and navbar each need a @supports block')
  for (const rule of supports) assert.match(rule.toString(), /-webkit-backdrop-filter:\s*blur/)

  // translucent notices need color-mix support too
  const colorMix = supports.filter((r) => /color-mix/.test(r.params))
  assert.equal(colorMix.length, 2, 'toast and snackbar tints are gated on color-mix')

  // reduced transparency and forced colours remove blur for each surface
  for (const re of [/prefers-reduced-transparency:\s*reduce/, /forced-colors:\s*active/]) {
    const media = atRules('media', re)
    for (const surface of ['.dropdown-content', '.modal-card', '.toast', '.snackbar']) {
      const rules = media.flatMap((m) => rulesIn(m, surface))
      assert.ok(rules.length, `${surface}: missing ${re} fallback`)
      assert.match(rules.join('\n'), /backdrop-filter:\s*none/)
    }
    const navbar = media.flatMap((m) => rulesIn(m, '.navbar.is-glass:before'))
    assert.ok(navbar.length, `navbar layer: missing ${re} fallback`)
    assert.match(navbar.join('\n'), /display:\s*none/)
  }

  assert.doesNotMatch(css, /@font-face|url\(/, 'glass must not bundle fonts or assets')
})
