// Behaviour every theme must share: surfaces use elevation tokens, motion and
// focus follow tokens, and the theme wins regardless of stylesheet order.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { SURFACES, launch, shutdown, open, shadow, style, rootVar } from './harness.mjs'

const THEMES = [
  { name: 'elevated', layered: false },
  { name: 'fluent', layered: true } // page and cards are different layers
]

before(launch)
after(shutdown)

test('sanity baseline: without a theme Buefy has no modal-card shadow', async () => {
  const bare = await open({})
  try {
    assert.equal(await shadow(bare.page, '.modal-card'), 'none')
  } finally {
    await bare.close()
  }
})

for (const { name, layered } of THEMES) {
  for (const os of ['light', 'dark']) {
    for (const order of ['theme-first', 'buefy-first']) {
      test(`${name}: surfaces use their elevation token (${os} OS, ${order})`, async () => {
        const { page, close } = await open({ theme: name, os, order })
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

    test(`${name}: page and card layering (${os} OS)`, async () => {
      const bare = await open({ os })
      const themed = await open({ theme: name, os })
      try {
        const pageBg = (p) => style(p.page, 'html', 'backgroundColor')
        const cardBg = (p) => style(p.page, '.box', 'backgroundColor')
        if (layered) {
          assert.notEqual(await pageBg(themed), await cardBg(themed), 'page and card should be different layers')
        } else {
          // elevated keeps Bulma's own colours exactly
          assert.equal(await pageBg(themed), await pageBg(bare))
          assert.equal(await cardBg(themed), await cardBg(bare))
        }
      } finally {
        await bare.close()
        await themed.close()
      }
    })
  }

  test(`${name}: elevation tokens differ between light and dark`, async () => {
    const light = await open({ theme: name, os: 'light' })
    const dark = await open({ theme: name, os: 'dark' })
    try {
      for (const level of [1, 2, 3, 4]) {
        assert.notEqual(await shadow(light.page, `#probe-${level}`), await shadow(dark.page, `#probe-${level}`))
      }
    } finally {
      await light.close()
      await dark.close()
    }
  })

  test(`${name}: motion follows tokens, leaving accelerates, reduced motion collapses`, async () => {
    const normal = await open({ theme: name })
    const reduced = await open({ theme: name, reducedMotion: 'reduce' })
    try {
      assert.equal(await rootVar(normal.page, '--bulma-speed-slow'), await rootVar(normal.page, '--buefy-motion-duration-normal'))
      // entering uses the standard curve, leaving uses the accelerate curve
      assert.equal(
        await style(normal.page, '#enter', 'transitionTimingFunction'),
        await style(normal.page, '#probe-std', 'transitionTimingFunction')
      )
      assert.equal(
        await style(normal.page, '#leave', 'transitionTimingFunction'),
        await style(normal.page, '#probe-accel', 'transitionTimingFunction')
      )
      for (const v of ['--bulma-speed', '--bulma-speed-slow', '--bulma-speed-slower', '--bulma-duration']) {
        // The CSS minifier may print 0.01ms as .01ms, so compare numerically.
        const value = await rootVar(reduced.page, v)
        assert.ok(value.endsWith('ms') && parseFloat(value) === 0.01, `${v} was ${value}`)
      }
    } finally {
      await normal.close()
      await reduced.close()
    }
  })

  for (const os of ['light', 'dark']) {
    test(`${name}: keyboard focus ring uses the focus token (${os} OS)`, async () => {
      const { page, close } = await open({ theme: name, os })
      try {
        const expected = await style(page, '#probe-color', 'color')
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
}
