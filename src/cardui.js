const audio = typeof Audio === 'undefined' ? null : new Audio()
let deck = null
let sizes = null

const clock = s => `0:${String(Math.max(0, Math.floor(s))).padStart(2, '0')}`

function measure(list) {
  const tab = list.querySelector('[aria-selected="true"], [aria-checked="true"]')
  if (!tab?.offsetWidth) return
  const first = !list.classList.contains('measured')
  list.style.setProperty('--x', `${tab.offsetLeft}px`)
  list.style.setProperty('--w', `${tab.offsetWidth}px`)
  if (!first) return
  list.classList.add('measured', 'instant')
  requestAnimationFrame(() => requestAnimationFrame(() => list.classList.remove('instant')))
}

function fit(clip) {
  const name = clip.querySelector('.clip-title')
  clip.classList.toggle('tight', name.scrollWidth > name.clientWidth)
}

function fadeCode(body) {
  body.classList.toggle('fades', body.scrollLeft + body.clientWidth < body.scrollWidth - 2)
}

export function layoutCard(card) {
  sizes ??= new ResizeObserver(entries =>
    entries.forEach(e => (e.target.classList.contains('clip') ? fit : measure)(e.target)),
  )
  card.querySelectorAll('.tabs').forEach(list => {
    measure(list)
    sizes.observe(list)
  })
  card.querySelectorAll('.clip').forEach(clip => sizes.observe(clip))
  card.querySelectorAll('.code-body').forEach(fadeCode)
  card.querySelectorAll('.split-card').forEach(split => drawRing(split))
}

export function selectTab(tab) {
  const list = tab.parentElement
  for (const t of list.querySelectorAll('.tab')) {
    const on = t === tab
    t.setAttribute('aria-selected', on)
    t.tabIndex = on ? 0 : -1
    const panel = document.getElementById(t.getAttribute('aria-controls'))
    panel.hidden = !on
    if (on) panel.querySelectorAll('.code-body').forEach(fadeCode)
  }
  measure(list)
}

const money = new Intl.NumberFormat('en-GB')
const rolls = new WeakMap()

function roll(el, to, keyed) {
  const from = +(el.dataset.n ?? el.textContent.replace(/\D/g, ''))
  el.dataset.n = to
  cancelAnimationFrame(rolls.get(el))
  if (from === to || keyed || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = money.format(to)
    return
  }
  const t0 = performance.now()
  const step = now => {
    const k = Math.min(1, (now - t0) / 320)
    el.textContent = money.format(Math.round(from + (to - from) * (1 - (1 - k) ** 3)))
    if (k < 1) rolls.set(el, requestAnimationFrame(step))
  }
  rolls.set(el, requestAnimationFrame(step))
}

function pickPart(el) {
  const split = el.closest('.split-card')
  const i = split.dataset.sel === el.dataset.i ? null : el.dataset.i
  if (i == null) delete split.dataset.sel
  else split.dataset.sel = i
  split.classList.toggle('picked', i != null)
  for (const r of split.querySelectorAll('.legend-row'))
    r.setAttribute('aria-pressed', r.dataset.i === i)
  for (const part of split.querySelectorAll('.part, .arc'))
    part.classList.toggle('on', part.dataset.i === i)
}

const edgesOf = split =>
  [...split.querySelectorAll('.handle')].map(h => +h.getAttribute('aria-valuenow'))
const sharesOf = edges => [...edges, 100].map((e, i) => e - (edges[i - 1] ?? 0))

const RING = 2 * Math.PI * 82
const CAP = 30

function drawRing(split, grow) {
  const arcs = [...split.querySelectorAll('.arc')]
  let at = 0
  const spans = sharesOf(edgesOf(split)).map(p => {
    const len = (p / 100) * RING
    const span = [Math.max(len - CAP, 0.01), -(at + CAP / 2)]
    at += len
    return span
  })
  const paint = full =>
    arcs.forEach((arc, i) => {
      const dash = full ? spans[i][0] : 0.01
      arc.style.strokeDasharray = `${dash.toFixed(2)} ${(RING - dash).toFixed(2)}`
      arc.style.strokeDashoffset = spans[i][1].toFixed(2)
    })
  if (!grow) return paint(true)
  split.classList.add('drawing')
  paint(false)
  void split.getBoundingClientRect()
  split.classList.remove('drawing')
  paint(true)
}

function instantly(el, change) {
  el.classList.add('instant')
  change()
  void el.getBoundingClientRect()
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('instant')))
}

function setView(el, keyed) {
  const card = el.closest('.card')
  const view = el.dataset.view
  if (card.dataset.view === view) return
  const apply = () => {
    card.dataset.view = view
    for (const b of el.parentElement.querySelectorAll('.view'))
      b.setAttribute('aria-checked', b === el)
    measure(el.parentElement)
    card.querySelectorAll('.split-card').forEach(split => drawRing(split, !keyed && view === 'pie'))
  }
  if (keyed) return instantly(card, apply)
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return apply()
  const named = [card, ...card.querySelectorAll('.split-rows, .split-reset')]
  named.forEach((n, i) => (n.style.viewTransitionName = `split-${i}`))
  document
    .startViewTransition(apply)
    .finished.finally(() => named.forEach(n => (n.style.viewTransitionName = '')))
}

function setSplit(split, edges, keyed) {
  const shares = sharesOf(edges)
  const total = +split.dataset.total
  const segs = split.querySelectorAll('.part')
  const rows = split.querySelectorAll('.legend-row')
  const names = [...rows].map(r => r.querySelector('.legend-label').textContent)
  shares.forEach((p, i) => {
    segs[i].style.setProperty('--p', p)
    rows[i].querySelector('.legend-share').textContent = `${p}%`
    roll(rows[i].querySelector('.legend-value'), Math.round((total * p) / 100), keyed)
  })
  split.querySelectorAll('.handle').forEach((h, i) => {
    h.style.setProperty('--at', edges[i])
    h.setAttribute('aria-valuenow', edges[i])
    h.setAttribute(
      'aria-valuetext',
      `${names[i]} ${shares[i]}%, ${names[i + 1].toLowerCase()} ${shares[i + 1]}%`,
    )
  })
  drawRing(split)
  const label = shares.join('/')
  const changed = label !== split.dataset.rule
  split.querySelector('.split-reset').hidden = !changed
  const sub = split.closest('.card').querySelector('.card-sub')
  if (!sub || !split.dataset.sub) return
  sub.dataset.base ??= sub.textContent
  sub.textContent = changed ? split.dataset.sub.replace('{split}', label) : sub.dataset.base
}

function nudge(split, i, at, keyed) {
  const edges = edgesOf(split)
  const next = Math.min((edges[i + 1] ?? 100) - 5, Math.max((edges[i - 1] ?? 0) + 5, at))
  if (next === edges[i]) return
  edges[i] = next
  if (keyed) instantly(split, () => setSplit(split, edges, true))
  else setSplit(split, edges)
}

function resetSplit(el) {
  const split = el.closest('.split-card')
  const rule = split.dataset.rule.split('/').map(Number)
  setSplit(
    split,
    rule.slice(0, -1).map((_, i) => rule.slice(0, i + 1).reduce((a, b) => a + b, 0)),
  )
  split.querySelector('.handle').focus({ preventScroll: true })
}

function drag(e) {
  const h = e.target.closest?.('.handle')
  if (!h || e.button > 0) return
  e.preventDefault()
  const bar = h.parentElement
  const split = h.closest('.split-card')
  const pie = split.closest('.card').dataset.view === 'pie'
  const i = +h.dataset.i
  const gaps = bar.querySelectorAll('.handle').length * 4
  h.setPointerCapture(e.pointerId)
  h.focus({ preventScroll: true })
  bar.classList.add('dragging')
  const move = ev => {
    const r = bar.getBoundingClientRect()
    if (pie) {
      const x = ev.clientX - r.left - r.width / 2
      const y = r.top + r.height / 2 - ev.clientY
      const deg = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
      nudge(split, i, Math.round(deg / 18) * 5)
    } else
      nudge(split, i, Math.round(((ev.clientX - r.left - 2 - 4 * i) / (r.width - gaps)) * 20) * 5)
  }
  const up = () => {
    bar.classList.remove('dragging')
    h.removeEventListener('pointermove', move)
    h.removeEventListener('pointerup', up)
    h.removeEventListener('pointercancel', up)
  }
  h.addEventListener('pointermove', move)
  h.addEventListener('pointerup', up)
  h.addEventListener('pointercancel', up)
}

function wear(el) {
  const li = el.closest('li')
  if (li.classList.contains('off')) return
  for (const other of li.parentElement.children) {
    other.classList.toggle('off', other === li)
    other.querySelector('button').setAttribute('aria-pressed', other === li)
  }
}

function pickClip(el) {
  if (el.getAttribute('aria-pressed') === 'true') return
  const editor = el.closest('.editor')
  for (const c of editor.querySelectorAll('.clip')) c.setAttribute('aria-pressed', c === el)
  const total = +editor.dataset.total,
    from = +el.dataset.from
  editor.querySelector('.playhead').style.setProperty('--a', from / total)
  editor.querySelector('.timecode').textContent = `${clock(from)} / ${clock(total)}`
  const cut = editor.querySelector('.cut')
  cut.querySelector('.cut-when').textContent = el.dataset.beat
  cut.querySelector('.cut-line').textContent = el.dataset.line
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  cut.animate(
    [
      { opacity: 0, transform: 'translateY(3px)' },
      { opacity: 1, transform: 'none' },
    ],
    {
      duration: 240,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  )
}

function hot(plan, i) {
  plan.classList.toggle('hot', i >= 0)
  for (const list of [plan.querySelector('.time-bar'), plan.querySelector('.steps')])
    [...list.children].forEach((el, k) => el.classList.toggle('hot', k === i))
}

function easier(el) {
  const on = el.getAttribute('aria-checked') !== 'true'
  el.setAttribute('aria-checked', on)
  for (const cue of el.closest('.moves').querySelectorAll('.move-cue')) {
    cue.textContent = on ? cue.dataset.easier : cue.dataset.cue
    cue.classList.remove('swap')
    void cue.offsetWidth
    cue.classList.add('swap')
  }
}

function peek(el) {
  const beat = el.closest('.peek')
  const mood = Math.random() < 0.5 ? 'napping' : 'awake'
  const cat = beat.querySelector('.peeker')
  cat.querySelector('image').setAttribute('href', beat.dataset[mood])
  beat.querySelector('.peek-word').textContent = mood
  cat.classList.remove('peeked')
  void cat.getBoundingClientRect()
  cat.classList.add('peeked')
}

function idle(list, message) {
  list.classList.remove('playing')
  const btn = list.querySelector('.play-btn')
  btn.setAttribute('aria-pressed', false)
  btn.setAttribute('aria-label', 'Play previews')
  if (message) {
    list.querySelector('.now-detail').textContent = message
    list.querySelector('.progress').hidden = true
    list.querySelector('.player-link').hidden = false
    list.querySelector('.playhead').hidden = true
    list.querySelectorAll('.trk').forEach(r => r.removeAttribute('aria-current'))
  }
}

export function stopCardAudio() {
  if (!audio) return
  audio.pause()
  if (deck?.list.isConnected) idle(deck.list)
  deck = null
}

function playTrack(list, i) {
  const rows = [...list.querySelectorAll('.trk')]
  const row = rows[i]
  if (!audio || !row) return
  if (deck && deck.list !== list) stopCardAudio()
  deck = { list, i }
  rows.forEach(r =>
    r === row ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current'),
  )
  list.querySelector('.now-title').textContent = row.dataset.title
  list.querySelector('.now-detail').textContent =
    `${row.dataset.artist}, track ${i + 1} of ${rows.length}`
  const link = list.querySelector('.player-link')
  link.href = row.dataset.url
  link.hidden = true
  list.querySelector('.progress').hidden = false
  list.querySelector('.playhead').hidden = false
  progress(list, row, 0)
  audio.src = row.dataset.src
  resume(list)
}

function resume(list) {
  list.classList.add('playing')
  const btn = list.querySelector('.play-btn')
  btn.setAttribute('aria-pressed', true)
  btn.setAttribute('aria-label', 'Pause')
  audio.play()?.catch(err => {
    if (err?.name === 'AbortError') return
    idle(list, 'Couldn’t load the preview. Try again in a moment.')
    deck = null
  })
}

function progress(list, row, t) {
  const length = audio.duration || 30
  const f = Math.min(1, t / length)
  list.querySelector('.progress-bar').style.setProperty('--p', f)
  list.querySelector('.progress-time').textContent = `${clock(t)} / ${clock(length)}`
  list
    .querySelector('.playhead')
    .style.setProperty('--p', +row.dataset.start + f * +row.dataset.share)
}

if (audio) {
  audio.preload = 'none'
  audio.addEventListener('timeupdate', () => {
    if (!deck) return
    if (!deck.list.isConnected) return stopCardAudio()
    progress(deck.list, deck.list.querySelectorAll('.trk')[deck.i], audio.currentTime)
  })
  audio.addEventListener('ended', () => {
    if (!deck) return
    const { list, i } = deck
    if (i + 1 < list.querySelectorAll('.trk').length) playTrack(list, i + 1)
    else {
      idle(list, 'That’s the whole mix. Press play to start again.')
      deck = null
    }
  })
  audio.addEventListener('error', () => {
    if (!deck || !audio.getAttribute('src')) return
    idle(deck.list, 'Couldn’t load the preview. Try again in a moment.')
    deck = null
  })
}

function play(el) {
  const list = el.closest('.playlist')
  if (deck?.list === list) {
    if (audio.paused) resume(list)
    else {
      audio.pause()
      idle(list)
    }
  } else playTrack(list, 0)
}

function track(el) {
  const list = el.closest('.playlist')
  const i = +el.dataset.i
  if (deck?.list === list && deck.i === i) play(el)
  else playTrack(list, i)
}

export function wireCards(root, { send, copyText, busy }) {
  const ACTIONS = {
    copy: el =>
      copyText(el.dataset.copyText).then(ok => {
        const label = el.querySelector('.pill-label')
        const was = label?.textContent
        el.classList.toggle('copied', ok)
        el.setAttribute('aria-label', ok ? 'Copied' : 'Copy failed')
        if (label) label.textContent = ok ? 'Copied' : 'Copy failed'
        clearTimeout(el._reset)
        el._reset = setTimeout(() => {
          el.classList.remove('copied')
          el.setAttribute('aria-label', 'Copy')
          if (label) label.textContent = el._label
        }, 1400)
        el._label ??= was
      }),
    slice: pickPart,
    reset: resetSplit,
    view: setView,
    wear,
    play,
    track,
    clip: pickClip,
    easier,
    peek,
    say: el => {
      if (!busy()) send(el.dataset.say)
    },
  }
  root.addEventListener('click', e => {
    const tab = e.target.closest('.tab:not(.view)')
    if (tab) {
      selectTab(tab)
      return
    }
    const el = e.target.closest('[data-card]')
    if (el) {
      ACTIONS[el.dataset.card]?.(el)
      return
    }
  })
  root.addEventListener('pointerover', e => {
    const plan = e.pointerType === 'mouse' && e.target.closest?.('.plan')
    if (!plan) return
    const row = e.target.closest('.step, .time-bar i')
    hot(plan, row ? [...row.parentElement.children].indexOf(row) : -1)
  })
  root.addEventListener('pointerout', e => {
    const plan = e.target.closest?.('.plan')
    if (plan && !plan.contains(e.relatedTarget)) hot(plan, -1)
  })
  root.addEventListener('change', e => {
    const el = e.target
    if (el.dataset.card === 'check') {
      const group = el.closest('.list-group')
      const count = group.querySelector('.list-count')
      count.textContent = `${group.querySelectorAll('input:checked').length} of ${count.dataset.of}`
    } else if (el.dataset.card === 'pick') {
      for (const r of el.closest('.picker').querySelectorAll('.result'))
        r.hidden = r.dataset.i !== el.value
    }
  })
  root.addEventListener('keydown', e => {
    const handle = e.target.closest?.('.handle')
    if (handle) {
      const edges = edgesOf(handle.closest('.split-card'))
      const i = +handle.dataset.i
      const to = {
        ArrowLeft: edges[i] - 5,
        ArrowDown: edges[i] - 5,
        ArrowRight: edges[i] + 5,
        ArrowUp: edges[i] + 5,
        Home: 0,
        End: 100,
      }[e.key]
      if (to === undefined) return
      e.preventDefault()
      nudge(handle.closest('.split-card'), i, to, true)
      return
    }
    const tab = e.target.closest?.('.tab')
    if (!tab) return
    const tabs = [...tab.parentElement.querySelectorAll('.tab')]
    const at = tabs.indexOf(tab)
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    const next = tabs[(to + tabs.length) % tabs.length]
    if (next.classList.contains('view')) setView(next, true)
    else instantly(next.parentElement, () => selectTab(next))
    next.focus()
  })
  root.addEventListener('pointerdown', drag)
  root.addEventListener(
    'scroll',
    e => e.target.classList?.contains('code-body') && fadeCode(e.target),
    true,
  )
}
