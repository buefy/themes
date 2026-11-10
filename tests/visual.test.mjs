// Visual regression: full-page screenshots of the component gallery for every
// theme in light and dark, at desktop and mobile width, plus right-to-left.
//
// Text is made transparent before the screenshot. Fonts differ between machines
// and would cause false diffs; text legibility is covered by the contrast tests.
// What is compared is what the themes actually control: surfaces, shadows,
// radii, borders, colours and frosted materials.
//
//   npm run test:visual                      compare against the baselines
//   UPDATE_VISUAL=1 npm run test:visual      (re)write the baselines
//
// On a mismatch the actual image and a diff are written to tests/visual/__diff__/.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { root } from './helpers.mjs'
import { launch, shutdown, openGallery } from './harness.mjs'

before(launch)
after(shutdown)

const BASELINE = path.join(root, 'tests/visual/baseline')
const DIFF = path.join(root, 'tests/visual/__diff__')
const UPDATE = process.env.UPDATE_VISUAL === '1'

// Per-pixel colour tolerance, and the share of pixels allowed to differ (sub-pixel
// anti-aliasing of rounded corners and shadows varies slightly between machines).
const PIXEL_THRESHOLD = 0.1
const MAX_DIFF_RATIO = 0.002

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 }
}

const THEMES = ['elevated', 'fluent', 'glass']
const CASES = [
  ...THEMES.flatMap((theme) => [
    { theme, os: 'light', viewport: 'desktop' },
    { theme, os: 'dark', viewport: 'desktop' },
    { theme, os: 'light', viewport: 'mobile' }
  ]),
  { theme: 'fluent', os: 'light', viewport: 'desktop', dir: 'rtl' },
  { theme: 'glass', os: 'light', viewport: 'desktop', dir: 'rtl' }
]

const STABILISE = `
  *, *::before, *::after {
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    caret-color: transparent !important;
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
  ::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; }
`

const nameOf = ({ theme, os, viewport, dir = 'ltr' }) => `${theme}-${os}-${viewport}${dir === 'rtl' ? '-rtl' : ''}`

async function screenshot({ theme, os, viewport, dir = 'ltr' }) {
  const { page, close } = await openGallery({ theme, os, dir, viewport: VIEWPORTS[viewport] })
  try {
    await page.addStyleTag({ content: STABILISE })
    await page.evaluate(() => document.fonts.ready)
    return await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' })
  } finally {
    await close()
  }
}

for (const c of CASES) {
  const name = nameOf(c)
  test(`visual: ${name}`, async () => {
    const actual = await screenshot(c)
    const file = path.join(BASELINE, `${name}.png`)

    if (UPDATE) {
      mkdirSync(BASELINE, { recursive: true })
      writeFileSync(file, actual)
      return
    }
    assert.ok(existsSync(file), `no baseline for ${name}. Generate it with: UPDATE_VISUAL=1 npm run test:visual`)

    const expected = PNG.sync.read(readFileSync(file))
    const got = PNG.sync.read(actual)
    const fail = (message) => {
      mkdirSync(DIFF, { recursive: true })
      writeFileSync(path.join(DIFF, `${name}.actual.png`), actual)
      assert.fail(`${message}. Actual image saved to tests/visual/__diff__/${name}.actual.png`)
    }

    if (expected.width !== got.width || expected.height !== got.height) {
      fail(`${name}: size changed from ${expected.width}x${expected.height} to ${got.width}x${got.height}`)
    }

    const diff = new PNG({ width: got.width, height: got.height })
    const changed = pixelmatch(expected.data, got.data, diff.data, got.width, got.height, { threshold: PIXEL_THRESHOLD })
    const ratio = changed / (got.width * got.height)
    if (ratio > MAX_DIFF_RATIO) {
      mkdirSync(DIFF, { recursive: true })
      writeFileSync(path.join(DIFF, `${name}.diff.png`), PNG.sync.write(diff))
      fail(`${name}: ${changed} pixels differ (${(ratio * 100).toFixed(3)}%, allowed ${(MAX_DIFF_RATIO * 100).toFixed(1)}%)`)
    }
  })
}

test('visual: the screenshots differ between themes and between light and dark (guard against blank images)', async () => {
  const shots = {}
  for (const c of CASES.filter((c) => c.viewport === 'desktop' && !c.dir)) shots[nameOf(c)] = PNG.sync.read(await screenshot(c))
  const differs = (a, b) => {
    const [x, y] = [shots[a], shots[b]]
    const height = Math.min(x.height, y.height)
    return pixelmatch(x.data.subarray(0, x.width * height * 4), y.data.subarray(0, y.width * height * 4), null, x.width, height, { threshold: PIXEL_THRESHOLD })
  }
  assert.ok(differs('elevated-light-desktop', 'fluent-light-desktop') > 1000, 'elevated vs fluent')
  assert.ok(differs('fluent-light-desktop', 'glass-light-desktop') > 1000, 'fluent vs glass')
  assert.ok(differs('fluent-light-desktop', 'fluent-dark-desktop') > 10000, 'light vs dark')
})
