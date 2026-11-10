// Fails if any file referenced by the package.json "exports" map is missing.
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

const targets = new Set()
for (const value of Object.values(pkg.exports)) {
  if (typeof value === 'string') targets.add(value)
  else for (const target of Object.values(value)) targets.add(target)
}

let failed = 0
for (const target of targets) {
  try {
    await access(path.join(root, target))
  } catch {
    console.error(`missing export target: ${target}`)
    failed++
  }
}

if (failed) process.exit(1)
console.log(`all ${targets.size} export targets exist`)
