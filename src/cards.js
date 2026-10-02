import { contrast } from './colour.js'

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

class Markup {
  constructor(text) {
    this.text = text
  }
}

const show = value =>
  value instanceof Markup
    ? value.text
    : Array.isArray(value)
      ? value.map(show).join('')
      : value == null || value === false
        ? ''
        : String(value).replace(/[&<>"']/g, c => ESCAPES[c])

const html = (strings, ...values) =>
  new Markup(
    strings.reduce((out, s, i) => out + s + (i < values.length ? show(values[i]) : ''), ''),
  )

const RECT = (x, y, w, h) =>
  `M${x + 1.5} ${y}h${w - 3}a1.5 1.5 0 0 1 1.5 1.5v${h - 3}a1.5 1.5 0 0 1-1.5 1.5h-${w - 3}a1.5 1.5 0 0 1-1.5-1.5v-${h - 3}a1.5 1.5 0 0 1 1.5-1.5Z`

const ICONS = {
  plug: 'M9 3v4M15 3v4M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0V7ZM12 16v5',
  euro: 'M17 6.6A6.5 6.5 0 1 0 17 17.4M4.5 10.5h8.5M4.5 13.5h8.5',
  drop: 'M12 3.5c3.4 3.9 5.8 7 5.8 10.1a5.8 5.8 0 0 1-11.6 0c0-3.1 2.4-6.2 5.8-10.1Z',
  tram: `M5.5 11.5h13M9 21l1.5-3M15 21l-1.5-3M10 3h4M7 5.5h10A1.5 1.5 0 0 1 18.5 7v8.5A2.5 2.5 0 0 1 16 18H8a2.5 2.5 0 0 1-2.5-2.5V7A1.5 1.5 0 0 1 7 5.5Z`,
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  waves:
    'M3 9.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0M3 15.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0',
  card: `M2.5 10.5h19M6 14.5h4${RECT(2.5, 6.5, 19, 11)}`,
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5V12l3 2',
  retry: 'M5 12a7 7 0 0 1 12.3-4.6M19 12a7 7 0 0 1-12.3 4.6M17.5 3.5v4h-4M6.5 20.5v-4h4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 13h9l1-13M10.5 10.5v6M13.5 10.5v6',
  people:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2 .7 3.2 2.5 3.5 5.2',
  pan: 'M3 11.5h13.5v1a5 5 0 0 1-5 5h-3.5a5 5 0 0 1-5-5v-1ZM16.5 12.5H21',
  flame:
    'M12 21c3.6 0 6-2.4 6-5.6 0-3.7-3-5.6-4.4-9.4-2.8 1.4-3.6 4-3.5 6-1.2-.6-2-1.8-2.2-3.3C6.6 10.2 6 12 6 15.4 6 18.6 8.4 21 12 21Z',
  leaf: 'M5.5 19.5c8 0 13.5-5.5 14-14.5-9 .5-14.5 6-14.5 14l7-7',
  music: 'M9 18V5.5l11-2V16M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  pie: 'M10.5 4.6a7.55 7.55 0 1 0 8.9 8.9h-8.9V4.6ZM13.5 2.6v7.9h7.9a7.9 7.9 0 0 0-7.9-7.9Z',
  bar: `M12 7.5v9M16.5 7.5v9${RECT(3, 7.5, 18, 9)}`,
  suitcase: `M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M8.5 7v12M15.5 7v12${RECT(3.5, 7, 17, 12)}`,
  contrast: [
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 3.5v17',
    { fill: 'M12 3.5a8.5 8.5 0 0 0 0 17Z' },
  ],
  layout: `M3.5 9h17M10 9v10.5${RECT(3.5, 4.5, 17, 15)}`,
  pencil: 'M14.5 6.5l3 3M5 19l1-4 9.8-9.8a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L9 18l-4 1Z',
  film: `M7.5 4.5v15M16.5 4.5v15M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4${RECT(3.5, 4.5, 17, 15)}`,
  fork: 'M7 3.5V9a2 2 0 0 0 4 0V3.5M9 3.5v17M17 20.5v-17c-2 1.6-3 4.2-3 8h3',
  branch:
    'M7 4v11M7 15a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM17 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0c0 4.5-3 5.5-10 6.2',
  flask:
    'M9.5 3.5h5M10.5 3.5v5.2l-5.1 8.9a1.9 1.9 0 0 0 1.7 2.9h9.8a1.9 1.9 0 0 0 1.7-2.9l-5.1-8.9V3.5M7.5 14.5h9',
  globe:
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 0c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5m0-17C9.7 5.9 8.5 8.7 8.5 12s1.2 6.1 3.5 8.5M3.5 12h17',
  terminal: `M7.5 9.5l3 2.5-3 2.5M12.5 15h4${RECT(3.5, 4.5, 17, 15)}`,
  copy: `M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5${RECT(8.5, 8.5, 11, 11)}`,
  info: 'M12 11v5.5M12 7.9V8M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z',
  lock: 'M8 11V8.5a4 4 0 0 1 8 0V11M7 11h10a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1Z',
  warning:
    'M12 9.6v4.2M12 16.9v.1M10.3 4.7a2 2 0 0 1 3.4 0L21 17.3a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3L10.3 4.7Z',
  folder:
    'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-10Z',
  pin: 'M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  calendar: `M4.5 10h15M8.5 3.5v4M15.5 3.5v4${RECT(4.5, 5.5, 15, 14)}`,
  mail: `M3.5 7 12 13.2 20.5 7${RECT(3, 6, 18, 12)}`,
  user: 'M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z',
  pointer: 'M6.5 4.5l11 6.3-4.8 1.3 2.8 5.2-2.2 1.2-2.8-5.2-3.4 3.4-.6-12.2Z',
  keyboard: `M6.5 10H7M10 10h.5M13.5 10h.5M17 10h.5M8 14h8${RECT(2.5, 6.5, 19, 11)}`,
  book: 'M5 19.5A1.5 1.5 0 0 1 6.5 18H19V4H6.5A1.5 1.5 0 0 0 5 5.5v14Zm0 0A1.5 1.5 0 0 0 6.5 21H19',
  video: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM10.4 9.2v5.6L15 12l-4.6-2.8Z',
  doc: 'M18 7.5l-4-4H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5ZM14 3.5v4h4M9 12h6M9 15.5h4.5',
  play: [
    { fill: 'M8.5 5.8v12.4a.9.9 0 0 0 1.4.8l9.6-6.2a.9.9 0 0 0 0-1.6L9.9 5a.9.9 0 0 0-1.4.8Z' },
  ],
  pause: [{ fill: 'M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z' }],
}

const INSET = {
  plug: 5.6,
  euro: 3.6,
  drop: 5.3,
  tram: 4.6,
  sun: 1.6,
  snow: 3.3,
  waves: 2.1,
  card: 1.6,
  clock: 2.6,
  retry: 4.1,
  check: 4.1,
  trash: 3.6,
  people: 1.6,
  pan: 2.1,
  flame: 5.1,
  leaf: 4.1,
  music: 2.1,
  pie: 3.6,
  bar: 2.1,
  suitcase: 2.6,
  contrast: 2.6,
  layout: 2.6,
  pencil: 4.1,
  film: 2.6,
  fork: 6.1,
  branch: 3.6,
  flask: 4.2,
  globe: 2.6,
  terminal: 2.6,
  copy: 3.6,
  info: 2.6,
  lock: 5.1,
  warning: 1.9,
  folder: 2.6,
  pin: 4.6,
  calendar: 3.6,
  mail: 2.1,
  user: 4.1,
  pointer: 5.6,
  keyboard: 1.6,
  book: 4.1,
  video: 2.6,
  doc: 5.1,
  play: 8.5,
  pause: 7.5,
}

const icon = (name, cls = 'ic') =>
  html`<svg class="${cls}" viewBox="0 0 24 24" style="--in:${INSET[name] ?? 0}" aria-hidden="true">
    ${[ICONS[name]]
      .flat()
      .map(p =>
        typeof p === 'string'
          ? html`<path d="${p}" />`
          : html`<path class="solid" d="${p.fill}" />`,
      )}
  </svg>`

const FIGURES = {
  squat: [
    'M14.07 38.47h19.86',
    'M16.19 26.87l4.96-9.34M20.36 19.02l5.87.83 5.58.19M16.19 26.87l7.91.83-1.32 7.51h2.2',
    [21.85, 12.58],
  ],
  pushup: [
    'M7.12 34.11h28.13',
    'M23.47 22.95l9.67-4.3M31.59 19.34v11.51M23.47 22.95l-14.23 6.34',
    [37.83, 16.94],
  ],
  lunge: [
    'M11.15 39.16h25.7',
    'M23.79 27.46V16.88M23.79 18.57l5.38 2.51 5.56.49M23.79 27.46l7.94.56v7.62h2.21M23.79 27.46l-2.98 7.38-7.54 1.06',
    [23.79, 11.88],
  ],
  plank: [
    'M6.2 30.66h33.66',
    'M23.49 23.47l10.32-2.38M32.16 21.47v5.93h5.59M23.49 23.47l-15.18 3.5',
    [38.75, 20.39],
  ],
  jack: [
    'M13.31 42.26h21.38',
    'M24 24.36V13.78M24 15.47l-5.13-2.96-3.44-4.4M24 15.47l5.13-2.96 3.44-4.4M24 24.36l-5.33 14.64M24 24.36l5.33 14.64',
    [24, 8.78],
  ],
}

const figure = name => {
  const [floor, body, [cx, cy]] = FIGURES[name]
  return html`<svg class="fig" viewBox="0 0 48 48" aria-hidden="true">
    <path class="floor" d="${floor}" />
    <path d="${body}" />
    <circle cx="${cx}" cy="${cy}" r="3.05" />
  </svg>`
}

const number = new Intl.NumberFormat('en-GB')
const toneOf = t => (t ? `--tone:var(--cat${t});--tone-ink:var(--cat${t}-ink)` : '')
const sum = (list, f) => list.reduce((t, x) => t + f(x), 0)
const pct = v => `${(v * 100).toFixed(3)}%`

let uid = 0

const copyButton = text =>
  html`<button
    type="button"
    class="copy-btn"
    data-card="copy"
    data-copy-text="${text}"
    aria-label="Copy"
  >
    ${icon('copy')}${icon('check', 'ic done')}
  </button>`

const pill = (label, attrs = '', cls = '') =>
  html`<button type="button" class="pill-btn${cls}" ${new Markup(attrs)}>
    <span class="pill-label">${label}</span>
  </button>`

const steps = (items, b = {}) =>
  html`<ol class="steps">
    ${items.map(
      ([title, note, right, dim], i) =>
        html`<li
          class="step${i === b.gate ? ' gate' : ''}${i === b.danger ? ' danger' : ''}${dim ? ' dim' : ''}"
          style="--i:${i}"
        >
          <span class="num">${i + 1}</span
          ><span class="step-text"
            ><span class="step-title">${title}</span
            >${note ? html`<span class="step-note">${note}</span>` : ''}</span
          >${right ? html`<span class="step-right">${right}</span>` : ''}
        </li>`,
    )}
  </ol>`

const HIGHLIGHT = {
  js: [
    /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/[^/\s()][^/\n]*\/(?=\)))|\b(async|await|function|return|import|from|const|let|new|export|test)\b/g,
    ['c-com', 'c-str', 'c-key'],
  ],
  html: [/(<\/?[\w-]+|\/?>)|(\s[\w-]+)(?==)|("[^"]*")/g, ['c-key', 'c-attr', 'c-str']],
  sh: [/("[^"]*"|'[^']*')|(\s--?[\w-]+|\s\+\d+)|^([\w-]+)/g, ['c-str', 'c-attr', 'c-key']],
}

const highlight = (line, lang) => {
  const [re, kinds] = HIGHLIGHT[lang] || []
  if (!re) return line
  const out = []
  let at = 0
  for (const m of line.matchAll(re)) {
    const k = m.slice(1).findIndex(g => g !== undefined)
    out.push(line.slice(at, m.index), html`<span class="${kinds[k]}">${m[0]}</span>`)
    at = m.index + m[0].length
  }
  out.push(line.slice(at))
  return out
}

const SCENE = {
  shadow: html`<ellipse class="shadow" cx="88" cy="122" rx="58" ry="6" />`,
  lid: html`<path class="lid" d="M123.7 60.6l12.9 14.8H39.4l12.9-14.8Z" /><path
      class="tape"
      d="M83 60h10l2 16H81l2-16Z"
    />`,
  front: html`<path
    class="front"
    d="M137.4 76.6V110a7.4 7.4 0 0 1-7.4 7.4H46a7.4 7.4 0 0 1-7.4-7.4V76.6Z"
  />`,
  tape: html`<path class="tape" d="M81 76h14v14H81z" />`,
  flaps: html`<path class="lid" d="M51.1 60.1 37.9 75.1 20.9 59.9 34.1 44.9Z" /><path
      class="lid"
      d="M155.1 59.9 138.1 75.1 124.9 60.1 141.9 44.9Z"
    />`,
}

const photo = (id, src, cx, cy, r, cls = '') =>
  html`<g class="photo${cls}">
    <clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}" /></clipPath>
    <image
      href="${src}"
      x="${cx - r}"
      y="${cy - r}"
      width="${r * 2}"
      height="${r * 2}"
      clip-path="url(#${id})"
      preserveAspectRatio="xMidYMid slice"
    />
    <circle class="ring" cx="${cx}" cy="${cy}" r="${r - 1.5}" />
  </g>`

const scene = body =>
  html`<svg class="scene" viewBox="0 0 176 136" aria-hidden="true">${body}</svg>`

const BLOCKS = {
  stats: b =>
    html`<ul class="stats">
      ${b.items.map(
        s =>
          html`<li class="stat">
            ${icon(s.icon)}<span class="stat-value">${s.value}</span
            ><span class="stat-label">${s.label}</span>
          </li>`,
      )}
    </ul>`,

  checklist: b =>
    html`<div class="lists" style="--cols:${b.groups.length}">
      ${b.groups.map(g => {
        const rows = Math.ceil(g.items.length / (g.columns || 1))
        return html`<div class="list-group" style="${toneOf(g.tone)}">
          <div class="list-head">
            <span class="list-title">${g.title}</span
            ><span class="list-count" data-of="${g.items.length}">0 of ${g.items.length}</span>
          </div>
          <ul class="checks" style="--rows:${rows};--cols:${g.columns || 1}">
            ${g.items.map(
              ([what, qty]) =>
                html`<li>
                  <label
                    ><input type="checkbox" data-card="check" /><span
                      class="tick"
                      aria-hidden="true"
                      >${icon('check')}</span
                    ><span class="what"
                      >${what}${qty && b.inline ? html`<span class="times"> ×${qty}</span>` : ''}</span
                    >${qty && !b.inline ? html`<span class="qty">${qty}</span>` : ''}</label
                  >
                </li>`,
            )}
          </ul>
        </div>`
      })}
    </div>`,

  facts: b =>
    html`<div class="facts">
      ${b.items.map(
        f =>
          html`<div class="fact">
            <span class="fact-badge" style="${toneOf(f.tone)}">${icon(f.icon)}</span
            ><span class="fact-text"
              ><span class="fact-label">${f.label}</span
              ><span class="fact-value">${f.value}</span></span
            >
          </div>`,
      )}
    </div>`,

  split: b => {
    const shares = b.items.map(it => it.share)
    const ends = shares.slice(0, -1).map((_, i) => sum(shares.slice(0, i + 1), x => x))
    const name = i => b.items[i].label.toLowerCase()
    return html`<div
      class="split-card"
      data-total="${b.total}"
      data-rule="${shares.join('/')}"
      data-sub="${b.changed || ''}"
    >
      <div class="chart" style="--gaps:${ends.length * 4}px">
        <div class="alloc">
          ${b.items.map(
            (it, i) =>
              html`<i class="part" data-card="slice" data-i="${i}" style="--p:${it.share}"></i>`,
          )}
        </div>
        <svg class="ring" viewBox="0 0 200 200" aria-hidden="true">
          ${b.items.map(
            (_, i) =>
              html`<circle class="arc" data-card="slice" data-i="${i}" r="82" cx="100" cy="100" />`,
          )}
        </svg>
        ${ends.map(
          (at, i) =>
            html`<span
              class="handle"
              role="slider"
              tabindex="0"
              data-i="${i}"
              aria-label="Move the line between ${name(i)} and ${name(i + 1)}"
              aria-valuemin="5"
              aria-valuemax="95"
              aria-valuenow="${at}"
              aria-valuetext="${b.items[i].label} ${shares[i]}%, ${name(i + 1)} ${shares[i + 1]}%"
              style="--at:${at};--i:${i}"
            ></span>`,
        )}
      </div>
      <ul class="split-rows">
        ${b.items.map(
          (it, i) =>
            html`<li>
              <button
                type="button"
                class="legend-row"
                data-card="slice"
                data-i="${i}"
                aria-pressed="false"
              >
                <span class="swatch"></span
                ><span class="legend-text"
                  ><span class="legend-label">${it.label}</span
                  ><span class="legend-note">${it.note}</span></span
                ><span class="legend-figs" aria-live="polite"
                  ><span class="legend-value">${number.format((b.total * it.share) / 100)}</span
                  ><span class="legend-share">${it.share}%</span></span
                >
              </button>
            </li>`,
        )}
      </ul>
      <div class="split-reset" hidden>
        ${pill(`Reset to ${shares.join('/')}`, 'data-card="reset"')}
      </div>
    </div>`
  },

  plan: b => {
    const total = sum(b.items, it => it.value)
    const ticks = Array.from({ length: Math.floor(total / b.every) + 1 }, (_, i) => i * b.every)
    return html`<div class="plan">
      <div class="timeline" aria-hidden="true">
        <div class="time-bar">
          ${b.items.map(
            (it, i) =>
              html`<i class="${it.dim ? 'dim' : ''}" style="flex:${it.value};--i:${i}"></i>`,
          )}
        </div>
        <div class="ticks">
          ${ticks.map(
            t => html`<span style="left:${pct(t / total)}">${t}${t === total ? ' min' : ''}</span>`,
          )}
        </div>
      </div>
      ${steps(b.items.map(it => [it.label, it.note, `${it.value} min`, it.dim]))}
    </div>`
  },

  steps: b => steps(b.items, b),

  lanes: b =>
    html`<div class="lanes">
      ${b.lanes.map(
        lane =>
          html`<section class="lane ${lane.good ? 'good' : 'bad'}" style="--n:${lane.items.length}">
            <div class="lane-head">
              <span class="lane-title">${lane.title}</span><span class="badge">${lane.result}</span>
            </div>
            <ol>
              ${lane.items.map(
                ([ic, text, key], i) =>
                  html`<li class="${key ? 'key' : ''}" style="--i:${i}">
                    <span class="lane-icon" data-ic="${ic}">${icon(ic)}</span><span>${text}</span>
                  </li>`,
              )}
            </ol>
          </section>`,
      )}
    </div>`,

  code: b => {
    const lines = b.text.split('\n')
    const shell = b.lang === 'sh'
    return html`<div class="code">
      <div class="code-head">
        <span class="code-file">${shell ? icon('terminal') : ''}${b.title}</span
        >${copyButton(b.text)}
      </div>
      <div class="code-body${shell ? ' shell' : ''}">
        ${
          shell
            ? ''
            : html`<span class="gutter" aria-hidden="true"
                >${lines.map((_, i) => html`<span>${i + 1}</span>`)}</span
              >`
        }
        <pre><code>${lines.map(
          l =>
            html`<span class="ln"
              >${shell && l ? html`<span class="prompt">$</span>` : ''}${highlight(l, b.lang)}</span
            >`,
        )}</code></pre>
      </div>
    </div>`
  },

  note: b => html`<p class="card-note">${icon('info')}<span>${b.text}</span></p>`,

  post: b => {
    const length = [...b.text].length
    const C = 2 * Math.PI * 9
    return html`<article class="post">
      <div class="post-head">
        <span class="post-avatar"><canvas data-look="${b.look}" data-size="62"></canvas></span
        ><span class="post-names"
          ><span class="post-name">${b.name}</span
          ><span class="post-handle">${b.handle}</span></span
        >
      </div>
      <div class="post-text">${b.text.split('\n\n').map(p => html`<p>${p}</p>`)}</div>
      <div class="post-foot">
        <span class="post-count"
          ><svg viewBox="0 0 24 24" aria-hidden="true">
            <circle r="9" cx="12" cy="12" />
            <circle
              class="used"
              r="9"
              cx="12"
              cy="12"
              stroke-dasharray="${((length / b.limit) * C).toFixed(2)} ${C.toFixed(2)}"
            /></svg
          >${b.limit - length} characters left</span
        >${copyButton(b.text)}
      </div>
    </article>`
  },

  browser: b =>
    html`<div class="stage${b.pins ? ' pinned' : ''}">
      <div class="window">
        <div class="window-bar" aria-hidden="true">
          <span class="lights"><i></i><i></i><i></i></span
          ><span class="address">${icon('lock')}${b.url}</span><span class="lights-pad"></span>
        </div>
        <div class="site">
          <div class="site-nav" aria-hidden="true">
            <span class="site-brand"><i></i>${b.brand}</span
            ><span class="site-links">${b.links.map(l => html`<span>${l}</span>`)}</span>
          </div>
          <div class="site-hero">
            <span class="site-kicker" data-pin="1">${b.kicker}</span>
            <span class="site-title" data-pin="2">${b.headline}</span>
            <span class="site-sub" data-pin="3">${b.subline}</span>
            <span class="site-actions"
              ><span class="site-button" data-pin="4">${b.button}</span
              ><span class="site-link">${b.secondary}</span></span
            >
            <div class="wardrobe" data-pin="5">
              <span class="rail-bar" aria-hidden="true"></span>
              <ul>
                ${b.rail.map(
                  ([look, name], i) =>
                    html`<li class="${i === b.off ? 'off' : ''}">
                      <button
                        type="button"
                        data-card="wear"
                        aria-pressed="${String(i === b.off)}"
                        aria-label="Take the ${name.toLowerCase()} outfit off the rail"
                      >
                        <span class="tag" aria-hidden="true">Off the rail</span
                        ><span class="hanger" aria-hidden="true"
                          ><canvas data-look="${look}" data-size="96"></canvas></span
                        ><span class="look-name">${name}</span>
                      </button>
                    </li>`,
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>`,

  legend: b =>
    html`<ol class="pin-legend">
      ${b.notes.map(
        ([title, text], i) =>
          html`<li>
            <span class="pin">${i + 1}</span
            ><span class="pin-text"
              ><span class="pin-title">${title}</span><span class="pin-note">${text}</span></span
            >
          </li>`,
      )}
    </ol>`,

  playlist: b => {
    const tracks = b.phases.flatMap(p => p.tracks)
    const total = sum(tracks, t => t.ms)
    const W = 600,
      H = 96,
      y = e => H - e * 86
    let ms = 0
    const edges = [0]
    for (const p of b.phases) edges.push((ms += sum(p.tracks, t => t.ms)) / total)
    const points = [
      [0, y(b.phases[0].from)],
      ...b.phases.map((p, i) => [edges[i + 1] * W, y(p.to)]),
    ]
    const line = monotone(points)
    let start = 0,
      n = 0
    return html`<div class="playlist" data-total="${total}">
      <div class="player">
        <button
          type="button"
          class="play-btn"
          data-card="play"
          aria-label="Play previews"
          aria-pressed="false"
        >
          ${icon('play', 'ic on-play')}${icon('pause', 'ic on-pause')}
        </button>
        <span class="now" aria-live="polite"
          ><span class="now-title">Play a preview of each track</span
          ><span class="now-detail">Starts with ${tracks[0].artist}</span></span
        >
        <a class="player-link" href="${tracks[0].url}" target="_blank" rel="noopener noreferrer"
          >Open in Apple Music</a
        >
        <span class="progress" hidden
          ><span class="progress-bar"><i></i></span
          ><span class="progress-time">0:00 / 0:30</span></span
        >
      </div>
      <div class="energy">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${b.label}">
          <path class="area" d="${line} L${W} ${H} L0 ${H} Z" />
          <path class="stroke" d="${line}" />
        </svg>
        ${edges.slice(1, -1).map(e => html`<i class="divider" style="left:${pct(e)}"></i>`)}
        <i class="playhead" hidden></i>
      </div>
      <div
        class="phases"
        style="grid-template-columns:${b.phases
          .map(p => `minmax(0, ${sum(p.tracks, t => t.ms)}fr)`)
          .join(' ')}"
      >
        ${b.phases.map(
          p =>
            html`<section class="phase">
              <div class="phase-head">
                <span class="phase-name">${p.label}</span
                ><span class="phase-min">${Math.round(sum(p.tracks, t => t.ms) / 60000)} min</span>
              </div>
              <ol>
                ${p.tracks.map(t => {
                  const row = html`<li>
                    <button
                      type="button"
                      class="trk"
                      data-card="track"
                      data-i="${n}"
                      data-src="${t.preview}"
                      data-url="${t.url}"
                      data-start="${start / total}"
                      data-share="${t.ms / total}"
                      data-artist="${t.artist}"
                      data-title="${t.title}"
                    >
                      <span class="lead"
                        ><span class="n">${n + 1}</span
                        ><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></span
                      ><span class="trk-text"
                        ><span class="trk-title">${t.title}</span
                        ><span class="trk-artist">${t.artist}</span></span
                      >
                    </button>
                  </li>`
                  start += t.ms
                  n++
                  return row
                })}
              </ol>
            </section>`,
        )}
      </div>
    </div>`
  },

  flow: b =>
    html`<ol class="flow">
      ${b.nodes.map(
        (nd, i) =>
          html`<li style="--i:${i}">
            <span class="flow-top"><span class="glyph">${nd.glyph}</span><i class="link"></i></span
            ><span class="flow-text"
              ><span class="flow-label">${nd.label}</span
              ><span class="flow-note">${nd.text}</span></span
            >
          </li>`,
      )}
    </ol>`,

  picker: (b, ctx) => {
    const name = `${ctx.id}-pick`
    const options = b.groups.flatMap(g => g.options)
    let n = 0
    return html`<div class="picker">
      <fieldset class="choices">
        <legend class="sr-only">${b.question}</legend>
        ${b.groups.map(
          g =>
            html`<span class="choice-group">${g.label}</span>${g.options.map(o => {
                const i = n++
                return html`<label class="opt"
                  ><input
                    type="radio"
                    name="${name}"
                    value="${i}"
                    data-card="pick"
                    ${new Markup(i ? '' : 'checked')}
                  /><span class="radio" aria-hidden="true"></span>${icon(o.icon)}<span
                    class="opt-label"
                    >${o.label}</span
                  ></label
                >`
              })}`,
        )}
      </fieldset>
      <div class="results" aria-live="polite">
        ${options.map(
          (o, i) =>
            html`<div class="result" data-i="${i}" ${new Markup(i ? 'hidden' : '')}>
              <span class="result-badge">${icon(o.icon)}</span>
              <span class="result-cause"
                ><span class="result-kicker">Likely cause</span
                ><span class="result-title">${o.cause}</span></span
              >
              <span class="result-fix"
                ><span class="result-label">What to do</span><span>${o.fix}</span></span
              >
            </div>`,
        )}
      </div>
    </div>`
  },

  contrast: b => {
    const rated = b.samples.map(s => ({ ...s, ratio: contrast(s.fg, b.bg) }))
    const at = r => pct(Math.min(1, Math.max(0, (r - 1) / 6)))
    const verdict = r =>
      r >= 4.5
        ? html`<span class="badge ok">Passes</span>`
        : r >= 3
          ? html`<span class="badge warn">Large text only</span>`
          : html`<span class="badge bad">Fails</span>`
    return html`<div class="contrast">
      <div class="thresholds" aria-hidden="true">
        <span></span
        ><span class="scale"
          ><span style="left:${at(3)}">3:1</span><span style="left:${at(4.5)}">4.5:1</span></span
        ><span></span>
      </div>
      ${rated.map(
        s =>
          html`<div class="sample-row">
            <div class="sample" style="background:${b.bg};color:${s.fg}">
              <span class="sample-text">${b.text}</span><span class="sample-sub">${b.subtext}</span>
            </div>
            <div class="scale" role="img" aria-label="${s.label}, ${s.ratio.toFixed(2)} to 1">
              <i class="line" style="left:${at(3)}"></i><i class="line" style="left:${at(4.5)}"></i
              ><span class="track"><i style="width:${at(s.ratio)};background:${s.fg}"></i></span>
            </div>
            <div class="sample-result">
              <span class="ratio">${s.ratio.toFixed(2)}:1</span>${verdict(s.ratio)}
            </div>
          </div>`,
      )}
    </div>`
  },

  storyboard: b => {
    const total = sum(b.frames, f => f.seconds)
    const time = s => `0:${String(s).padStart(2, '0')}`
    let at = 0
    return html`<div class="editor" data-total="${total}">
      <div class="editor-bar">
        <span class="timecode">${time(0)} / ${time(total)}</span
        ><span class="track-name">${b.track}</span>
      </div>
      <div class="timeline-area">
        <div class="ruler" aria-hidden="true">
          ${Array.from(
            { length: total + 1 },
            (_, s) =>
              html`<i class="${s % 5 ? '' : 'major'}" style="--a:${s / total}"></i>${
                  s % 5
                    ? ''
                    : html`<span class="${s % 10 ? 'odd' : ''}" style="--a:${s / total}"
                        >${time(s)}</span
                      >`
                }`,
          )}
        </div>
        <div class="clips">
          ${b.frames.map((f, i) => {
            const from = at
            at += f.seconds
            return html`<button
              type="button"
              class="clip"
              data-card="clip"
              data-from="${from}"
              data-beat="${f.title}, ${time(from)} to ${time(at)}"
              data-line="${f.text}"
              aria-pressed="${String(i === 0)}"
              style="--a:${from / total};--d:${f.seconds / total}"
            >
              <span class="clip-title">${f.title}</span><span class="clip-len">${f.seconds} s</span
              ><i class="trim"></i><i class="trim"></i>
            </button>`
          })}
        </div>
        <i class="playhead" style="--a:0"></i>
      </div>
      <div class="cut" aria-live="polite">
        <span class="cut-when"
          >${b.frames[0].title}, ${time(0)} to ${time(b.frames[0].seconds)}</span
        ><span class="cut-line">${b.frames[0].text}</span>
      </div>
    </div>`
  },

  moves: b =>
    html`<div class="moves">
      <div class="moves-top">
        <span class="moves-title">${b.title}</span
        ><label class="switch-row"
          ><span>${b.toggle}</span
          ><button
            type="button"
            role="switch"
            aria-checked="false"
            class="switch"
            data-card="easier"
          >
            <i></i></button
        ></label>
      </div>
      <ol class="move-list">
        ${b.items.map(
          (m, i) =>
            html`<li class="move">
              <span class="move-n">${i + 1}</span><span class="fig-tile">${figure(m.figure)}</span
              ><span class="move-text"
                ><span class="move-name">${m.name}</span
                ><span class="move-cue" data-cue="${m.cue}" data-easier="${m.easier}"
                  >${m.cue}</span
                ></span
              ><span class="time-chip">${m.time}</span>
            </li>`,
        )}
      </ol>
      <p class="rhythm">${icon('retry')}<span>${b.rhythm}</span></p>
    </div>`,

  pass: b =>
    html`<div class="pass">
      <div class="pass-top">
        <span class="pass-titles"
          ><span class="pass-kicker">${b.kicker}</span
          ><span class="pass-title">${b.title}</span></span
        ><span class="badge warn">${b.status}</span>
      </div>
      <div class="perforation" aria-hidden="true"></div>
      <dl class="pass-fields">
        ${b.fields.map(
          ([ic, k, v]) =>
            html`<div>
              <dt>${icon(ic)}${k}</dt>
              <dd>${v}</dd>
            </div>`,
        )}
      </dl>
    </div>`,

  bubble: b =>
    html`<div class="message">
      <p class="message-bubble">
        ${b.text
          .split(/(\[[^\]]+\])/)
          .map(part => (part.startsWith('[') ? html`<span class="blank">${part}</span>` : part))}
      </p>
      <button type="button" class="pill-btn raised" data-card="copy" data-copy-text="${b.text}">
        ${icon('copy')}<span class="pill-label">${b.copy}</span>
      </button>
    </div>`,

  alert: b =>
    html`<div class="alert" role="note">
      ${icon('warning')}<span class="alert-text"
        ><span class="alert-title">${b.title}</span><span>${b.text}</span></span
      >
    </div>`,

  chips: b =>
    html`<ul class="scope">
      ${b.items.map(
        c => html`<li class="${c.mono ? 'mono' : ''}">${icon(c.icon)}<span>${c.text}</span></li>`,
      )}
    </ul>`,

  actions: b =>
    html`<div class="card-actions">
      ${b.buttons.map(btn =>
        pill(
          btn.label,
          `data-card="say" data-say="${show(btn.label)}"`,
          btn.primary ? ' primary' : '',
        ),
      )}${b.status ? html`<span class="act-status"><i></i>${b.status}</span>` : ''}
    </div>`,

  table: b =>
    html`<table class="cases">
      <thead>
        <tr>
          ${b.columns.map(c => html`<th scope="col">${c}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${b.rows.map(
          r =>
            html`<tr>
              <th scope="row">
                <span class="case"
                  >${html`<span class="case-icon">${icon(r.icon)}</span>`}${r.name}</span
                >
              </th>
              <td class="try">${r.mono ? html`<code>${r.try}</code>` : r.try}</td>
              <td>${r.expect}</td>
            </tr>`,
        )}
      </tbody>
    </table>`,

  lesson: (b, ctx) => {
    const { napping, awake } = b.cats
    const [hide, both, peek] = b.beats
    return html`<ol class="story" style="--tone-ink:var(--cat6-ink)">
      <li class="beat">
        <div class="picture">
          ${scene(
            html`${SCENE.shadow}${SCENE.lid}${SCENE.front}${SCENE.tape}
              <path
                class="bubble"
                d="M122 28.5h45a11.5 11.5 0 0 1 11.5 11.5v6a11.5 11.5 0 0 1-11.5 11.5h-54a2.5 2.5 0 0 1-2.5-2.5v-15a11.5 11.5 0 0 1 11.5-11.5Z"
              />
              <text class="say" x="144.5" y="48" text-anchor="middle">Meow?</text>`,
          )}
        </div>
        <p class="beat-title"><span>1</span>${hide.title}</p>
        <p class="beat-text">${hide.text}</p>
      </li>
      <li class="beat">
        <div class="picture">
          ${scene(
            html`${SCENE.shadow}${SCENE.lid}${SCENE.front}${SCENE.tape}
              <circle class="dot" cx="53" cy="53.5" r="3.5" /><circle
                class="dot"
                cx="61"
                cy="59"
                r="2"
              />
              <circle class="dot" cx="123" cy="53.5" r="3.5" /><circle
                class="dot"
                cx="115"
                cy="59"
                r="2"
              />
              ${photo(`${ctx.id}-n`, napping.small, 43, 23, 23)}${photo(`${ctx.id}-a`, awake.small, 133, 23, 23)}
              <text class="say" x="88" y="28" text-anchor="middle">and</text>`,
          )}
        </div>
        <p class="beat-title"><span>2</span>${both.title}</p>
        <p class="beat-text">${both.text}</p>
      </li>
      <li class="beat peek" data-napping="${napping.big}" data-awake="${awake.big}">
        <div class="picture">
          ${scene(
            html`${SCENE.shadow}<path class="inside" d="M52 60h72l14 16H38l14-16Z" />
              ${photo(`${ctx.id}-p`, awake.big, 88, 54, 32, ' peeker')}${SCENE.flaps}${SCENE.front}`,
          )}
        </div>
        <p class="beat-title"><span>3</span>${peek.title}</p>
        <p class="beat-text" aria-live="polite">
          ${peek.text} <span class="peek-word">awake</span>!
        </p>
        ${pill(b.again, 'data-card="peek"')}
      </li>
    </ol>`
  },

  person: b =>
    html`<div class="person">
      <img src="${b.photo}" alt="${b.alt}" width="64" height="80" decoding="async" /><span
        class="person-text"
        ><span class="person-kicker">${b.kicker}</span><span class="person-name">${b.name}</span
        ><span class="person-note">${b.text}</span></span
      >
    </div>`,

  links: b =>
    html`<div class="links">
      <span class="links-title">${b.title}</span>
      <ul>
        ${b.items.map(
          it =>
            html`<li>
              <a href="${it.url}" target="_blank" rel="noopener noreferrer"
                ><span class="link-badge">${icon(it.icon)}</span
                ><span class="link-text"
                  ><span class="link-title">${it.title}</span
                  ><span class="link-meta">${it.meta}</span></span
                ></a
              >
            </li>`,
        )}
      </ul>
    </div>`,
}

function monotone(pts) {
  const n = pts.length,
    d = [],
    m = []
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]))
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (!d[i]) {
      m[i] = m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i],
      c = m[i + 1] / d[i],
      s = a * a + c * c
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * c * d[i]
    }
  }
  const f = v => v.toFixed(1)
  let path = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1],
      h = (x1 - x0) / 3
    path += ` C${f(x0 + h)} ${f(y0 + m[i] * h)} ${f(x1 - h)} ${f(y1 - m[i + 1] * h)} ${f(x1)} ${f(y1)}`
  }
  return path
}

const WIDTHS = [86, 64, 78, 52, 72, 58, 82, 48]
const line = i => `<i class="sk-line" style="width:${WIDTHS[i % WIDTHS.length]}%"></i>`
const repeat = (n, row) => Array.from({ length: n }, (_, i) => row(i)).join('')
const grid = (cols, cells) => `<div class="sk-grid" style="--cols:${cols}">${cells}</div>`
const row = (lead, body, tail = '') => `<span class="sk-row">${lead}${body}${tail}</span>`
const stack = i => `<span class="sk-stack">${line(i + 3)}${line(i)}</span>`
const PANEL = '<i class="sk-panel"></i>'
const panels = n => repeat(n, () => PANEL)
const numbered = n => repeat(n, i => row('<i class="sk-num"></i>', stack(i)))

const SKELETONS = {
  stats: b =>
    `<span class="sk-row">${repeat(b.items.length, () => '<i class="sk-chip"></i>')}</span>`,
  checklist: b =>
    grid(
      b.groups.length * (b.groups[0].columns || 1),
      repeat(b.groups.length * (b.groups[0].columns || 1), g =>
        repeat(4, i => row('<i class="sk-box"></i>', line(i + g))),
      ),
    ),
  facts: b => grid(2, panels(b.items.length)),
  split: b => `<i class="sk-bar"></i>${numbered(b.items.length)}`,
  plan: b => `<i class="sk-split"></i>${numbered(b.items.length)}`,
  steps: b => numbered(b.items.length),
  lanes: () => grid(2, panels(2)),
  flow: b => grid(b.nodes.length, panels(b.nodes.length)),
  picker: () => grid(2, panels(2)),
  contrast: b => repeat(b.samples.length + 1, i => row(PANEL, line(i))),
  moves: b => numbered(b.items.length),
  table: b => repeat(b.rows.length, i => row('<i class="sk-num"></i>', line(i), line(i + 2))),
  lesson: () => grid(3, panels(3)),
  legend: b => grid(2, numbered(b.notes.length)),
  links: b => numbered(b.items.length),
  playlist: () => `${PANEL}${grid(3, panels(3))}`,
}

const skeleton = b => new Markup((SKELETONS[b.type] || (() => PANEL))(b))

const block = ctx => b =>
  html`<section class="block block-${b.type}">
    ${BLOCKS[b.type](b, ctx)}
    <div class="skeleton" aria-hidden="true">${skeleton(b)}</div>
  </section>`

const tabbed = (tabs, title, ctx) => ({
  bar: html`<div class="tabs" role="tablist" aria-label="${title}">
    ${tabs.map(
      (t, i) =>
        html`<button
          type="button"
          class="tab"
          role="tab"
          id="${ctx.id}-tab${i}"
          aria-controls="${ctx.id}-panel${i}"
          aria-selected="${String(i === 0)}"
          tabindex="${i === 0 ? 0 : -1}"
        >
          ${t.label}
        </button>`,
    )}
  </div>`,
  panels: tabs.map(
    (t, i) =>
      html`<div
        class="panel"
        role="tabpanel"
        id="${ctx.id}-panel${i}"
        aria-labelledby="${ctx.id}-tab${i}"
        ${new Markup(i ? 'hidden' : '')}
      >
        ${t.blocks.map(block(ctx))}
      </div>`,
  ),
})

const host = url => new URL(url).hostname.replace(/^www\./, '')

const sourceChips = sources => {
  const hosts = sources.map(s => host(s.url))
  return html`<div class="source-row">
    <span class="source-label">Sources</span>
    <ol class="source-chips">
      ${sources.map((s, i) => {
        const shared = hosts.filter(h => h === hosts[i]).length > 1
        const name = shared ? `${hosts[i]} · ${s.title.split(': ').pop()}` : hosts[i]
        return html`<li>
          <a href="${s.url}" target="_blank" rel="noopener noreferrer" title="${s.title}"
            ><span class="n">${i + 1}</span>${name}</a
          >
        </li>`
      })}
    </ol>
  </div>`
}

const titles = card =>
  html`<div class="card-title">
    <span class="eyebrow">${icon(card.icon)}${card.kind}</span><b>${card.title}</b>${
      card.sub ? html`<span class="card-sub">${card.sub}</span>` : ''
    }<span class="card-status" aria-hidden="true">Generating</span>
  </div>`

export function cardMarkup(card, sources) {
  if (!card)
    return sources?.length ? html`<div class="sources">${sourceChips(sources)}</div>`.text : ''
  const ctx = { id: `k${++uid}` }
  const tabs = card.tabs ? tabbed(card.tabs, card.title, ctx) : null
  const views = card.views
    ? html`<div class="tabs views" role="radiogroup" aria-label="Chart style">
        ${card.views.map(
          ([view, label], i) =>
            html`<button
              type="button"
              class="tab view"
              role="radio"
              aria-checked="${String(i === 0)}"
              aria-label="${label}"
              data-card="view"
              data-view="${view}"
            >
              ${icon(view)}
            </button>`,
        )}
      </div>`
    : ''
  const head = html`<figcaption class="card-head">
    ${titles(card)}${tabs ? tabs.bar : views}
  </figcaption>`
  const foot =
    sources?.length || card.footnote || card.credit
      ? html`<footer class="card-foot">
          ${sources?.length ? sourceChips(sources) : ''}${
            card.footnote ? html`<p class="foot-note">${card.footnote}</p>` : ''
          }${card.credit ? html`<p class="foot-note">${card.credit}</p>` : ''}
        </footer>`
      : ''
  return html`<figure
    class="card${card.cover ? ' has-cover' : ''}${card.tone ? '' : ' neutral'}"
    style="${toneOf(card.tone)}"
    ${new Markup(card.views ? `data-view="${card.views[0][0]}"` : '')}
  >
    ${
      card.cover
        ? html`<div class="card-cover">
            <img
              src="${card.cover.src}"
              alt="${card.cover.alt}"
              width="1400"
              height="934"
              decoding="async"
              style="object-position:${card.cover.position || '50% 50%'}"
            />
            <a class="credit" href="${card.cover.href}" target="_blank" rel="noopener noreferrer"
              >${card.cover.credit}</a
            >
            <figcaption class="card-head">
              ${titles(card)}${
                card.chips
                  ? html`<span class="cover-chips"
                      >${card.chips.map(c => html`<span>${c}</span>`)}</span
                    >`
                  : ''
              }
            </figcaption>
          </div>`
        : head
    }
    <div class="card-body">${tabs ? tabs.panels : card.blocks.map(block(ctx))}</div>
    ${foot}
  </figure>`.text
}

export function formatReply(text, sources = []) {
  return show(text.replace(/\[\d*$/, '').replace(/\*+$/, ''))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*\*(.+)$/, '<b>$1</b>')
    .replace(/\[(\d+)\]/g, (mark, n) => {
      const s = sources[n - 1]
      return s
        ? `⁠<a class="cite" href="${show(s.url)}" target="_blank" rel="noopener noreferrer" title="${show(s.title)}">${n}</a>`
        : ''
    })
}

export const spokenReply = text => text.replace(/\*\*/g, '').replace(/\[\d+\]/g, '')

export const copiedReply = (text, sources) =>
  text.replace(/\*\*/g, '') +
  (sources?.length
    ? `\n\nSources:\n${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n')}`
    : '')
