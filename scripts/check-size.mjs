// Fails if any built CSS file is larger than its budget in size-budget.json.
// Sizes come from dist/manifest.json, which the build measures from the real files.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'))

const budget = await read('size-budget.json')
const manifest = await read('dist/manifest.json')
const measured = { ...Object.fromEntries(manifest.themes.map((t) => [t.name, t.size])), all: manifest.all.size }

const pct = (used, limit) => `${Math.round((used / limit) * 100)}%`
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
let failed = 0

for (const name of Object.keys(measured)) {
  const limit = budget[name]
  if (!limit) {
    console.error(`no size budget for "${name}" in size-budget.json`)
    failed++
    continue
  }
  for (const [unit, label] of [['bytes', 'raw'], ['gzip', 'gzip']]) {
    const used = measured[name][unit]
    const over = used > limit[unit]
    if (over) failed++
    console.log(`${over ? 'OVER ' : 'ok   '} ${name.padEnd(9)} ${label.padEnd(4)} ${kb(used).padStart(8)} of ${kb(limit[unit]).padStart(8)} (${pct(used, limit[unit])})`)
  }
}

const unknown = Object.keys(budget).filter((k) => !k.startsWith('_') && !(k in measured))
if (unknown.length) {
  console.error(`size-budget.json lists entries that do not exist: ${unknown.join(', ')}`)
  failed++
}

if (failed) {
  console.error('\nSize budget exceeded. If the growth is intended, raise the number in size-budget.json and say why in the commit.')
  process.exit(1)
}
