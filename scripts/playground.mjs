// Builds playground/dist/index.html: Buefy CSS + the core token fixture, with
// elevation swatches and a light/dark toggle. A fuller Vue gallery of themed
// components arrives with the first real theme.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as sass from 'sass'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'playground', 'dist')
const buefy = await readFile(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
const tokens = sass.compile(path.join(root, 'tests/fixtures/standalone.scss'), { style: 'expanded' }).css

const swatches = [1, 2, 3, 4]
  .map((n) => `<div class="swatch" style="box-shadow: var(--buefy-elevation-${n})">elevation-${n}</div>`)
  .join('')

await mkdir(out, { recursive: true })
await writeFile(
  path.join(out, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@buefy/themes playground</title>
<style>${buefy}</style>
<style>${tokens}</style>
<style>.swatch{display:inline-flex;align-items:center;justify-content:center;width:9rem;height:6rem;margin:1.5rem;border-radius:var(--bulma-radius-large);background:var(--bulma-scheme-main)}</style>
</head>
<body class="section">
<h1 class="title">@buefy/themes playground</h1>
<div class="buttons">
  <button class="button" onclick="document.documentElement.dataset.theme='light'">Light</button>
  <button class="button" onclick="document.documentElement.dataset.theme='dark'">Dark</button>
  <button class="button" onclick="delete document.documentElement.dataset.theme">System</button>
</div>
<div>${swatches}</div>
</body>
</html>
`
)
console.log(`playground -> ${path.join(out, 'index.html')}`)
