// Builds playground/dist/index.html: the component gallery with Buefy CSS +
// dist/<theme>.css (run `npm run build` first) and a light/dark toggle.
//   THEME=elevated|fluent|glass|all npm run playground   (default: elevated)
// THEME=all adds a switcher for the data-buefy-theme attribute.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { galleryHtml } from './gallery.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'playground', 'dist')
const name = process.env.THEME || 'elevated'
const buefy = await readFile(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const theme = await readFile(path.join(root, 'dist', `${name}.css`), 'utf8')

const button = (label, onclick) => `<button class="button" type="button" onclick="${onclick}">${label}</button>`
const root_ = 'document.documentElement'
const controls = `<div class="buttons" role="group" aria-label="Colour scheme">
  ${button('Light', `${root_}.dataset.theme='light'`)}
  ${button('Dark', `${root_}.dataset.theme='dark'`)}
  ${button('System', `delete ${root_}.dataset.theme`)}
</div>${
  name === 'all'
    ? `
<div class="buttons" role="group" aria-label="Theme">
  ${button('No theme', `${root_}.removeAttribute('data-buefy-theme')`)}
  ${['elevated', 'fluent', 'glass'].map((t) => button(t, `${root_}.dataset.buefyTheme='${t}'`)).join('\n  ')}
</div>`
    : ''
}`

await mkdir(out, { recursive: true })
await writeFile(
  path.join(out, 'index.html'),
  galleryHtml({
    sheets: [buefy, theme],
    htmlAttrs: name === 'all' ? 'data-buefy-theme="fluent"' : '',
    title: `@buefy/themes: ${name}`,
    before: controls
  })
)
console.log(`playground (${name}) -> ${path.join(out, 'index.html')}`)
