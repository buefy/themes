// Shared real-browser harness for theme tests.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { root } from './helpers.mjs'

export const buefyCss = readFileSync(path.join(root, 'node_modules/buefy/dist/css/buefy.css'), 'utf8')
export const themeCss = (name) => readFileSync(path.join(root, 'dist', `${name}.css`), 'utf8')

// [selector of the element to read, pseudo-element or '', expected elevation level]
export const SURFACES = [
  ['.box', '', 1],
  ['.card', '', 1],
  ['.dropdown .dropdown-content', '', 2],
  ['.datepicker .dropdown-content', '', 2],
  ['.navbar .navbar-dropdown.is-boxed', '', 2],
  ['.b-tooltip .tooltip-content', '', 2],
  ['.carousel-list.has-shadow', '', 2],
  ['.notices .toast', '', 3],
  ['.notices .snackbar', '', 3],
  ['.b-sidebar .sidebar-content', '', 4],
  ['.modal-card', '', 4],
  ['.modal-card-head', '', 1],
  ['.b-table .table-wrapper.is-card-list tr', '', 1],
  ['.switch .check', ':before', 1]
]

export const MARKUP = `
  <div class="box"></div>
  <div class="card"></div>
  <div class="dropdown"><div class="dropdown-content"></div></div>
  <div class="datepicker"><div class="dropdown-content"></div></div>
  <nav class="navbar"><div class="navbar-dropdown is-boxed"></div></nav>
  <div class="b-tooltip"><div class="tooltip-content"></div></div>
  <div class="carousel-list has-shadow"></div>
  <div class="notices"><div class="toast"></div><div class="snackbar"></div></div>
  <div class="b-sidebar"><div class="sidebar-content"></div></div>
  <div class="modal"><div class="modal-card"><header class="modal-card-head"></header></div></div>
  <div class="b-table"><div class="table-wrapper is-card-list"><table><tr><td>x</td></tr></table></div></div>
  <label class="switch"><input type="checkbox"><span class="check"></span></label>
  <a id="link" href="#x">link</a>
  <button class="button is-primary" id="btn-primary">Primary</button>
  <a class="button is-link" id="btn-link" href="#y">Link</a>
  <input class="input" id="input">
  <div class="fade-enter-active" id="enter"></div>
  <div class="fade-leave-active" id="leave"></div>
  <i id="probe-color" style="color: var(--buefy-focus-ring-color)"></i>
  <i id="probe-accel" style="transition-timing-function: var(--buefy-motion-ease-accelerate)"></i>
  <i id="probe-std" style="transition-timing-function: var(--buefy-motion-ease-standard)"></i>
  <i id="probe-1" style="box-shadow: var(--buefy-elevation-1)"></i>
  <i id="probe-2" style="box-shadow: var(--buefy-elevation-2)"></i>
  <i id="probe-3" style="box-shadow: var(--buefy-elevation-3)"></i>
  <i id="probe-4" style="box-shadow: var(--buefy-elevation-4)"></i>`

let browser
export async function launch() {
  browser = await chromium.launch()
}
export async function shutdown() {
  await browser?.close()
}

// theme: 'elevated' | 'fluent' | null (Buefy only)
export async function open({
  theme = null,
  os = 'light',
  order = 'theme-first',
  reducedMotion = 'no-preference',
  forcedColors = 'none'
} = {}) {
  const buefy = buefyCss
  const sheets = theme
    ? order === 'theme-first'
      ? [themeCss(theme), buefy]
      : [buefy, themeCss(theme)]
    : [buefy]
  const context = await browser.newContext({ colorScheme: os, reducedMotion, forcedColors })
  const page = await context.newPage()
  await page.setContent(
    `<!doctype html><html lang="en"><head>${sheets.map((s) => `<style>${s}</style>`).join('')}</head><body>${MARKUP}</body></html>`
  )
  return { page, close: () => context.close() }
}

export const shadow = (page, selector, pseudo) =>
  page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s), p || null).boxShadow, [selector, pseudo])

export const style = (page, selector, prop, pseudo) =>
  page.evaluate(([s, p, ps]) => getComputedStyle(document.querySelector(s), ps || null)[p], [selector, prop, pseudo])

export const rootVar = (page, name) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)

// --- colour helpers (computed styles are always rgb()/rgba()) ---
export function parseRgb(value) {
  const m = value.match(/rgba?\(([^)]+)\)/) || value.match(/color\(srgb ([^)]+)\)/)
  if (!m) throw new Error(`cannot parse colour: ${value}`)
  const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
  const scale = value.startsWith('color(') ? 255 : 1
  return { r: parts[0] * scale, g: parts[1] * scale, b: parts[2] * scale, a: parts[3] ?? 1 }
}

const channel = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
export function contrast(fg, bg) {
  const [hi, lo] = [luminance(parseRgb(fg)), luminance(parseRgb(bg))].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}
