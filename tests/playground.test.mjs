// The playground page (scripts/playground.mjs): scheme/theme buttons, their
// aria-pressed state, keyboard operation, and the gallery's few interactions.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { root } from './helpers.mjs'

let browser
const file = path.join(root, 'playground', 'dist', 'index.html')

function build(theme) {
  const r = spawnSync('node', ['scripts/playground.mjs'], { cwd: root, env: { ...process.env, THEME: theme }, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
}

before(async () => {
  browser = await chromium.launch()
})
after(async () => {
  await browser?.close()
})

async function openPlayground(theme, { colorScheme = 'light' } = {}) {
  build(theme)
  const context = await browser.newContext({ colorScheme })
  const page = await context.newPage()
  await page.goto(pathToFileURL(file).href)
  return { page, close: () => context.close() }
}

const attr = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name)
const pressed = (page) =>
  page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-set]')].map((b) => [b.textContent.trim(), b.getAttribute('aria-pressed')])))

test('scheme buttons set data-theme, and System removes it', async () => {
  const { page, close } = await openPlayground('fluent')
  try {
    assert.equal(await attr(page, 'data-theme'), null)
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    assert.equal(await attr(page, 'data-theme'), 'dark')
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    assert.equal(await attr(page, 'data-theme'), 'light')
    await page.getByRole('button', { name: 'System', exact: true }).click()
    assert.equal(await attr(page, 'data-theme'), null)
  } finally {
    await close()
  }
})

test('aria-pressed reflects the current state from the first paint, and follows every click', async () => {
  const { page, close } = await openPlayground('fluent')
  try {
    assert.deepEqual(await pressed(page), { Light: 'false', Dark: 'false', System: 'true' })
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    assert.deepEqual(await pressed(page), { Light: 'false', Dark: 'true', System: 'false' })
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    assert.deepEqual(await pressed(page), { Light: 'true', Dark: 'false', System: 'false' })
    await page.getByRole('button', { name: 'System', exact: true }).click()
    assert.deepEqual(await pressed(page), { Light: 'false', Dark: 'false', System: 'true' })
  } finally {
    await close()
  }
})

test('the pressed button is visibly different, not only announced', async () => {
  const { page, close } = await openPlayground('fluent')
  try {
    // Buttons transition between states, so let those finish before measuring.
    const look = async (name) => {
      await page.mouse.move(0, 0) // not hovering anything: hover darkens a button's border
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
      return page
        .getByRole('button', { name, exact: true })
        .evaluate((el) => { const s = getComputedStyle(el); return `${s.boxShadow} | ${s.borderColor} | ${s.fontWeight}` })
    }
    // Compare only within one state: clicking Dark turns the whole page dark.
    assert.notEqual(await look('System'), await look('Light'), 'the pressed System button looks different from an unpressed one')
    assert.equal(await look('Dark'), await look('Light'), 'unpressed buttons look alike')
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    assert.notEqual(await look('Dark'), await look('Light'), 'pressed Dark looks different from unpressed Light')
    assert.equal(await look('System'), await look('Light'), 'once unpressed, System looks like the others')
  } finally {
    await close()
  }
})

test('THEME=all: theme buttons set and remove data-buefy-theme, with their own pressed state', async () => {
  const { page, close } = await openPlayground('all')
  try {
    assert.equal(await attr(page, 'data-buefy-theme'), 'fluent', 'starts on fluent')
    assert.deepEqual(
      await pressed(page),
      { Light: 'false', Dark: 'false', System: 'true', 'No theme': 'false', elevated: 'false', fluent: 'true', glass: 'false' }
    )
    await page.getByRole('button', { name: 'glass', exact: true }).click()
    assert.equal(await attr(page, 'data-buefy-theme'), 'glass')
    assert.equal((await pressed(page)).glass, 'true')
    assert.equal((await pressed(page)).fluent, 'false')
    await page.getByRole('button', { name: 'No theme', exact: true }).click()
    assert.equal(await attr(page, 'data-buefy-theme'), null)
    assert.equal((await pressed(page))['No theme'], 'true')
    // the scheme group is independent of the theme group
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    assert.equal(await attr(page, 'data-theme'), 'dark')
    assert.equal(await attr(page, 'data-buefy-theme'), null)
  } finally {
    await close()
  }
})

test('the switcher groups are labelled, and a single-theme page has no theme group', async () => {
  const all = await openPlayground('all')
  const labels = await all.page.evaluate(() => [...document.querySelectorAll('[role=group]')].map((g) => g.getAttribute('aria-label')))
  assert.deepEqual(labels, ['Colour scheme', 'Theme'])
  await all.close()

  const one = await openPlayground('glass')
  assert.equal(await one.page.getByRole('button', { name: 'No theme', exact: true }).count(), 0)
  assert.equal(await one.page.title(), '@buefy/themes gallery (glass)')
  await one.close()
})

test('keyboard: Tab reaches every switcher button, and Enter and Space both press it', async () => {
  const { page, close } = await openPlayground('all')
  try {
    const dark = page.getByRole('button', { name: 'Dark', exact: true })
    await dark.focus()
    await page.keyboard.press('Enter')
    assert.equal(await attr(page, 'data-theme'), 'dark')

    const light = page.getByRole('button', { name: 'Light', exact: true })
    await light.focus()
    await page.keyboard.press('Space')
    assert.equal(await attr(page, 'data-theme'), 'light')

    // every switcher button is in the tab order (start from the top of the page;
    // a reload also resets the browser's sequential-focus starting point)
    await page.reload()
    const reachable = new Set()
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(() => (document.activeElement?.dataset?.set ? document.activeElement.textContent.trim() : null))
      if (label) reachable.add(label)
    }
    assert.deepEqual([...reachable].sort(), ['Dark', 'Light', 'No theme', 'System', 'elevated', 'fluent', 'glass'])
  } finally {
    await close()
  }
})

test('the theme really changes the page when the attribute changes', async () => {
  const { page, close } = await openPlayground('all')
  try {
    const radius = () => page.locator('.box').first().evaluate((el) => getComputedStyle(el).borderRadius)
    await page.getByRole('button', { name: 'No theme', exact: true }).click()
    const plain = await radius()
    await page.getByRole('button', { name: 'fluent', exact: true }).click()
    assert.equal(await radius(), '8px')
    assert.notEqual(await radius(), plain)
  } finally {
    await close()
  }
})

test('gallery: closing a notification hides it; tabs switch; demo links do not scroll', async () => {
  const { page, close } = await openPlayground('elevated')
  try {
    const first = page.locator('.notification').first()
    await first.locator('.delete').click()
    assert.equal(await first.isVisible(), false)
    assert.equal(await page.locator('.notification').nth(1).isVisible(), true, 'only that notification closes')

    await page.getByRole('link', { name: 'Details' }).click()
    assert.equal(await page.getByRole('link', { name: 'Details' }).getAttribute('aria-current'), 'page')
    assert.equal(await page.getByRole('link', { name: 'Overview' }).getAttribute('aria-current'), null)
    assert.equal(await page.locator('.tabs li.is-active a').textContent(), 'Details')

    // Playwright scrolls an element into view before clicking, so scroll first and
    // measure afterwards: the click itself must not move the page.
    for (const link of [page.getByRole('link', { name: 'Save' }), page.getByRole('link', { name: 'Profile' }).first()]) {
      await link.scrollIntoViewIfNeeded()
      const y = await page.evaluate(() => scrollY)
      await link.click()
      assert.equal(await page.evaluate(() => scrollY), y, 'a demo link must not scroll the page')
    }
    assert.ok(!(await page.evaluate(() => location.hash)), 'and must not change the URL hash')

    // The buttons whose names promise an action now do it.
    await page.getByRole('button', { name: 'Close dialog' }).click()
    assert.equal(await page.locator('.modal').first().isVisible(), false, 'the dialog closes')
    await page.getByRole('button', { name: 'Undo' }).first().click()
    assert.equal(await page.locator('.snackbar').first().isVisible(), false, 'the snackbar goes away')
  } finally {
    await close()
  }
})

test('gallery markup: grammar, no stray spaces in class lists, valid attributes', async () => {
  const { page, close } = await openPlayground('elevated')
  try {
    const html = await page.content()
    assert.match(html, /This is an info notification\./)
    assert.doesNotMatch(html, /This is a info/)
    assert.match(html, /This is a primary notification\./)
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('[class]')].filter((e) => / $|^ |  /.test(e.getAttribute('class'))).length), 0, 'class attributes must not have stray spaces')
    assert.equal(await page.locator('#g-email').getAttribute('aria-invalid'), 'true')
    const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id))
    assert.equal(new Set(ids).size, ids.length, 'ids must be unique')
  } finally {
    await close()
  }
})

test('reduced motion: the gallery removes transitions and animations', async () => {
  const build_ = (reduce) => browser.newContext({ reducedMotion: reduce ? 'reduce' : 'no-preference' })
  build('fluent')
  for (const [reduce, expected] of [[true, '0s'], [false, null]]) {
    const context = await build_(reduce)
    const page = await context.newPage()
    await page.goto(pathToFileURL(file).href)
    const duration = await page.locator('#btn-nonexistent, .button').first().evaluate((el) => getComputedStyle(el).transitionDuration)
    if (expected) assert.equal(duration.split(',')[0].trim(), expected)
    else assert.notEqual(duration.split(',')[0].trim(), '0s', 'normally the buttons do animate')
    await context.close()
  }
})

test('invalid THEME values fail clearly', () => {
  const r = spawnSync('node', ['scripts/playground.mjs'], { cwd: root, env: { ...process.env, THEME: 'nope' }, encoding: 'utf8' })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /THEME must be one of elevated, fluent, glass, all/)
})
