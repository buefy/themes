// Builds playground/dist/index.html: Buefy CSS + dist/<theme>.css (run
// `npm run build` first), with themed components and a light/dark toggle. A
// fuller Vue gallery arrives with the next themes.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'playground', 'dist')
const buefy = await readFile(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const name = process.env.THEME || 'elevated' // THEME=fluent|glass|all npm run playground
const theme = await readFile(path.join(root, 'dist', `${name}.css`), 'utf8')

const swatches = [1, 2, 3, 4]
  .map((n) => `<div class="swatch" style="box-shadow: var(--buefy-elevation-${n})">elevation-${n}</div>`)
  .join('')

await mkdir(out, { recursive: true })
await writeFile(
  path.join(out, 'index.html'),
  `<!doctype html>
<html lang="en"${name === 'all' ? ' data-buefy-theme="fluent"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@buefy/themes playground</title>
<style>${buefy}</style>
<style>${theme}</style>
<style>.swatch{display:inline-flex;align-items:center;justify-content:center;width:9rem;height:6rem;margin:1.5rem;border-radius:var(--bulma-radius-large);background:var(--bulma-scheme-main)}</style>
</head>
<body class="section">
<h1 class="title">@buefy/themes playground: ${name}</h1>
<div class="buttons">
  <button class="button" onclick="document.documentElement.dataset.theme='light'">Light</button>
  <button class="button" onclick="document.documentElement.dataset.theme='dark'">Dark</button>
  <button class="button" onclick="delete document.documentElement.dataset.theme">System</button>
</div>
${
  name === 'all'
    ? `<div class="buttons">
  <button class="button" onclick="document.documentElement.removeAttribute('data-buefy-theme')">No theme</button>
  ${['elevated', 'fluent', 'glass'].map((t) => `<button class="button" onclick="document.documentElement.dataset.buefyTheme='${t}'">${t}</button>`).join('\n  ')}
</div>`
    : ''
}
<div>${swatches}</div>
<div class="columns" style="margin-top:1rem">
  <div class="column"><div class="box">Box (elevation-1)</div></div>
  <div class="column"><div class="card"><div class="card-content">Card (elevation-1)</div></div></div>
  <div class="column">
    <div class="dropdown is-active">
      <div class="dropdown-menu" style="position:static;display:block">
        <div class="dropdown-content">
          <a class="dropdown-item" href="#">Dropdown (elevation-2)</a>
          <a class="dropdown-item" href="#">Second item</a>
        </div>
      </div>
    </div>
  </div>
</div>
<label class="switch"><input type="checkbox" checked><span class="check"></span></label>
<h2 class="subtitle" style="margin-top:2rem">Frosted surfaces over a colourful backdrop (glass, fluent flyouts)</h2>
<div style="padding:1.5rem;border-radius:1rem;background:linear-gradient(135deg,#ff6b6b,#feca57 35%,#48dbfb 70%,#5f27cd)">
  <nav class="navbar is-glass" style="border-radius:.5rem"><div class="navbar-brand"><a class="navbar-item" href="#">Glass navbar</a><a class="navbar-item" href="#">Docs</a></div></nav>
  <div class="dropdown is-active" style="margin:1rem 0">
    <div class="dropdown-menu" style="position:static;display:block"><div class="dropdown-content"><a class="dropdown-item" href="#">Frosted flyout</a><a class="dropdown-item" href="#">Second item</a></div></div>
  </div>
  <div class="notices" style="position:static;display:block;padding:0">
    <div class="snackbar" style="display:inline-flex"><div class="text">Snackbar (frosted in glass)</div></div>
    <div class="toast is-success" style="display:inline-flex">Coloured toast (always solid)</div>
  </div>
</div>
</body>
</html>
`
)
console.log(`playground -> ${path.join(out, 'index.html')}`)
