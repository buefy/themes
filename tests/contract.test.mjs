// Contract test: every selector/variable pair the mapping overrides must still
// exist in the installed Buefy CSS. Catches upstream renames before users do.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { root } from './helpers.mjs'

const THEMES = ['elevated']

// Rules that add behaviour Buefy never had, so there is nothing upstream to match.
const ADDITIONS = new Set(['.switch input[type=checkbox]:focus-visible + .check'])

// Selectors Buefy/Bulma define, but without the property we add (e.g. no
// default modal-card shadow). The selector itself must still exist upstream.
const SELECTOR_ONLY = new Set(['.modal-card'])

const normalize = (selector) =>
  selector.replace(/\s+/g, ' ').replace(/::(before|after)/g, ':$1').replace(/="([^"]*)"/g, '=$1').trim()

function indexBuefy() {
  const css = readFileSync(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
  const bySelector = new Map() // selector -> Set(props)
  const allProps = new Set()
  postcss.parse(css).walkRules((rule) => {
    const props = []
    rule.walkDecls((d) => props.push(d.prop))
    props.forEach((p) => allProps.add(p))
    for (const sel of rule.selectors) {
      const key = normalize(sel)
      if (!bySelector.has(key)) bySelector.set(key, new Set())
      props.forEach((p) => bySelector.get(key).add(p))
    }
  })
  return { bySelector, allProps }
}

const upstream = indexBuefy()
// Strip the specificity host prefix our output adds.
const stripHost = (sel) => normalize(sel).replace(/^:root:root(\[data-buefy-theme=[^\]]+\])?/, '').trim()

for (const theme of THEMES) {
  test(`${theme}: overrides match the selectors and variables Buefy declares`, () => {
    const css = readFileSync(path.join(root, 'dist', `${theme}.css`), 'utf8')
    const problems = []
    let checked = 0

    postcss.parse(css).walkRules((rule) => {
      const decls = []
      rule.walkDecls((d) => decls.push(d))
      const mapped = decls.filter((d) => !d.prop.startsWith('--buefy-'))
      if (!mapped.length) return // token-emitting rule

      for (const selector of rule.selectors) {
        const rel = stripHost(selector)
        if (ADDITIONS.has(rel)) continue
        if (SELECTOR_ONLY.has(rel)) {
          checked++
          if (!upstream.bySelector.has(rel)) problems.push(`${rel}: selector no longer exists in Buefy`)
          continue
        }
        for (const d of mapped) {
          checked++
          const hostLevel = rel === '' || rel === '[data-theme]' || /^\.theme-(light|dark)$/.test(rel)
          if (hostLevel) {
            if (!upstream.allProps.has(d.prop)) problems.push(`${rel || ':root'}: ${d.prop} is not declared anywhere in Buefy`)
          } else if (!upstream.bySelector.get(rel)?.has(d.prop)) {
            problems.push(`${rel}: Buefy no longer declares ${d.prop} on this selector`)
          }
        }
      }
    })

    assert.ok(checked > 20, `expected to check many pairs, checked ${checked}`)
    assert.deepEqual(problems, [])
  })
}
