// Builds playground/dist/index.html: the component gallery with Buefy CSS +
// dist/<theme>.css (run `npm run build` first) and a light/dark toggle.
//   THEME=elevated|fluent|glass|all npm run playground   (default: elevated)
// THEME=all adds a switcher for the data-buefy-theme attribute.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { escapeHtml, galleryHtml } from './gallery.mjs'

const THEMES = ['elevated', 'fluent', 'glass', 'all']
const name = process.env.THEME || 'elevated'
if (!THEMES.includes(name)) {
  console.error(`THEME must be one of ${THEMES.join(', ')}, not "${name}"`)
  process.exit(1)
}

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'playground', 'dist')
const buefy = await readFile(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const theme = await readFile(path.join(root, 'dist', `${name}.css`), 'utf8')

// A button sets (or, with an empty value, removes) an attribute on <html>.
// aria-pressed always reflects the current attribute, set by the script below.
const button = (label, attribute, value) =>
  `<button class="button" type="button" data-set="${escapeHtml(attribute)}" data-value="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(label)}</button>`

const controls = `<div class="buttons" role="group" aria-label="Colour scheme">
  ${button('Light', 'data-theme', 'light')}
  ${button('Dark', 'data-theme', 'dark')}
  ${button('System', 'data-theme', '')}
</div>${
  name === 'all'
    ? `
<div class="buttons" role="group" aria-label="Theme">
  ${button('No theme', 'data-buefy-theme', '')}
  ${['elevated', 'fluent', 'glass'].map((t) => button(t, 'data-buefy-theme', t)).join('\n  ')}
</div>`
    : ''
}`

const script = `<script>
(() => {
  const root = document.documentElement
  const sync = () =>
    document.querySelectorAll('[data-set]').forEach((b) => {
      const current = root.getAttribute(b.dataset.set)
      b.setAttribute('aria-pressed', String(current === (b.dataset.value || null)))
    })
  document.addEventListener('click', (event) => {
    const b = event.target.closest('[data-set]')
    if (!b) return
    if (b.dataset.value) root.setAttribute(b.dataset.set, b.dataset.value)
    else root.removeAttribute(b.dataset.set)
    sync()
  })
  sync()
})()
</script>`

// The pressed button is shown with an accent outline and bold text.
const extraCss = `.button[data-set][aria-pressed="true"]{border-color:var(--bulma-link);box-shadow:0 0 0 1px var(--bulma-link);font-weight:var(--bulma-weight-semibold)}`

await mkdir(out, { recursive: true })
await writeFile(
  path.join(out, 'index.html'),
  galleryHtml({
    sheets: [buefy, theme],
    htmlAttrs: name === 'all' ? 'data-buefy-theme="fluent"' : '',
    title: name === 'all' ? '@buefy/themes gallery (all themes)' : `@buefy/themes gallery (${name})`,
    before: controls,
    after: script,
    extraCss
  })
)
console.log(`playground (${name}) -> ${path.join(out, 'index.html')}`)
