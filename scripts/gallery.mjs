// A static, accessible gallery of Buefy components, written with the markup
// Buefy renders. Shared by the playground, the axe-core audit and the visual
// regression tests, so all three look at the same thing.
//
// Overlays (dropdown, modal card, toast, snackbar) are shown inline instead of
// floating, so they can be audited and screenshotted like everything else.

const buttons = ['', 'is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-light', 'is-dark']
  .map((c) => `<button class="button ${c}" type="button">${c ? c.slice(3) : 'default'}</button>`)
  .join('\n      ')

const notifications = ['is-primary', 'is-info', 'is-success', 'is-warning', 'is-danger']
  .map(
    (c) => `<div class="notification ${c}"><button class="delete" type="button" aria-label="Dismiss ${c.slice(3)} notification"></button>This is a ${c.slice(3)} notification.</div>`
  )
  .join('\n      ')

const tags = ['', 'is-primary', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-light', 'is-dark']
  .map((c) => `<span class="tag ${c}">${c ? c.slice(3) : 'tag'}</span>`)
  .join('\n        ')

const toasts = ['', 'is-primary', 'is-success', 'is-warning', 'is-danger']
  .map((c) => `<div class="toast ${c}">${c ? `${c.slice(3)} toast` : 'Neutral toast'}</div>`)
  .join('\n        ')

// Overlays are shown in normal flow.
const staticNotices = 'style="position:static;display:block;padding:0;pointer-events:auto"'
const staticMenu = 'style="position:static;display:block"'
const staticModal = 'style="position:static;display:block;height:auto;overflow:visible"'

const sections = `
    <section aria-labelledby="h-buttons">
      <h2 class="title is-4" id="h-buttons">Buttons</h2>
      <div class="buttons">
      ${buttons}
      <button class="button is-primary is-outlined" type="button">outlined</button>
      <button class="button is-primary is-rounded" type="button">rounded</button>
      <button class="button is-primary" type="button" disabled>disabled</button>
      </div>
    </section>

    <section aria-labelledby="h-forms">
      <h2 class="title is-4" id="h-forms">Forms</h2>
      <div class="columns">
        <div class="column">
          <div class="field">
            <label class="label" for="g-name">Name</label>
            <div class="control"><input class="input" id="g-name" type="text" placeholder="Jane Doe"></div>
            <p class="help">Your full name.</p>
          </div>
          <div class="field">
            <label class="label" for="g-email">Email</label>
            <div class="control"><input class="input is-danger" id="g-email" type="email" value="not-an-email" aria-describedby="g-email-help"></div>
            <p class="help is-danger" id="g-email-help">This email is invalid.</p>
          </div>
          <div class="field">
            <label class="label" for="g-select">Country</label>
            <div class="control"><div class="select"><select id="g-select"><option>Japan</option><option>Canada</option></select></div></div>
          </div>
          <div class="field">
            <label class="label" for="g-notes">Notes</label>
            <div class="control"><textarea class="textarea" id="g-notes" rows="2"></textarea></div>
          </div>
        </div>
        <div class="column">
          <div class="field">
            <label class="b-checkbox checkbox"><input type="checkbox" checked><span class="check is-primary"></span><span class="control-label">Remember me</span></label>
          </div>
          <div class="field">
            <label class="b-radio radio"><input type="radio" name="g-radio" checked><span class="check"></span><span class="control-label">Option A</span></label>
            <label class="b-radio radio"><input type="radio" name="g-radio"><span class="check"></span><span class="control-label">Option B</span></label>
          </div>
          <div class="field">
            <label class="switch"><input type="checkbox" checked><span class="check"></span><span class="control-label">Notifications</span></label>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="h-surfaces">
      <h2 class="title is-4" id="h-surfaces">Surfaces</h2>
      <div class="columns">
        <div class="column"><div class="box"><p>A box (elevation 1).</p></div></div>
        <div class="column">
          <div class="card">
            <header class="card-header"><p class="card-header-title">A card</p></header>
            <div class="card-content"><p>Card content (elevation 1).</p></div>
            <footer class="card-footer"><a class="card-footer-item" href="#h-surfaces">Save</a><a class="card-footer-item" href="#h-surfaces">Edit</a></footer>
          </div>
        </div>
      </div>
      <article class="message is-info"><div class="message-header"><p>Information</p></div><div class="message-body">A message body.</div></article>
      <article class="message is-danger"><div class="message-header"><p>Problem</p></div><div class="message-body">Something went wrong.</div></article>
      ${notifications}
      <div class="tags">
        ${tags}
      </div>
      <progress class="progress is-primary" value="40" max="100" aria-label="Upload progress">40%</progress>
      <div class="tabs"><ul><li class="is-active"><a href="#h-surfaces">Overview</a></li><li><a href="#h-surfaces">Details</a></li><li><a href="#h-surfaces">History</a></li></ul></div>
      <table class="table is-striped is-hoverable is-fullwidth">
        <caption class="is-sr-only">Sample data</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Role</th></tr></thead>
        <tbody><tr><th scope="row">Ada</th><td>Engineer</td></tr><tr><th scope="row">Grace</th><td>Admiral</td></tr></tbody>
      </table>
    </section>

    <section aria-labelledby="h-overlays">
      <h2 class="title is-4" id="h-overlays">Overlays</h2>
      <div class="columns">
        <div class="column">
          <div class="dropdown is-active">
            <div class="dropdown-trigger"><button class="button" type="button" aria-haspopup="true" aria-controls="g-menu">Dropdown</button></div>
            <div class="dropdown-menu" id="g-menu" ${staticMenu}>
              <div class="dropdown-content">
                <a class="dropdown-item" href="#h-overlays">Profile</a>
                <a class="dropdown-item is-active" href="#h-overlays">Settings</a>
                <hr class="dropdown-divider">
                <a class="dropdown-item" href="#h-overlays">Sign out</a>
              </div>
            </div>
          </div>
        </div>
        <div class="column">
          <div class="modal is-active" ${staticModal}>
            <div class="modal-card" style="margin:0;width:100%;max-width:26rem">
              <header class="modal-card-head"><p class="modal-card-title">Confirm</p><button class="delete" type="button" aria-label="Close dialog"></button></header>
              <section class="modal-card-body"><p>Are you sure you want to continue?</p></section>
              <footer class="modal-card-foot"><button class="button is-primary" type="button">Yes</button><button class="button" type="button">Cancel</button></footer>
            </div>
          </div>
        </div>
      </div>
      <div class="notices" ${staticNotices}>
        ${toasts}
        <div class="snackbar" style="display:inline-flex"><div class="text">Message archived</div><div class="action"><button class="button" type="button">Undo</button></div></div>
      </div>
    </section>

    <section id="backdrop-demo" aria-label="Frosted surfaces over a colourful backdrop" style="padding:1.5rem;border-radius:1rem;background:linear-gradient(135deg,#ff6b6b,#feca57 35%,#48dbfb 70%,#5f27cd)">
      <nav class="navbar is-glass" aria-label="Glass navigation" style="border-radius:.5rem">
        <div class="navbar-brand"><a class="navbar-item" href="#backdrop-demo">Glass navbar</a><a class="navbar-item" href="#backdrop-demo">Docs</a></div>
      </nav>
      <div class="dropdown is-active" style="margin:1rem 0">
        <div class="dropdown-menu" ${staticMenu}><div class="dropdown-content"><a class="dropdown-item" href="#backdrop-demo">Frosted flyout</a><a class="dropdown-item" href="#backdrop-demo">Second item</a></div></div>
      </div>
      <div class="notices" ${staticNotices}><div class="snackbar" style="display:inline-flex"><div class="text">Frosted snackbar</div></div></div>
    </section>`

// sheets: CSS texts, in cascade order. htmlAttrs: extra attributes on <html>.
// before/after: extra HTML at the start/end of <main> (the playground's controls).
export function galleryHtml({ sheets = [], htmlAttrs = '', dir = 'ltr', title = 'Buefy themes gallery', before = '' } = {}) {
  return `<!doctype html>
<html lang="en" dir="${dir}" ${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${sheets.map((s) => `<style>${s}</style>`).join('\n')}
<style>main section{margin-block:2rem}main .notification,main .message{margin-block-end:1rem}</style>
</head>
<body>
  <header>
    <nav class="navbar" aria-label="Main navigation">
      <div class="navbar-brand"><a class="navbar-item" href="#main"><strong>Gallery</strong></a></div>
      <div class="navbar-menu is-active">
        <div class="navbar-start">
          <a class="navbar-item" href="#h-buttons">Buttons</a>
          <a class="navbar-item" href="#h-forms">Forms</a>
          <a class="navbar-item" href="#h-surfaces">Surfaces</a>
          <a class="navbar-item" href="#h-overlays">Overlays</a>
        </div>
      </div>
    </nav>
  </header>
  <main class="section" id="main">
    <div class="container">
      <h1 class="title">${title}</h1>
      <p class="subtitle">Real Buefy markup, shown in flow.</p>
      ${before}
      ${sections}
    </div>
  </main>
  <footer class="footer"><div class="content has-text-centered"><p>@buefy/themes gallery</p></div></footer>
</body>
</html>
`
}
