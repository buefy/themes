// Shared real-browser harness for theme tests.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { root } from './helpers.mjs'
import { galleryHtml } from '../scripts/gallery.mjs'

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
  <div class="dropdown"><div class="dropdown-content"><a class="dropdown-item" id="dd-item" href="#d">Item</a></div></div>
  <div class="datepicker"><div class="dropdown-content"></div></div>
  <nav class="navbar"><div class="navbar-dropdown is-boxed"></div></nav>
  <div class="b-tooltip"><div class="tooltip-content"></div></div>
  <div class="carousel-list has-shadow"></div>
  <div class="notices"><div class="toast"></div><div class="snackbar"></div></div>
  <div class="notices">
    <div class="toast" id="toast-default">Saved</div>
    <div class="toast is-primary" id="toast-primary">Saved</div>
    <div class="toast is-link" id="toast-link">Saved</div>
    <div class="toast is-info" id="toast-info">Saved</div>
    <div class="toast is-success" id="toast-success">Saved</div>
    <div class="toast is-warning" id="toast-warning">Saved</div>
    <div class="toast is-danger" id="toast-danger">Saved</div>
    <div class="snackbar" id="snackbar"><div class="text">Saved</div><div class="action"><button class="button" id="snackbar-action" type="button">Undo</button></div></div>
  </div>
  <nav class="navbar" id="plain-nav"><div class="navbar-brand"><a class="navbar-item" href="#p">Home</a></div></nav>
  <nav class="navbar is-glass" id="glass-nav">
    <div class="navbar-brand"><a class="navbar-item" id="glass-nav-item" href="#g">Home</a></div>
    <div id="fixed-child" style="position:fixed;top:0;left:0;width:1px;height:1px"></div>
  </nav>
  <div class="b-sidebar"><div class="sidebar-content"></div></div>
  <div class="modal"><div class="modal-card"><header class="modal-card-head"></header><section class="modal-card-body" id="modal-body">Body</section><footer class="modal-card-foot"></footer></div></div>
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

// The stylesheets for a page, in cascade order.
function sheetsFor({ theme, css, order }) {
  const themeSheet = css ?? (theme ? themeCss(theme) : null)
  if (!themeSheet) return [buefyCss]
  return order === 'theme-first' ? [themeSheet, buefyCss] : [buefyCss, themeSheet]
}

// A fresh browser context + page with the requested user preferences emulated.
// prefers-reduced-transparency is not a Playwright option; Chromium supports it
// through the DevTools protocol.
async function newPage({ os, reducedMotion, forcedColors, reducedTransparency, viewport }) {
  const context = await browser.newContext({ colorScheme: os, reducedMotion, forcedColors, ...(viewport && { viewport }) })
  const page = await context.newPage()
  if (reducedTransparency) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
    })
  }
  return { page, context }
}

// theme:     'elevated' | 'fluent' | 'glass' | 'all' | null (Buefy only)
// css:       overrides the theme stylesheet text (e.g. to simulate missing features)
// htmlAttrs: extra attributes on <html>, e.g. 'data-buefy-theme="fluent"'
// bodyAttrs: extra attributes on <body>
export async function open({
  theme = null,
  css = null,
  os = 'light',
  order = 'theme-first',
  reducedMotion = 'no-preference',
  forcedColors = 'none',
  reducedTransparency = false,
  htmlAttrs = '',
  bodyAttrs = ''
} = {}) {
  const sheets = sheetsFor({ theme, css, order })
  const { page, context } = await newPage({ os, reducedMotion, forcedColors, reducedTransparency })
  await page.setContent(
    `<!doctype html><html lang="en" ${htmlAttrs}><head>${sheets.map((s) => `<style>${s}</style>`).join('')}</head><body ${bodyAttrs}>${MARKUP}</body></html>`
  )
  return { page, close: () => context.close() }
}

// The accessible component gallery (scripts/gallery.mjs) instead of the test markup.
// dir: 'ltr' | 'rtl'; viewport: { width, height }
export async function openGallery({
  theme = null,
  os = 'light',
  dir = 'ltr',
  htmlAttrs = '',
  viewport = { width: 1280, height: 900 },
  reducedMotion = 'no-preference',
  forcedColors = 'none',
  reducedTransparency = false
} = {}) {
  const sheets = sheetsFor({ theme, css: null, order: 'theme-first' })
  const { page, context } = await newPage({ os, reducedMotion, forcedColors, reducedTransparency, viewport })
  await page.setContent(galleryHtml({ sheets, htmlAttrs, dir }))
  return { page, close: () => context.close() }
}

// Every computed property of <html> and every element in <body>, plus ::before,
// after any running transitions have finished (a runtime theme switch animates).
export async function snapshot(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
  return page.evaluate(() => {
    const elements = [document.documentElement, ...document.body.querySelectorAll('*')]
    return elements.map((el) => {
      const props = {}
      for (const pseudo of [null, '::before']) {
        const cs = getComputedStyle(el, pseudo)
        for (const p of cs) props[`${pseudo ?? ''}${p}`] = cs.getPropertyValue(p)
      }
      return { label: el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ')[0]}` : el.tagName, props }
    })
  })
}

// Human-readable list of every property that differs between two snapshots.
export function diffSnapshots(a, b, limit = 10) {
  if (a.length !== b.length) return [`element count differs: ${a.length} vs ${b.length}`]
  const diffs = []
  a.forEach((el, i) => {
    for (const prop of Object.keys(el.props)) {
      if (el.props[prop] !== b[i].props[prop]) diffs.push(`${el.label} ${prop}: ${el.props[prop]}  !==  ${b[i].props[prop]}`)
    }
  })
  return diffs.length > limit ? [...diffs.slice(0, limit), `...and ${diffs.length - limit} more`] : diffs
}

export const shadow = (page, selector, pseudo) =>
  page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s), p || null).boxShadow, [selector, pseudo])

export const style = (page, selector, prop, pseudo) =>
  page.evaluate(([s, p, ps]) => getComputedStyle(document.querySelector(s), ps || null)[p], [selector, prop, pseudo])

export const rootVar = (page, name) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)

// Colour of a translucent `bg` laid over a solid backdrop, as an rgb() string.
export function compositeOver(bg, backdrop) {
  const { r, g, b, a } = parseRgb(bg)
  const mix = (c, back) => Math.round(c * a + back * (1 - a))
  return `rgb(${mix(r, backdrop.r)}, ${mix(g, backdrop.g)}, ${mix(b, backdrop.b)})`
}
export const BACKDROPS = { black: { r: 0, g: 0, b: 0 }, white: { r: 255, g: 255, b: 255 } }

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
