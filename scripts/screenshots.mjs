// Renders the README screenshots: docs/images/<theme>-<light|dark>.png.
// Unlike the visual regression baselines, these keep readable text. They are
// documentation, not test fixtures, so they are not compared in CI.
//
//   npm run build && npm run docs:screenshots
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, shutdown, openGallery } from '../tests/harness.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'docs', 'images')
mkdirSync(out, { recursive: true })

await launch()
for (const theme of ['elevated', 'fluent', 'glass']) {
  for (const os of ['light', 'dark']) {
    const { page, close } = await openGallery({ theme, os, viewport: { width: 1100, height: 900 } })
    try {
      // Overlays (dropdown, modal card, toasts, snackbar) plus the frosted-backdrop demo.
      const clip = await page.evaluate(() => {
        const rects = ['section[aria-labelledby="h-overlays"]', '#backdrop-demo'].map((s) => {
          const r = document.querySelector(s).getBoundingClientRect()
          return { x: r.left + scrollX, y: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY }
        })
        const pad = 16
        const x = Math.min(...rects.map((r) => r.x)) - pad
        const y = Math.min(...rects.map((r) => r.y)) - pad
        return {
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.max(...rects.map((r) => r.right)) - x + pad,
          height: Math.max(...rects.map((r) => r.bottom)) - y + pad
        }
      })
      const png = await page.screenshot({ fullPage: true, clip, animations: 'disabled' })
      writeFileSync(path.join(out, `${theme}-${os}.png`), png)
      console.log(`${theme}-${os}.png  ${Math.round(png.length / 1024)} KB`)
    } finally {
      await close()
    }
  }
}
await shutdown()
