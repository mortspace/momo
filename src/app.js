import * as RAY from './engine/raymarch.js'
import * as MESH from './engine/mesh.js'
import * as CANVAS from './engine/canvas.js'
import { ANSWERS, localAnswer, answerText, mathOf } from './answers.js'
import { icon } from './icons.js'
import { cardMarkup, formatReply, spokenReply, copiedReply } from './cards.js'
import { wireCards, layoutCard, stopCardAudio } from './cardui.js'
import { ARTIFACTS } from './artifacts.js'
import { contrast } from './colour.js'
import { LOOK_PALETTE, ROLE, SIGNATURE, JOB, BOT_GROUPS } from './looks.js'

const useRay = !globalThis.__MOMO_PROD__ && new URLSearchParams(location.search).get('r') === 'ray'
const forceCanvas = new URLSearchParams(location.search).has('canvas2d')
const { PALETTES, OUTFITS, FACE, hexToRgb } = MESH
const R = (() => {
  if (!forceCanvas)
    try {
      return (useRay ? RAY : MESH).createRenderer()
    } catch {}
  return CANVAS.createRenderer()
})()
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const INSTANT_KEY = 'momo.instant'
let instant = false
try {
  instant = localStorage.getItem(INSTANT_KEY) === '1'
} catch {}
const fast = () => reduce || instant
const $ = s => document.querySelector(s)
const effectiveDpr = () =>
  Math.min(4, Math.max(1, (window.devicePixelRatio || 1) * (window.visualViewport?.scale || 1)))
let DPR = effectiveDpr()

const colourChoice = {}
const palFor = look => colourChoice[look] || LOOK_PALETTE[look] || 'persimmon'
const rgb = name => PALETTES[name].map(hexToRgb)

const MOODS = {
  neutral: { brows: [0, 0, 0, 0], eye: [1, 1], roll: 0 },
  happy: { brows: [0.022, 0.024, 0.024, 0.022], eye: [1, 0.96], roll: 0.03 },
  focused: { brows: [0.006, 0.01, 0.01, 0.006], eye: [0.98, 0.97], roll: 0 },
  curious: { brows: [0.006, 0.008, 0.03, 0.038], eye: [1.06, 1.08], roll: 0.07 },
  unsure: { brows: [0.018, 0.022, 0.008, 0.004], eye: [1.02, 1.03], roll: -0.08 },
  concerned: { brows: [0.012, 0.02, 0.02, 0.012], eye: [0.97, 0.97], roll: -0.03 },
  listening: { brows: [0.018, 0.022, 0.022, 0.018], eye: [1.05, 1.08], roll: 0.03 },
  thinking: { brows: [0.008, 0.01, 0.028, 0.034], eye: [1, 1], roll: 0.06 },
}

const REPLIES = {
  rest: 'Happy to help. Tell me a little more about what you’re working on and I’ll dress for the job.',
  vague:
    'I’m in. What are we working on? A recipe, a bug, something to write? Give me a line or two.',
  miss: 'I don’t have an answer written for that one yet. I’m a demo, so my replies are written ahead of time and I know a set of everyday topics. Try asking what a VPN is, how long to boil an egg, or why a plant’s leaves turn yellow.',
}
const RULES = [
  [
    'cook',
    /\b(cook\w*|chefs?|recipes?|dinners?|lunch(es)?|breakfasts?|eat|food|bak(e|es|ing)|eggs?|meal\w*|kitchen|fridge)\b/i,
  ],
  [
    'guard',
    /\b(delet\w*|wipe|erase|rm -rf|overwrit\w*|force.push\w*|permissions?|approv\w*|sudo)\b/i,
  ],
  [
    'tester',
    /\b(tests?|testing|unit tests?|e2e|coverage|jest|vitest|pytest|playwright|flaky|qa)\b/i,
  ],
  [
    'bug',
    /\b(bugs?|buggy|errors?|exceptions?|crash\w*|debug\w*|broken|stack ?traces?|typeerror|segfault)\b/i,
  ],
  ['investigate', /\b(fail\w*|why|investigat\w*|issues?|outage)\b/i],
  [
    'captain',
    /\b(git|github|commits?|committ\w*|pull requests?|prs?|merg(e|ed|ing)|releases?|ship (it|this|my|the)|deploy\w*|changelog)\b/i,
  ],
  ['director', /\b(videos?|youtube|reels?|tiktok|podcasts?|vlogs?|thumbnails?|filming)\b/i],
  [
    'designer',
    /\b(figma|design\w*|ui|ux|logos?|fonts?|typography|mockups?|wireframes?|palettes?)\b/i,
  ],
  ['builder', /\b(build\w*|code|coding|app|website|landing|deploy\w*|component|prototype)\b/i],
  ['music', /\b(music|playlist|songs?|album|audio|mix|beats?)\b/i],
  [
    'planner',
    /\b(schedul\w*|calendar|meetings?|remind\w*|appointments?|reservations?|to-?do|book (a |an )?(table|appointment|call|meeting))\b/i,
  ],
  [
    'traveller',
    /\b(trips?|travel\w*|flights?|hotels?|packing|itinerar\w*|visas?|holidays?|vacations?|airports?)\b/i,
  ],
  [
    'money',
    /\b(budget\w*|money|savings?|tax\w*|invoices?|prices?|spreadsheets?|excel|salary|loans?|mortgages?|invest\w*)\b/i,
  ],
  [
    'coach',
    /\b(workouts?|exercis\w*|gym|fitness|running|sleep|diet|calories|protein|stretch\w*|habits?|stress\w*)\b/i,
  ],
  ['tutor', /\b(explain\w*|teach\w*|learn\w*|understand|how does|what is|dns)\b/i],
  ['garden', /\b(plants?|garden\w*|basil|soil|seeds?|grow\w*|wilting)\b/i],
  ['write', /\b(write|writing|posts?|draft|email|copy|blog|essay|tweet|edit)\b/i],
]
const classify = q => (RULES.find(([, re]) => re.test(q)) || ['rest'])[0]
const isGreeting = q =>
  /^\s*(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|thanks|thank you|cheers)\b/i.test(q)
function localDecide(text) {
  const answer = localAnswer(text)
  const own = answer && ANSWERS[answer].look
  const look = own && own !== 'rest' ? own : classify(text)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const vague = !answer && look === 'rest' && words < 3 && !isGreeting(text) ? 0.8 : 0.1
  const mood = /\b(urgent|asap|broken|down|crash\w*|stuck)\b/i.test(text)
    ? 'concerned'
    : vague > 0.5
      ? 'unsure'
      : look === 'cook'
        ? 'happy'
        : look === 'rest'
          ? 'curious'
          : 'focused'
  return { look, mood, vague, answer, confidence: null, source: 'local' }
}
function answerFor(d, q) {
  if (mathOf(q)) return 'math'
  const id = d.answer
  if (!id || !ANSWERS[id] || id === 'math') return null
  if (d.source === 'jev' && d.answerConfidence != null && d.answerConfidence < 0.6) return null
  const own = ANSWERS[id].look
  if (own !== 'rest' && d.look !== 'rest' && own !== d.look) return null
  return id
}

const KEY_STORE = 'momo.jevKey'
const getKey = () => {
  try {
    return localStorage.getItem(KEY_STORE) || ''
  } catch {
    return ''
  }
}
const setKey = k => {
  try {
    if (k) localStorage.setItem(KEY_STORE, k)
    else {
      localStorage.removeItem(KEY_STORE)
      localStorage.removeItem(KEY_STORE + '.state')
    }
    return true
  } catch {
    return false
  }
}
const keyState = v => {
  try {
    if (v) localStorage.setItem(KEY_STORE + '.state', v)
    return localStorage.getItem(KEY_STORE + '.state') || 'ok'
  } catch {
    return v || 'ok'
  }
}
let brainMode = 'local',
  lastDecision = null,
  proxy = false,
  serverKey = false,
  brainState = 'idle',
  writerName = null,
  writerState = 'ok'
const history = []
function updateBrainMode() {
  if (getKey() && brainState !== 'checking') keyState(brainState)
  brainMode = proxy && (getKey() ? brainState !== 'bad' : serverKey) ? 'jev' : 'local'
}
async function initBrain() {
  try {
    const r = await fetch('api/health', { cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      proxy = true
      serverKey = !!j.live
      writerName = j.writer || null
    }
  } catch {}
  if (getKey()) brainState = keyState()
  updateBrainMode()
  renderBrain()
}
function withTimeout(signal, ms) {
  const c = new AbortController(),
    t = setTimeout(() => c.abort(new DOMException('Timed out', 'TimeoutError')), ms)
  signal?.addEventListener(
    'abort',
    () => {
      clearTimeout(t)
      c.abort(signal.reason)
    },
    { once: true },
  )
  return c.signal
}
async function decide(text, signal) {
  if (brainMode !== 'jev') return localDecide(text)
  const t0 = performance.now()
  const headers = { 'Content-Type': 'application/json' }
  const key = getKey()
  if (key) headers['X-Jev-Key'] = key
  const users = history.filter(h => h.role === 'user')
  const prev = users.length > 1 ? users[users.length - 2].text : ''
  const r = await fetch('api/brain', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, prev }),
    signal: withTimeout(signal, 16000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok)
    throw Object.assign(new Error(j.error || `status ${r.status}`), {
      status: r.status,
      detail: j.detail || null,
    })
  return { ...j, ms: j.ms ?? Math.round(performance.now() - t0) }
}
const keyForm = $('#keyForm'),
  keyInput = $('#keyInput'),
  keyRow = $('#keyRow'),
  keyMask = $('#keyMask'),
  brainStatusEl = $('#brainStatus')
const BRAIN_TEXT = {
  checking: ['Checking the key\u2026', ''],
  ok: ['Using Jev', 'ok'],
  bad: ['Jev rejected this key', 'bad'],
  credits: ['Jev is out of credits', 'bad'],
  invalid: ['Jev couldn’t read the request', 'bad'],
  busy: ['Jev is rate limiting this key. Try again in a minute.', 'bad'],
  overloaded: ['Jev is overloaded right now. Try again soon.', 'bad'],
  down: ['Can\u2019t reach Jev right now', 'bad'],
  noproxy: ['Jev needs the Momo server. Start it with npm run dev.', 'bad'],
}
let brainDetail = ''
const brainStateFor = status =>
  status === 401 || status === 403
    ? 'bad'
    : status === 402
      ? 'credits'
      : status === 422
        ? 'invalid'
        : status === 429
          ? 'busy'
          : status === 529
            ? 'overloaded'
            : 'down'
function showBrain(text, cls) {
  brainStatusEl.textContent = text
  brainStatusEl.className = 'brain-status' + (cls ? ' ' + cls : '')
}
function renderBrain() {
  const key = getKey()
  keyForm.hidden = !!key
  keyRow.hidden = !key
  keyMask.textContent = key ? '\u2022\u2022\u2022\u2022 ' + key.slice(-4) : ''
  if (key && proxy) {
    const [t, c] = BRAIN_TEXT[brainState] || BRAIN_TEXT.ok
    showBrain(c === 'bad' && brainDetail ? `${t}. Jev says: ${brainDetail}` : t, c)
  } else if (key) showBrain(...BRAIN_TEXT.noproxy)
  else if (proxy && serverKey) showBrain('Using Jev with the server key', 'ok')
  else showBrain('Using local rules. Keys are saved in this browser only.', '')
  const ws = $('#writerStatus')
  ws.hidden = !proxy
  const [wt, wc] = !writerName
    ? ['Replies are written ahead of time', '']
    : writerState === 'limit'
      ? [
          `${writerName}\u2019s free limit is used up for now. Using written answers until it resets.`,
          'bad',
        ]
      : writerState === 'bad'
        ? [`The server\u2019s ${writerName} key was rejected. Using written answers.`, 'bad']
        : [`Replies written by ${writerName}`, 'ok']
  ws.textContent = wt
  ws.className = 'brain-status' + (wc ? ' ' + wc : '')
  const d = lastDecision,
    last = $('#brainLast')
  last.hidden = !d
  if (d) {
    const who =
      d.source === 'jev'
        ? `Jev${d.confidence != null ? `, ${Math.round(d.confidence * 100)}% sure` : ''}${d.ms != null ? `, ${d.ms} ms` : ''}${d.tokens != null ? `, ${d.tokens} tokens` : ''}`
        : d.source === 'example'
          ? 'scripted example'
          : 'local rules'
    const how =
      d.source === 'example'
        ? ''
        : d.reply === 'writer'
          ? `\nReply: ${writerName}${d.length ? `, ${d.length}` : ''}`
          : d.reply === 'device'
            ? '\nReply: worked out on your device'
            : d.answerId
              ? `\nReply: written answer, ${ANSWERS[d.answerId].q}`
              : d.reply === 'chat'
                ? '\nReply: small talk, no writer call'
                : `\nReply: none written for this${d.answer && ANSWERS[d.answer] ? ` (closest was “${ANSWERS[d.answer].q}”${d.answerConfidence != null ? `, ${Math.round(d.answerConfidence * 100)}% sure` : ''})` : ''}`
    last.textContent = `Last pick: ${ROLE[d.look] || 'Resting'}, ${d.vague > 0.6 ? 'needs more detail' : d.mood} (${who})${how}`
  }
}
keyForm.addEventListener('submit', async e => {
  e.preventDefault()
  const k = keyInput.value.trim()
  if (!/^[\x21-\x7e]{8,200}$/.test(k)) {
    showBrain('That doesn\u2019t look like a Jev key', 'bad')
    return
  }
  if (!setKey(k)) {
    showBrain('This browser blocked saving the key', 'bad')
    return
  }
  keyInput.value = ''
  brainState = 'checking'
  updateBrainMode()
  renderBrain()
  if (!proxy) return
  try {
    await decide('Hello')
    brainState = 'ok'
    brainDetail = ''
  } catch (err) {
    brainState = brainStateFor(err.status)
    brainDetail = err.detail || ''
  }
  updateBrainMode()
  renderBrain()
})
$('#keyRemove').addEventListener('click', () => {
  setKey('')
  brainState = 'idle'
  brainDetail = ''
  updateBrainMode()
  renderBrain()
  keyInput.focus()
})

const momo = {
  look: 'rest',
  mood: 'neutral',
  yaw: 0,
  yawV: 0,
  roll: 0,
  rollV: 0,
  squash: 0,
  squashV: 0,
  dead: 0,
  deadV: 0,
  deadTarget: 0,
  lift: 0,
  liftV: 0,
  blink: 0,
  blinkT: -1,
  blinkDouble: false,
  nextBlink: 2,
  eye: [0, 0],
  eyeV: [0, 0],
  eyeTarget: [0, 0],
  nextSaccade: 1.2,
  focus: null,
  brows: [0, 0, 0, 0],
  eyeScale: [1, 1],
  hatTilt: 0,
  hatV: 0,
  colors: rgb(palFor('rest')),
  colorTarget: rgb(palFor('rest')),
  spin: null,
  tip: [0, 0, 1],
  tipV: [0, 0, 0],
  glow: 0,
  idea: 0,
  tipKick: 0,
  peekHold: 0,
  wobble: 0,
  wiggle: 0,
  topple: 0,
  fall: 0,
  fallV: 0,
  fallTarget: 0,
  glassY: 0,
  glassT: 0,
  leaf: 0.5,
  antSplay: 0,
  antSplayV: 0,
  antSway: 0,
  antSwayV: 0,
  antTwitch: [0, 0],
  antTwitchV: [0, 0],
  legs: [0, 0, 0, 0, 0, 0],
  legsV: [0, 0, 0, 0, 0, 0],
}
const setMood = m => {
  momo.mood = MOODS[m] ? m : 'neutral'
}

const EXAMPLES = [
  {
    id: 'ex-traveller',
    title: 'Packing for Lisbon',
    q: 'What should I pack for 3 days in Lisbon in October?',
    look: 'traveller',
    mood: 'happy',
    answer: 'packing',
  },
  {
    id: 'ex-lesson',
    title: 'Schrödinger’s cat for a five-year-old',
    q: 'Explain Schrödinger’s cat to me like I’m five',
    look: 'tutor',
    mood: 'happy',
    answer: 'schrodinger',
  },
  {
    id: 'ex-planner',
    title: 'Table for four in Lisbon',
    q: 'Find a table for four in Alfama, Lisbon, this Friday at 7:30',
    look: 'planner',
    mood: 'happy',
    answer: 'booktable',
  },
  {
    id: 'ex-money',
    title: 'A 50/30/20 budget',
    q: 'Split my 2,400 monthly take-home pay with the 50/30/20 rule',
    look: 'money',
    mood: 'focused',
    answer: 'budget',
  },
  {
    id: 'ex-music',
    title: '45 minute focus mix',
    q: 'Make me a 45 minute focus playlist',
    look: 'music',
    mood: 'happy',
    answer: 'focus',
  },
  {
    id: 'ex-write',
    title: 'Launch post for Momo',
    q: 'Write a short launch post for Momo',
    look: 'write',
    mood: 'focused',
    answer: 'launch',
  },
  {
    id: 'ex-coach',
    title: '20 minutes, no equipment',
    q: 'Give me a 20-minute workout with no equipment',
    look: 'coach',
    mood: 'happy',
    answer: 'workout',
  },
  {
    id: 'ex-captain',
    title: 'Ship the sign-up branch',
    q: 'Commit my sign-up changes and open a pull request',
    look: 'captain',
    mood: 'focused',
    answer: 'shippr',
  },
  {
    id: 'ex-guard',
    title: 'Delete the old logs',
    q: 'Delete the logs in ./logs older than 30 days',
    look: 'guard',
    mood: 'concerned',
    answer: 'deletelogs',
  },
  {
    id: 'ex-cook',
    title: 'Spinach skillet in 15 minutes',
    q: 'What can I make with eggs and spinach in 15 minutes?',
    look: 'cook',
    mood: 'happy',
    answer: 'spinach',
  },
  {
    id: 'ex-investigate',
    title: 'Charged twice at checkout',
    q: 'Why are some customers charged twice at checkout?',
    look: 'investigate',
    mood: 'focused',
    answer: 'charged',
  },
  {
    id: 'ex-bug',
    title: 'Cart total off by a fraction',
    q: 'Find the bug: my cart total shows $0.30000000000000004',
    look: 'bug',
    mood: 'focused',
    answer: 'floatcart',
  },
  {
    id: 'ex-builder',
    title: 'Landing page hero',
    q: 'Build a landing page hero for the Momo launch',
    look: 'builder',
    mood: 'focused',
    answer: 'hero',
  },
  {
    id: 'ex-tutor',
    title: 'How DNS finds a website',
    q: 'Explain how DNS works',
    look: 'tutor',
    mood: 'curious',
    answer: 'dns',
  },
  {
    id: 'ex-garden',
    title: 'Rescuing a wilting basil',
    q: 'My basil is wilting, what do I do?',
    look: 'garden',
    mood: 'happy',
    answer: 'basil',
  },
  {
    id: 'ex-designer',
    title: 'Is my grey text readable?',
    q: 'Is light grey text on white readable enough?',
    look: 'designer',
    mood: 'curious',
    answer: 'greytext',
  },
  {
    id: 'ex-director',
    title: 'Hook for a notes app video',
    q: 'Write a hook for a 30-second video about our notes app',
    look: 'director',
    mood: 'focused',
    answer: 'hook',
  },
  {
    id: 'ex-tester',
    title: 'Tests for a sign-up form',
    q: 'Write tests for my sign-up form',
    look: 'tester',
    mood: 'focused',
    answer: 'signuptests',
  },
  {
    id: 'ex-offline',
    title: 'Offline mid-answer',
    q: 'Why did last night\u2019s deploy fail?',
    look: 'investigate',
    mood: 'focused',
    offline: true,
    reply:
      'Back with you. The deploy stopped at the database migration: a new column was added as NOT NULL with no default, so the existing rows blocked it.\n\nFix: add the column as nullable, backfill it, then add the constraint in a second migration.',
  },
  {
    id: 'ex-vague',
    title: 'A one word request',
    q: 'Help',
    look: 'rest',
    mood: 'unsure',
    vague: true,
  },
]
const chat = { own: null, example: null, look: 'rest' }
const stash = new Map()

const avatarCache = new Map()
const avatarJobs = new Map()
const avatarPending = new Set()
const shown = key =>
  [...document.querySelectorAll(`canvas[data-key="${CSS.escape(key)}"]`)].some(
    c => c.offsetParent !== null,
  )
let avatarMs = 0,
  avatarCount = 0
function blit(canvas, src) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
}
function paintAvatar(canvas, look, css) {
  const px = Math.round(css * Math.min(DPR, 4))
  if (canvas.width !== px) {
    canvas.width = px
    canvas.height = px
  }
  const key = `${look}|${px}|${palFor(look)}|${isDark() ? 'dark' : 'light'}`
  canvas.dataset.key = key
  const src = avatarCache.get(key)
  if (src) {
    blit(canvas, src)
    return
  }
  if (!avatarJobs.has(key) && !avatarPending.has(key))
    avatarJobs.set(key, { look, px, small: css <= 30 })
}
function pumpAvatars(budgetMs) {
  const t0 = performance.now()
  for (const [key, job] of avatarJobs) {
    if (performance.now() - t0 > budgetMs) break
    if (!R.isReady(OUTFITS[job.look]) || !shown(key)) continue
    avatarJobs.delete(key)
    const t1 = performance.now()
    const src = document.createElement('canvas')
    src.width = src.height = job.px
    const sig = SIGNATURE[job.look] || {}
    const rpx = Math.min(480, Math.max(96, job.px * (job.small ? 3 : 2)))
    const st = {
      outfit: OUTFITS[job.look],
      face: FACE[job.look],
      palette: palFor(job.look),
      small: job.small ? 1 : 0,
      dead: job.look === 'dead' ? 1 : 0,
      ...sig,
      browOn: 0,
      restMouth: true,
      darkFloor: isDark() ? 1 : 0,
    }
    const done = R.drawAsync ? R.drawAsync(src, rpx, st) : Promise.resolve(R.draw(src, rpx, st))
    avatarMs += performance.now() - t1
    avatarCount++
    avatarPending.add(key)
    done.then(ok => {
      avatarPending.delete(key)
      if (!ok) {
        avatarJobs.set(key, job)
        return
      }
      avatarCache.set(key, src)
      document.querySelectorAll(`canvas[data-key="${CSS.escape(key)}"]`).forEach(c => blit(c, src))
    })
  }
}
const repaintAvatars = () => {
  document
    .querySelectorAll('canvas[data-look]')
    .forEach(c => paintAvatar(c, c.dataset.look, +c.dataset.size))
  renderLadder()
}

const lookColor = look => PALETTES[palFor(look)][1]
function sideRow(title, look, on, working, onClick) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'row' + (on ? ' on' : '')
  if (on) b.setAttribute('aria-current', 'page')
  const t = document.createElement('span')
  t.className = 't'
  t.textContent = title
  const i = document.createElement('span')
  i.className = 'ind' + (working ? ' working' : '')
  i.style.setProperty('--ind', lookColor(look))
  b.append(i, t)
  b.addEventListener('click', onClick)
  return b
}
function renderSide() {
  const onNew = !chat.own?.open && !chat.example
  $('#newChat').classList.toggle('on', onNew)
  const chats = $('#chats')
  chats.replaceChildren()
  $('#chatsGroup').hidden = !chat.own
  if (chat.own)
    chats.append(
      sideRow(chat.own.title, chat.own.look, chat.own.open, busy && chat.own.open, () => openOwn()),
    )
  const ex = $('#examples')
  ex.replaceChildren()
  for (const e of EXAMPLES)
    ex.append(
      sideRow(e.title, e.look, chat.example === e.id, busy && chat.example === e.id, () =>
        openExample(e),
      ),
    )
}
const OUTFIT_LOOKS = [
  'rest',
  'cook',
  'investigate',
  'write',
  'builder',
  'music',
  'tutor',
  'garden',
  'designer',
  'director',
  'coach',
  'traveller',
  'money',
  'planner',
  'captain',
  'tester',
  'bug',
  'guard',
]
function renderOutfits() {
  const el = $('#outfits')
  el.replaceChildren()
  for (const look of OUTFIT_LOOKS) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = look === momo.look ? 'on' : ''
    b.setAttribute('aria-pressed', look === momo.look)
    b.innerHTML = '<span class="dotc"></span>'
    b.append(ROLE[look] || 'Resting')
    b.firstChild.style.setProperty('--c', lookColor(look))
    b.addEventListener('click', () => {
      if (busy || offline) return
      pickBot(look === 'rest' ? MOMO_BOT : builtInBot(look))
    })
    el.append(b)
  }
}
function renderLadder() {
  const el = $('#ladder')
  const look = momo.dead > 0.5 ? 'dead' : momo.look
  el.innerHTML = ''
  for (const css of [72, 44, 28]) {
    const c = document.createElement('canvas')
    c.style.width = c.style.height = css + 'px'
    c.dataset.look = look
    c.dataset.size = css
    el.appendChild(c)
    paintAvatar(c, look, css)
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms))
const thread = $('#thread'),
  messages = $('#messages')
let stick = true
let gliding = 0
let glidedTo = null
let glidedAt = 0
const glide = now => {
  gliding = 0
  if (!stick) return
  const target = thread.scrollHeight - thread.clientHeight
  const gap = target - thread.scrollTop
  const dt = Math.min(64, now - (glidedAt || now - 16))
  glidedAt = now
  const step = gap * (1 - Math.exp(-dt / 90))
  thread.scrollTop =
    Math.abs(gap) <= 1.5 ? target : thread.scrollTop + (Math.abs(step) < 1 ? Math.sign(gap) : step)
  glidedTo = thread.scrollTop
  if (Math.abs(target - thread.scrollTop) >= 1) gliding = requestAnimationFrame(glide)
  else glidedAt = 0
}
const scrollDown = force => {
  if (force === true) stick = true
  if (!stick) return
  if (reduce || force === true) {
    cancelAnimationFrame(gliding)
    gliding = 0
    glidedAt = 0
    thread.scrollTop = thread.scrollHeight
    glidedTo = thread.scrollTop
  } else if (!gliding) gliding = requestAnimationFrame(glide)
}
thread.addEventListener(
  'scroll',
  () => {
    if (glidedTo != null && Math.abs(thread.scrollTop - glidedTo) < 2) return
    stick = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40
  },
  { passive: true },
)
thread.addEventListener(
  'wheel',
  e => {
    if (e.deltaY < 0) stick = false
  },
  { passive: true },
)
for (const el of document.querySelectorAll('.sc')) {
  let t = 0
  el.addEventListener(
    'scroll',
    () => {
      el.classList.add('scrolling')
      clearTimeout(t)
      t = setTimeout(() => el.classList.remove('scrolling'), 900)
    },
    { passive: true },
  )
  el.addEventListener('pointerenter', e => {
    if (e.pointerType === 'mouse') el.classList.add('hovering')
  })
  el.addEventListener('pointerleave', () => el.classList.remove('hovering'))
}
const ACTS = {
  copy: ['copy', 'Copy'],
  speak: ['speaker', 'Read aloud'],
  retry: ['retry', 'Retry'],
}
function actions(list, label) {
  const bar = document.createElement('div')
  bar.className = 'actions'
  bar.setAttribute('role', 'toolbar')
  bar.setAttribute('aria-label', label)
  for (const a of list) {
    const [ic, tip] = ACTS[a]
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'act'
    b.dataset.action = a
    b.dataset.tip = tip
    b.setAttribute('aria-label', tip)
    b.innerHTML = icon(ic)
    bar.appendChild(b)
  }
  return bar
}
function markLatest() {
  messages.querySelectorAll('.msg.latest').forEach(m => m.classList.remove('latest'))
  const bot = [...messages.querySelectorAll('.msg.bot')].pop()
  if (bot?.querySelector('.actions') && bot === [...messages.querySelectorAll('.msg')].pop())
    bot.classList.add('latest')
}
function addUser(text) {
  const el = document.createElement('div')
  el.className = 'msg user'
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.textContent = text
  el.append(bubble, actions(['copy'], 'Message actions'))
  messages.appendChild(el)
  markLatest()
  scrollDown(true)
  return el
}
function addSys(text, ok) {
  const el = document.createElement('div')
  el.className = 'sys' + (ok ? ' ok' : '')
  el.textContent = text
  messages.appendChild(el)
  scrollDown()
  return el
}
const toHex = rgb =>
  '#' +
  rgb
    .map(v =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
function readableInk(ink, bg) {
  let c = hexToRgb(ink)
  const toward = contrast(bg, '#FFFFFF') > contrast(bg, '#000000') ? 255 : 0
  for (let i = 0; i < 20 && contrast(toHex(c), bg) < 4.5; i++)
    c = c.map(v => v + (toward - v) * 0.1)
  return toHex(c)
}
function addBot(look, label = ROLE[look]) {
  const el = document.createElement('div')
  el.className = 'msg bot'
  const cv = document.createElement('canvas')
  cv.dataset.look = look
  cv.dataset.size = 28
  const col = document.createElement('div')
  const pal = PALETTES[palFor(look)]
  col.innerHTML = `<div class="who"><b>Momo</b>${label ? `<span class="role" style="--role-bg:${pal[0]};--role-ink:${readableInk(pal[3], pal[0])};--role-deep:${pal[3]};--role-light:${pal[0]}"></span>` : ''}</div><div class="body"><span class="typing"><i></i><i></i><i></i></span></div>`
  if (label) col.querySelector('.role').textContent = label
  el.style.cssText = `--c:${pal[1]};--c-shade:${pal[2]};--c-deep:${pal[3]};--c-light:${pal[0]}`
  el.append(cv, col)
  messages.appendChild(el)
  paintAvatar(cv, look, 28)
  scrollDown()
  return col.querySelector('.body')
}
function finishBot(body) {
  const col = body?.parentElement
  if (!body?.isConnected || col.querySelector(':scope > .actions')) return
  col.append(actions(['copy', ...(synth ? ['speak'] : []), 'retry'], 'Reply actions'))
  markLatest()
  scrollDown()
}
const rgba = (hex, a) =>
  `rgba(${hexToRgb(hex)
    .map(v => Math.round(v * 255))
    .join(', ')}, ${a})`
const mix = (a, b, t) => toHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t))
function isDark() {
  return document.documentElement.dataset.theme === 'dark'
}
function setAccent() {
  const pal = PALETTES[offline ? 'ash' : palFor(momo.look)]
  const dark = isDark()
  const soft = dark ? mix(pal[2], '#1F1F23', 0.62) : mix(pal[0], '#FFFFFF', 0.25)
  const s = document.documentElement.style
  s.setProperty('--accent', pal[1])
  s.setProperty('--accent-soft', soft)
  s.setProperty('--accent-ink', readableInk(dark ? pal[0] : pal[3], soft))
  s.setProperty('--accent-sel', dark ? mix(pal[2], '#1F1F23', 0.78) : mix(pal[0], '#FFFFFF', 0.55))
  s.setProperty('--accent-light', pal[0])
  s.setProperty('--accent-shade', pal[2])
  s.setProperty('--accent-line', rgba(pal[2], 0.55))
}

const THEME_KEY = 'momo.theme'
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#111113' : '#f8f8f9')
  const next = theme === 'dark' ? 'light' : 'dark'
  const toggle = $('#themeToggle')
  toggle.setAttribute('aria-label', `Switch to ${next} theme`)
  toggle.title = `Switch to ${next} theme`
  setAccent()
  repaintAvatars()
}
$('#themeToggle').addEventListener('click', () => {
  const theme = isDark() ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
  applyTheme(theme)
})
async function revealCard(body, answerId, id) {
  const sources = ANSWERS[answerId]?.sources
  const artifact = ARTIFACTS[answerId]
  if (!artifact && !sources?.length) return
  const extras = document.createElement('div')
  extras.className = 'extras'
  extras.innerHTML = cardMarkup(artifact, sources)
  const card = extras.querySelector('.card')
  if (!fast()) card?.classList.add('loading')
  body.after(extras)
  body.closest('.msg').dataset.answer = answerId
  if (card) layoutCard(card)
  extras
    .querySelectorAll('canvas[data-look]')
    .forEach(c => paintAvatar(c, c.dataset.look, +c.dataset.size))
  if (!card) return
  card.querySelectorAll('.panel[hidden] .block').forEach(b => b.classList.add('ready'))
  const blocks = [...card.querySelectorAll('.block:not(.ready)')]
  scrollDown()
  try {
    await pause(fast() ? 0 : 700, id)
    for (const block of blocks) {
      block.classList.add('ready')
      await pause(fast() ? 0 : 280, id)
    }
  } finally {
    blocks.forEach(b => b.classList.add('ready'))
    card.classList.remove('loading')
    setTimeout(() => card.querySelectorAll('.skeleton').forEach(s => s.remove()), 500)
  }
}
const WORDS = /\s*\S+|\s+$/gu
async function stream(el, text, id, sources) {
  if (fast()) {
    el.innerHTML = formatReply(text, sources)
    return
  }
  const words = text.match(WORDS) || []
  let shown = ''
  for (let i = 0; i < words.length;) {
    const size = 1 + Math.floor(Math.random() * 3)
    let burst = ''
    for (let k = 0; k < size && i < words.length; k++) {
      if (k && words[i].includes('\n\n')) break
      burst += words[i++]
    }
    if (shown && burst.includes('\n\n')) await pause(180 + Math.random() * 260, id)
    shown += burst
    el.innerHTML = formatReply(shown, sources)
    scrollDown()
    await pause(34 + Math.random() * 44, id)
  }
}

const easeSpin = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const spinRate = t => (t < 0.5 ? 12 * t * t : 3 * (2 - 2 * t) ** 2)
const backOut = t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
const clamp01 = t => Math.min(1, Math.max(0, t))
const REVEAL_S = 1.05
const wearing = () => momo.spin?.queued?.look ?? momo.spin?.next ?? momo.look
function spinTo(look) {
  return new Promise(resolve => {
    if (reduce) {
      swapLook(look)
      resolve()
      return
    }
    const s = momo.spin
    if (s && !s.swapped) {
      s.next = look
      s.resolvers.push(resolve)
      return
    }
    if (s) {
      s.queued = { look, resolvers: [...(s.queued?.resolvers || []), resolve] }
      return
    }
    if (look === momo.look) {
      resolve()
      return
    }
    momo.squashV -= 2.2
    blinkNow()
    momo.spin = { t: 0, dur: 0.95, next: look, swapped: false, resolvers: [resolve], queued: null }
  })
}
function swapLook(look) {
  momo.look = look
  momo.colors = rgb(palFor(look))
  momo.colorTarget = momo.colors.map(c => c.slice())
  renderLadder()
  renderOutfits()
  renderSwatches()
  setAccent()
}
function blinkNow(double = false) {
  if (momo.blinkT < 0) {
    momo.blinkT = 0
    momo.blinkDouble = double
  }
}

let busy = false,
  offline = false,
  run = 0,
  runCtl = null,
  current = null,
  connBusy = false
class Cancelled extends Error {}
const alive = id => id == null || id === run
function guard(id) {
  if (!alive(id)) throw new Cancelled()
}
async function pause(ms, id) {
  await wait(ms)
  guard(id)
}
function setOnline(on) {
  $('#status').classList.toggle('off', !on)
  $('#status').lastChild.textContent = on ? 'Online' : 'Offline'
  $('#conn')
    .querySelectorAll('button')
    .forEach(b => {
      const m = (b.dataset.on === '1') === on
      b.classList.toggle('on', m)
      b.setAttribute('aria-pressed', m)
    })
  thread.classList.toggle('offline', !on)
  setAccent()
}
const EXPR = { happy: 1, surprised: 5, dizzy: 6, sparkle: 7, wink: 8, sleepy: 9, sorry: 10 }
const expr = { mode: null, until: 0, hold: false }
function express(mode, ms, hold = false) {
  expr.mode = mode
  expr.until = time + ms / 1000
  expr.hold = hold
}
let lastActive = 0
function wake() {
  lastActive = time
  if (expr.mode === 'sleepy') {
    expr.mode = null
    expr.hold = false
  }
}

const MORPH = {
  1: { smile: 1, brows: [0.026, 0.026, 0.026, 0.026], inMs: 240, outMs: 320 },
  5: { scale: [1.27, 1.02], lift: 0.03, brows: [0.09, 0.11, 0.11, 0.09], inMs: 90, outMs: 340 },
  7: { scale: [1.11, 1.1], lift: 0.01, brows: [0.06, 0.066, 0.066, 0.06], inMs: 170, outMs: 300 },
  8: {
    lids: [1, 0],
    wink: true,
    scale: [1.1, 1.09],
    lift: 0.01,
    brows: [-0.016, -0.03, 0.07, 0.078],
    inMs: 190,
    outMs: 280,
  },
  10: { scale: [0.89, 0.88], brows: [-0.004, 0.028, 0.028, -0.004], inMs: 380, outMs: 420 },
}
const SHUT_MS = 85,
  OPEN_MS = 140,
  WAKE_S = 1.3,
  DROWSE_S = 2.4
const face = { shown: 0, cur: 0, k: 0, close: 0, sleep: 0, wake: -1, stretched: false }
const smooth01 = t => t * t * (3 - 2 * t)
const faceOk = m => !R.faceReady || R.faceReady(m)
function wakeClose(t) {
  if (t < 0.1) return 1
  if (t < 0.28) return 1 - 0.45 * Math.sin((((t - 0.1) / 0.18) * Math.PI) / 2)
  if (t < 0.58) return 0.55 + Math.sin((t - 0.28) * 30) * 0.012
  if (t < 0.65) return 0.55 + 0.45 * smooth01((t - 0.58) / 0.07)
  return 1 - Math.sin((Math.min(1, (t - 0.65) / 0.35) * Math.PI) / 2)
}
function drowseClose(p) {
  if (p < 0.42) return 0.55 * smooth01(p / 0.42)
  if (p < 0.52) return 0.55 + 0.45 * Math.sin(((p - 0.42) / 0.1) * Math.PI)
  if (p < 0.8) return 0.55 + 0.13 * smooth01((p - 0.52) / 0.28)
  if (p < 0.86) return 0.68 + 0.32 * smooth01((p - 0.8) / 0.06)
  return 1
}
function faceStep(want, dt) {
  const F = face
  if (reduce) {
    F.shown = want
    F.k = 0
    F.close = 0
    F.sleep = 0
    F.wake = -1
    return
  }
  if (momo.spin && !momo.spin.landed) {
    if (momo.spin.swapped && F.shown === 2) {
      F.shown = 0
      F.k = 0
      F.close = 0
    }
    return
  }
  const step = (v, to, ms) => {
    const d = (dt * 1000) / ms
    return v < to ? Math.min(to, v + d) : Math.max(to, v - d)
  }
  const outMs = () => MORPH[F.cur]?.outMs || 300
  if (F.wake >= 0) {
    F.wake += dt / WAKE_S
    F.close = wakeClose(Math.min(1, F.wake))
    if (!F.stretched && F.wake >= 0.65) {
      F.stretched = true
      momo.squashV -= 2.6
      momo.liftV += 1.4
    }
    if (F.wake >= 1) {
      F.wake = -1
      F.close = 0
    }
    return
  }
  if (F.shown === 9) {
    if (want === 9 || !faceOk(0)) return
    F.shown = 0
    F.k = 0
    F.close = 1
    F.sleep = 0
    F.wake = 0
    F.stretched = false
    return
  }
  if (want === 9 && F.shown === 0) {
    if (F.k > 0) {
      F.k = step(F.k, 0, outMs())
      return
    }
    F.sleep = Math.min(1, F.sleep + dt / DROWSE_S)
    F.close = drowseClose(F.sleep)
    if (F.sleep >= 1 && faceOk(9)) {
      F.shown = 9
      F.close = 0
    }
    return
  }
  if (want !== 9) F.sleep = 0
  if (F.shown !== 0 && F.shown !== want) {
    if (MORPH[F.shown]) {
      if (faceOk(0)) {
        F.cur = F.shown
        F.k = 1
        F.shown = 0
      }
    } else {
      F.close = step(F.close, 1, SHUT_MS)
      if (F.close >= 1 && faceOk(0)) F.shown = 0
    }
    return
  }
  if (F.shown !== 0) {
    F.close = step(F.close, 0, OPEN_MS)
    return
  }
  if (want === 0) {
    F.k = step(F.k, 0, outMs())
    F.close = step(F.close, 0, OPEN_MS)
    return
  }
  if (F.k > 0 && F.cur !== want) {
    F.k = step(F.k, 0, outMs() * 0.5)
    return
  }
  const M = MORPH[want]
  if (M) {
    F.cur = want
    F.close = step(F.close, 0, OPEN_MS)
    F.k = step(F.k, 1, M.inMs)
    if (F.k >= 1 && faceOk(want)) {
      F.shown = want
      F.k = 0
    }
    return
  }
  F.close = step(F.close, 1, SHUT_MS)
  if (F.close >= 1 && faceOk(want)) F.shown = want
}
function faceLook() {
  const M = face.shown === 0 && face.k > 0 ? MORPH[face.cur] : null
  const m = M ? smooth01(face.k) : 0
  const sleepy =
    face.shown !== 0
      ? 0
      : face.wake >= 0
        ? 1 - smooth01(Math.min(1, face.wake / 0.1))
        : smooth01(Math.max(0, (face.sleep - 0.86) / 0.14))
  return {
    sleepy,
    smile: M?.smile ? M.smile * m : 0,
    scale: M?.scale ? [1 + (M.scale[0] - 1) * m, 1 + (M.scale[1] - 1) * m] : [1, 1],
    lift: M?.lift ? M.lift * m : 0,
    brows: M?.brows ? M.brows.map(b => b * m) : [0, 0, 0, 0],
    lids: M?.lids ? M.lids.map(l => l * (M.wink ? Math.min(1, m / 0.6) : m)) : [0, 0],
    wink: M?.wink ? smooth01(Math.min(1, Math.max(0, (m - 0.6) / 0.4))) : 0,
  }
}

async function playDead(note, id) {
  offline = true
  setOnline(false)
  if (current && current.id === id) current.dropped = true
  momo.focus = null
  setMood('neutral')
  const el = note ? addSys(note) : null
  if (reduce) {
    momo.deadTarget = 1
    momo.colorTarget = rgb('ash')
    momo.fallTarget = 1
    return el
  }
  express('surprised', 520)
  blinkNow()
  momo.liftV += 2.4
  momo.squashV += 2.2
  await wait(420)
  if (!alive(id)) return el
  express('dizzy', 900)
  momo.wobble = 1
  await wait(700)
  if (!alive(id)) return el
  momo.deadTarget = 1
  momo.colorTarget = rgb('ash')
  momo.topple = 1
  setTimeout(() => {
    if (momo.deadTarget) {
      momo.fallTarget = 1
      momo.fallV += 1.2
    }
  }, 160)
  return el
}
async function revive(okText, id) {
  const done = () => {
    offline = false
    setOnline(true)
    if (current && current.id === id) current.dropped = false
    if (okText) addSys(okText, true)
  }
  if (reduce) {
    momo.fallTarget = 0
    momo.deadTarget = 0
    momo.topple = 0
    momo.colorTarget = rgb(palFor(momo.look))
    done()
    return
  }
  momo.tipKick = 0.9
  await wait(320)
  if (!alive(id)) return
  momo.peekHold = 0.55
  await wait(520)
  if (!alive(id)) return
  express('surprised', 420)
  blinkNow()
  momo.topple = 0
  momo.deadTarget = 0
  momo.deadV += 3
  momo.liftV += 2.8
  momo.colorTarget = rgb(palFor(momo.look))
  await wait(260)
  if (!alive(id)) return
  momo.fallTarget = 0
  await wait(420)
  if (!alive(id)) return
  momo.squashV -= 2.4
  express('happy', 1000)
  momo.wiggle = 1
  done()
  await wait(900)
  if (alive(id)) setMood('neutral')
}
function quickRevive() {
  momo.deadTarget = 0
  momo.fallTarget = 0
  momo.topple = 0
  momo.tipKick = 0
  momo.peekHold = 0
  momo.colorTarget = rgb(palFor(momo.look))
  momo.liftV += 1.6
  offline = false
  setOnline(true)
}

function markBrainOk(d) {
  if (d?.source === 'jev' && getKey() && brainState !== 'ok') {
    brainState = 'ok'
    brainDetail = ''
    updateBrainMode()
    renderBrain()
  }
  return d
}
async function decideWithRetries(text, id) {
  try {
    return markBrainOk(await decide(text, runCtl?.signal))
  } catch (e) {
    guard(id)
    if ([401, 402, 403, 422, 429, 503, 529].includes(e.status)) {
      const own = !!getKey()
      if (own && e.status !== 503) {
        brainState = brainStateFor(e.status)
        brainDetail = e.detail || ''
      }
      const why =
        e.status === 401 || e.status === 403
          ? own
            ? 'Jev rejected the saved key'
            : 'Jev rejected the API key'
          : e.status === 402
            ? 'Jev is out of credits'
            : e.status === 429
              ? 'Jev is rate limiting this key'
              : e.status === 529
                ? 'Jev is overloaded'
                : 'Jev couldn\u2019t read that request'
      addSys(`${why}${e.detail ? ` (${e.detail})` : ''}. Using local rules for now.`)
      express('sorry', 1800)
      if (own) updateBrainMode()
      else brainMode = 'local'
      renderBrain()
      return localDecide(text)
    }
    const note = await playDead('Can\u2019t reach Jev. Retrying in 3 s.', id)
    guard(id)
    for (let attempt = 1; attempt <= 3; attempt++) {
      for (let s = 3; s >= 1; s--) {
        note.textContent = `Can\u2019t reach Jev. Retrying in ${s} s.`
        await pause(1000, id)
      }
      note.textContent = 'Reconnecting\u2026'
      try {
        const d = markBrainOk(await decide(text, runCtl?.signal))
        guard(id)
        await revive('Back online.', id)
        guard(id)
        return d
      } catch (err) {
        if (err instanceof Cancelled) throw err
        guard(id)
      }
    }
    note.textContent = 'Jev is still unreachable.'
    brainState = 'down'
    brainMode = 'local'
    renderBrain()
    await revive('Using local rules until Jev is back.', id)
    guard(id)
    return localDecide(text)
  }
}

async function dropConnection(id) {
  const note = await playDead('Can\u2019t reach the server. Retrying in 3 s.', id)
  guard(id)
  for (let s = 2; s >= 1; s--) {
    await pause(1000, id)
    note.textContent = `Can\u2019t reach the server. Retrying in ${s} s.`
  }
  await pause(1000, id)
  note.textContent = 'Reconnecting\u2026'
  await pause(700, id)
  await revive('Back online.', id)
  guard(id)
}

function quickDecide(q) {
  const local = localAnswer(q)
  if (local === 'math' || local === 'time' || local === 'date')
    return { ...localDecide(q), reply: 'device' }
  if (isGreeting(q) && q.trim().split(/\s+/).length <= 3)
    return { ...localDecide(q), reply: 'chat' }
  return null
}
function askWriter(length) {
  const a = { text: '', done: false, error: null, status: 0, wake: null }
  const ping = () => {
    const w = a.wake
    a.wake = null
    w?.()
  }
  a.next = () =>
    a.done
      ? Promise.resolve()
      : new Promise(r => {
          a.wake = r
        })
  const now = new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })
  ;(async () => {
    try {
      const r = await fetch('api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), now, length }),
        signal: runCtl.signal,
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        a.status = r.status
        a.error = j.error || `status ${r.status}`
        return
      }
      const reader = r.body.getReader(),
        dec = new TextDecoder()
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        a.text += dec.decode(value, { stream: true })
        ping()
      }
      a.text += dec.decode()
    } catch (err) {
      if (err?.name !== 'AbortError') a.error = a.error || 'network error'
    } finally {
      a.done = true
      ping()
    }
  })()
  return a
}
async function flowInto(el, a, cur, id) {
  let shown = 0
  for (;;) {
    guard(id)
    cur.reply = a.text
    if (shown < a.text.length) {
      shown = fast()
        ? a.text.length
        : Math.min(a.text.length, shown + Math.max(2, Math.ceil((a.text.length - shown) / 6)))
      if (/[\uD800-\uDBFF]/.test(a.text[shown - 1] || '')) shown++
      el.textContent = a.text.slice(0, shown)
      scrollDown()
      await pause(fast() ? 0 : 16, id)
    } else if (a.done) return
    else await a.next()
  }
}
function writerFailed(a) {
  const perIp = a.status === 429 && /wait a minute/i.test(a.error)
  writerState =
    a.status === 429 && !perIp ? 'limit' : a.status === 401 || a.status === 403 ? 'bad' : 'ok'
  addSys(
    perIp
      ? 'Too many messages at once. Using written answers for this one.'
      : writerState === 'limit'
        ? `${writerName}\u2019s free limit is used up for now. Using written answers.`
        : writerState === 'bad'
          ? `The server\u2019s ${writerName} key was rejected. Using written answers.`
          : `${writerName} couldn\u2019t answer (${a.error}). Using written answers.`,
  )
  express('sorry', 1600)
  renderBrain()
}
function replyKind(d, q) {
  return answerFor(d, q)
    ? 'answer'
    : d.vague > 0.6
      ? 'vague'
      : isGreeting(q) || d.reply === 'chat'
        ? 'rest'
        : 'miss'
}
function replyFor(d, q) {
  const id = answerFor(d, q)
  return id ? answerText(id, q) : REPLIES[replyKind(d, q)]
}
function finishReply(c) {
  let { reply, look } = c
  if (c.ans) {
    reply = !reply ? 'Stopped.' : c.ans.done ? reply : reply + '\u2026'
    look = look || localDecide(c.q).look
  } else if (!reply) {
    const d = localDecide(c.q)
    look = d.look
    reply = replyFor(d, c.q)
  }
  const body = c.body || addBot(look, c.label)
  body.innerHTML = formatReply(reply, ANSWERS[c.answer]?.sources)
  history.push({ role: 'momo', text: spokenReply(reply) })
  if (c.own && chat.own) chat.own.look = look
  finishBot(body)
}
function cancelRun() {
  if (!busy || !current) return
  const c = current
  run++
  busy = false
  current = null
  runCtl?.abort()
  runCtl = null
  finishReply(c)
  momo.focus = null
  momo.idea = 0
  expr.mode = null
  expr.hold = false
  setMood('neutral')
  if (c.dropped) quickRevive()
  syncComposer()
}

async function send(q, script = null, again = null) {
  if (busy || !q.trim()) return
  const id = ++run
  busy = true
  runCtl = new AbortController()
  stopSpeaking()
  syncComposer()
  const cur = (current = {
    id,
    q,
    own: false,
    body: null,
    reply: null,
    look: null,
    dropped: false,
    ans: null,
  })
  if (script) {
    cur.look = script.look
    cur.reply =
      script.reply || (script.answer ? answerText(script.answer, script.q) : REPLIES.vague)
  }
  try {
    thread.classList.add('started')
    if (!script && !chat.example && !chat.own?.open) {
      chat.own = { title: q, look: 'rest', open: true, bot }
      $('#title').textContent = q
    }
    cur.own = !script && !!chat.own?.open
    renderSide()
    const userEl = again || addUser(q)
    if (again) {
      markLatest()
      scrollDown(true)
    } else history.push({ role: 'user', text: q })
    momo.focus = userEl
    setMood('listening')
    momo.squashV -= 1.2
    blinkNow()
    await pause(fast() ? 0 : script ? 280 : 420, id)
    if (offline) {
      addSys('Can\u2019t send while offline. Switch Connection back to Online in the Playground.')
      momo.focus = null
      cur.reply = null
      current = null
      return
    }
    setMood('thinking')
    momo.focus = 'think'
    if (script?.offline) {
      await pause(reduce ? 0 : 500, id)
      await dropConnection(id)
    }
    const quick = script ? null : quickDecide(q)
    const d = script
      ? { look: script.look, mood: script.mood, vague: script.vague ? 1 : 0, source: 'example' }
      : quick || (await decideWithRetries(q, id))
    guard(id)
    const next = script ? d.look : pinnedLook() || d.look
    cur.look = next
    cur.label = script ? undefined : ownLabel()
    if (!script && !quick) {
      const small =
        d.route === 'chat' && (d.routeConfidence ?? 0) >= 0.8 && q.trim().split(/\s+/).length <= 6
      if (small) d.reply = 'chat'
      else if (proxy && writerName) {
        cur.ans = askWriter(d.length)
        d.reply = 'writer'
      }
    }
    cur.reply = script ? cur.reply : cur.ans ? '' : replyFor(d, q)
    d.answerId = script ? script.answer || null : cur.ans ? null : answerFor(d, q)
    cur.answer = d.answerId
    lastDecision = d
    renderBrain()
    const body = (cur.body = addBot(next, cur.label))
    momo.focus = body
    momo.idea = 0.55
    momo.liftV += 1.6
    express('sparkle', 650)
    setMood(d.vague > 0.6 ? 'unsure' : d.mood)
    if (next !== wearing())
      spinTo(next).then(() => {
        if (alive(id) && next === 'builder') momo.squashV -= 4.2
      })
    else if (next === 'builder') momo.squashV -= 4.2
    await pause(fast() ? 0 : cur.ans ? 380 : 700 + Math.random() * 500, id)
    if (cur.ans) {
      await flowInto(body, cur.ans, cur, id)
      if (cur.ans.text) {
        if (writerState !== 'ok') {
          writerState = 'ok'
          renderBrain()
        }
      } else {
        writerFailed(cur.ans)
        cur.ans = null
        d.reply = null
        d.answer = d.answer || localAnswer(q)
        cur.reply = replyFor(d, q)
        d.answerId = answerFor(d, q)
        renderBrain()
        messages.appendChild(body.closest('.msg'))
        await stream(body, cur.reply, id, ANSWERS[d.answerId]?.sources)
      }
    } else await stream(body, cur.reply, id, ANSWERS[d.answerId]?.sources)
    if (d.answerId) await revealCard(body, d.answerId, id)
    history.push({ role: 'momo', text: spokenReply(cur.reply) })
    finishBot(body)
    momo.focus = null
    if (chat.own?.open) chat.own.look = next
    chat.look = next
    if (!script && !cur.ans && replyKind(d, q) === 'miss') {
      setMood('concerned')
      express('sorry', 1400)
    } else {
      momo.squashV -= 1.6
      setMood('happy')
      express(Math.random() < 0.5 ? 'wink' : 'happy', 1200)
    }
    setTimeout(
      () => {
        if (alive(id)) momo.liftV += 2.4
      },
      reduce ? 0 : 140,
    )
    setTimeout(() => {
      if (!busy) setMood('neutral')
    }, 2600)
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e
  } finally {
    if (run === id) {
      busy = false
      current = null
      runCtl = null
      renderSide()
      syncComposer()
    }
  }
}

function leaveChat() {
  stopSpeaking()
  stopCardAudio()
  if (chat.own?.open) {
    stash.set('own', { nodes: [...messages.childNodes], history: history.slice() })
    chat.own.open = false
  }
  messages.replaceChildren()
  history.length = 0
  chat.example = null
  thread.classList.remove('started')
}
async function openExample(e) {
  if (chat.example === e.id) return
  cancelRun()
  leaveChat()
  chat.example = e.id
  $('#title').textContent = e.title
  bot = e.look === MOMO_BOT.look ? MOMO_BOT : builtInBot(e.look)
  showBot()
  setPlay(false)
  send(e.q, e)
}
async function openOwn() {
  if (chat.own?.open) return
  cancelRun()
  leaveChat()
  const saved = stash.get('own')
  chat.own.open = true
  $('#title').textContent = chat.own.title
  bot = chat.own.bot
  showBot()
  if (saved) {
    messages.replaceChildren(...saved.nodes)
    history.push(...saved.history)
    thread.classList.add('started')
    markLatest()
    scrollDown(true)
  }
  renderSide()
  if (!offline && chat.own.look !== wearing()) await spinTo(chat.own.look)
}

const input = $('#input'),
  composer = $('#composer'),
  sendBtn = $('#send'),
  micBtn = $('#mic'),
  dockNote = $('#dockNote')
let typingT = 0
function autoGrow() {
  input.style.height = 'auto'
  const max = parseFloat(getComputedStyle(input).maxHeight) || 208
  input.style.height = Math.min(input.scrollHeight, max) + 'px'
  input.classList.toggle('overflow', input.scrollHeight > max)
}
function syncComposer() {
  sendBtn.textContent = busy ? 'Stop' : 'Send'
  sendBtn.classList.toggle('stop', busy)
  sendBtn.disabled = !busy && !input.value.trim()
  thread.classList.toggle('busy', busy)
}
let noteT = 0
function note(text) {
  dockNote.textContent = text
  dockNote.classList.add('show')
  clearTimeout(noteT)
  noteT = setTimeout(() => dockNote.classList.remove('show'), 3600)
}
input.addEventListener('input', () => {
  typingT = 1.1
  momo.squashV -= 0.25
  wake()
  autoGrow()
  syncComposer()
})
window.addEventListener('pointerdown', () => wake())
input.addEventListener('focus', () => {
  typingT = 0.8
})
input.addEventListener('keydown', e => {
  if (e.key === 'Escape' && dictation) {
    e.preventDefault()
    stopDictation()
    return
  }
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  if (!busy) composer.requestSubmit()
})
composer.addEventListener('submit', e => {
  e.preventDefault()
  if (busy) {
    if (e.submitter) cancelRun()
    return
  }
  if (dictation) stopDictation(true)
  const q = input.value
  if (!q.trim()) return
  input.value = ''
  autoGrow()
  typingT = 0
  send(q)
  syncComposer()
})

const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let dictation = null
function setMic(on) {
  micBtn.classList.toggle('on', on)
  micBtn.classList.remove('hearing')
  micBtn.innerHTML = icon(on ? 'micFill' : 'mic')
  const label = on ? 'Stop dictation' : 'Dictate'
  micBtn.setAttribute('aria-pressed', on)
  micBtn.setAttribute('aria-label', label)
  micBtn.dataset.tip = label
  composer.classList.toggle('dictating', on)
  input.placeholder = on ? 'Listening…' : idlePlaceholder()
}
function stopDictation(discard = false) {
  if (!dictation) return
  if (discard) {
    dictation.rec.onresult = null
    dictation.rec.abort()
  } else dictation.rec.stop()
}
function startDictation() {
  const rec = new SR()
  rec.lang = navigator.language || 'en-US'
  rec.interimResults = true
  rec.continuous = true
  const head = input.value && !/\s$/.test(input.value) ? input.value + ' ' : input.value
  const d = (dictation = { rec, head, heard: false })
  rec.onstart = () => {
    if (!busy) {
      setMood('listening')
      momo.focus = input
    }
    blinkNow()
  }
  rec.onspeechstart = () => micBtn.classList.add('hearing')
  rec.onspeechend = () => micBtn.classList.remove('hearing')
  rec.onresult = e => {
    let text = ''
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
    d.heard = true
    input.value = d.head + text.replace(/^\s+/, '')
    autoGrow()
    syncComposer()
    input.scrollTop = input.scrollHeight
    typingT = 1.1
    momo.squashV -= 0.3
    wake()
  }
  rec.onerror = e => {
    const why = {
      'not-allowed': 'Microphone access is blocked. Allow it for this site to dictate.',
      'service-not-allowed': 'This browser won’t let the page use speech input.',
      'audio-capture': 'No microphone was found.',
      network: 'Dictation needs a connection to the speech service.',
    }[e.error]
    if (why) {
      note(why)
      express('sorry', 1400)
    }
  }
  rec.onend = () => {
    if (dictation !== d) return
    dictation = null
    setMic(false)
    if (!busy) {
      momo.focus = null
      setMood('neutral')
    }
    if (d.heard) {
      momo.squashV -= 1.2
      blinkNow()
    }
    input.focus()
  }
  setMic(true)
  try {
    rec.start()
  } catch {
    dictation = null
    setMic(false)
  }
}
if (SR && window.isSecureContext) {
  micBtn.hidden = false
  micBtn.innerHTML = icon('mic')
  micBtn.addEventListener('click', () => {
    wake()
    if (dictation) stopDictation()
    else startDictation()
  })
}

const synth =
  'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
    ? window.speechSynthesis
    : null
let speaking = null
const talk = { on: false, word: 0 }
function pickVoice() {
  const vs = synth.getVoices(),
    lang = (navigator.language || 'en-US').toLowerCase().slice(0, 2)
  const same = vs.filter(v => v.lang.toLowerCase().startsWith(lang))
  const pool = same.length ? same : vs.filter(v => v.lang.toLowerCase().startsWith('en'))
  return (
    pool.find(v => /natural|neural/i.test(v.name)) ||
    pool.find(v => /google|samantha|ava|allison|aria|jenny/i.test(v.name)) ||
    pool.find(v => v.default) ||
    pool[0] ||
    null
  )
}
function setSpeakBtn(b, on) {
  if (!b.isConnected) return
  const label = on ? 'Stop reading' : 'Read aloud'
  b.classList.toggle('on', on)
  b.classList.remove('swap')
  void b.offsetWidth
  b.classList.add('swap')
  b.innerHTML = icon(on ? 'stop' : 'speaker')
  b.setAttribute('aria-label', label)
  b.dataset.tip = label
}
function stopSpeaking() {
  if (!speaking) return
  const s = speaking
  speaking = null
  talk.on = false
  synth.cancel()
  setSpeakBtn(s.btn, false)
}
function speak(btn, text) {
  if (speaking?.btn === btn) {
    stopSpeaking()
    return
  }
  stopSpeaking()
  const parts = []
  for (const piece of text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text]) {
    const p = piece.trim()
    if (!p) continue
    if (parts.length && parts[parts.length - 1].length + p.length < 180)
      parts[parts.length - 1] += ' ' + p
    else parts.push(p)
  }
  if (!parts.length) return
  const s = (speaking = { btn }),
    voice = pickVoice()
  setSpeakBtn(btn, true)
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = 1.02
    u.onstart = () => {
      if (speaking === s) {
        talk.on = true
        talk.word = time
      }
    }
    u.onboundary = e => {
      if (speaking === s && e.name !== 'sentence') {
        talk.word = time
        momo.squashV -= 0.7
      }
    }
    if (i === parts.length - 1)
      u.onend = u.onerror = () => {
        if (speaking === s) {
          speaking = null
          talk.on = false
          setSpeakBtn(btn, false)
        }
      }
    synth.speak(u)
  })
  wake()
  blinkNow()
}
if (synth) synth.getVoices()

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {}
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {}
  ta.remove()
  return ok
}
const copyTimers = new WeakMap()
function showCopied(b, ok) {
  const label = ok ? 'Copied' : 'Couldn’t copy'
  b.classList.remove('swap')
  void b.offsetWidth
  b.classList.add('swap')
  b.innerHTML = icon(ok ? 'check' : 'copy')
  b.dataset.tip = label
  b.setAttribute('aria-label', label)
  clearTimeout(copyTimers.get(b))
  copyTimers.set(
    b,
    setTimeout(() => {
      b.classList.remove('swap')
      b.innerHTML = icon('copy')
      b.dataset.tip = 'Copy'
      b.setAttribute('aria-label', 'Copy')
    }, 1600),
  )
  if (ok) {
    momo.squashV -= 1
    blinkNow()
  }
}
function retryLast() {
  if (busy || offline) return
  const u = [...messages.querySelectorAll('.msg.user')].pop()
  if (!u) return
  const q = u.querySelector('.bubble').textContent
  while (u.nextSibling) u.nextSibling.remove()
  const i = history.map(h => h.role).lastIndexOf('user')
  if (i >= 0) history.length = i + 1
  send(q, (chat.example && EXAMPLES.find(e => e.id === chat.example)) || null, u)
}
wireCards(messages, { send: q => send(q), copyText, busy: () => busy || offline })
messages.addEventListener('click', e => {
  const b = e.target.closest('.act')
  if (!b) return
  const msg = b.closest('.msg'),
    answer = ANSWERS[msg.dataset.answer],
    said = answer
      ? spokenReply(answer.text)
      : msg.querySelector('.body, .bubble')?.textContent || '',
    text = answer ? copiedReply(answer.text, answer.sources) : said
  wake()
  if (b.dataset.action === 'copy') copyText(text).then(ok => showCopied(b, ok))
  else if (b.dataset.action === 'speak') speak(b, said)
  else if (b.dataset.action === 'retry') retryLast()
})
$('#newChat').addEventListener('click', async () => {
  cancelRun()
  leaveChat()
  $('#title').textContent = 'New chat'
  renderSide()
  bot = MOMO_BOT
  showBot()
  if (!offline && wearing() !== MOMO_BOT.look) await spinTo(MOMO_BOT.look)
})
function setInstant(on) {
  instant = on
  $('#replies')
    .querySelectorAll('button')
    .forEach(b => {
      const m = (b.dataset.instant === '1') === on
      b.classList.toggle('on', m)
      b.setAttribute('aria-pressed', m)
    })
}
setInstant(instant)
$('#replies').addEventListener('click', e => {
  const b = e.target.closest('button')
  if (!b) return
  setInstant(b.dataset.instant === '1')
  try {
    localStorage.setItem(INSTANT_KEY, instant ? '1' : '0')
  } catch {}
})
$('#conn').addEventListener('click', async e => {
  const b = e.target.closest('button')
  if (!b) return
  const on = b.dataset.on === '1'
  if (connBusy || on === !offline) return
  cancelRun()
  if (on === !offline) return
  connBusy = true
  if (on) await revive(null)
  else await playDead(null)
  connBusy = false
})
const play = $('#play'),
  playToggle = $('#playToggle')
function setPlay(open) {
  if (open)
    play.style.transformOrigin = `${playToggle.getBoundingClientRect().left + playToggle.offsetWidth / 2 - play.offsetLeft}px -8px`
  play.classList.toggle('open', open)
  playToggle.setAttribute('aria-expanded', open)
}
playToggle.addEventListener('click', () => setPlay(!play.classList.contains('open')))
document.addEventListener('pointerdown', e => {
  if (play.classList.contains('open') && !play.contains(e.target) && !playToggle.contains(e.target))
    setPlay(false)
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && play.classList.contains('open')) {
    setPlay(false)
    playToggle.focus()
  }
})

const side = $('#side'),
  sideToggle = $('#sideToggle'),
  scrim = $('#scrim')
const phone = matchMedia('(max-width: 720px)')
function setSide(open) {
  side.classList.toggle('open', open)
  scrim.classList.toggle('show', open)
  sideToggle.setAttribute('aria-expanded', open)
  side.inert = phone.matches && !open
}
setSide(false)
phone.addEventListener('change', () => setSide(false))

let drag = null,
  dragged = false
side.addEventListener('pointerdown', e => {
  dragged = false
  if (e.pointerType === 'mouse' || !side.classList.contains('open')) return
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    dx: 0,
    trail: [{ t: e.timeStamp, x: 0 }],
    live: false,
  }
})
side.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y
  if (!drag.live) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) drag = null
    if (!drag || Math.abs(dx) < 10) return
    drag.live = true
    side.setPointerCapture(e.pointerId)
    side.classList.add('dragging')
    scrim.classList.add('dragging')
  }
  const next = Math.min(0, dx)
  drag.dx = next
  drag.trail.push({ t: e.timeStamp, x: next })
  side.style.transform = `translateX(${next}px)`
  scrim.style.opacity = String(1 + next / side.offsetWidth)
})
function endDrag(e) {
  if (!drag) return
  const { dx, trail, live } = drag
  drag = null
  if (!live) return
  const last = trail.at(-1),
    from = trail.findLast(p => last.t - p.t >= 60) || trail[0],
    v = (last.x - from.x) / Math.max(16, last.t - from.t),
    flick = e.timeStamp - last.t < 80 && v < -0.3
  dragged = true
  side.classList.remove('dragging')
  scrim.classList.remove('dragging')
  side.style.transform = ''
  scrim.style.opacity = ''
  setSide(!(dx < -side.offsetWidth * 0.3 || flick))
}
side.addEventListener(
  'touchmove',
  e => {
    if (drag?.live) e.preventDefault()
  },
  { passive: false },
)
side.addEventListener('pointerup', endDrag)
side.addEventListener('pointercancel', endDrag)
side.addEventListener(
  'click',
  e => {
    if (!dragged) return
    dragged = false
    e.stopPropagation()
    e.preventDefault()
  },
  true,
)
sideToggle.addEventListener('click', () => setSide(!side.classList.contains('open')))
scrim.addEventListener('click', () => setSide(false))
side.addEventListener('click', e => {
  if (e.target.closest('.row') && side.classList.contains('open')) setSide(false)
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && side.classList.contains('open')) {
    setSide(false)
    sideToggle.focus()
  }
})

async function dressAs(look) {
  await spinTo(look)
  setMood('happy')
  express('happy', 900)
  setTimeout(() => {
    if (!busy) setMood('neutral')
  }, 1600)
}

const OWN_BOTS_KEY = 'momo.bots'
const readStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}
const MOMO_BOT = { id: 'momo', look: 'rest', name: 'Momo', job: JOB.rest }
const builtInBot = look => ({ id: look, look, name: ROLE[look], job: JOB[look] })
const ownBots = readStore(OWN_BOTS_KEY, []).filter(
  b => b && typeof b.name === 'string' && OUTFITS[b.look] != null,
)
let bot = MOMO_BOT
const pinnedLook = () => (bot.id === MOMO_BOT.id ? null : bot.look)
const ownLabel = () => (bot.own ? bot.name : undefined)
const idlePlaceholder = () => `Ask ${bot.name} anything`

const botPick = $('#botPick'),
  botMenu = $('#botMenu'),
  newBot = $('#newBot'),
  botForm = $('#botForm'),
  botNameInput = $('#botNameInput'),
  botJobInput = $('#botJobInput'),
  botPreview = $('#botPreview')

function showBot() {
  $('#botName').textContent = bot.name
  if (!dictation) input.placeholder = idlePlaceholder()
}

let popover = null
function openPopover(pop, trigger, cap) {
  closePopover()
  setPlay(false)
  const r = trigger.getBoundingClientRect(),
    gap = 8,
    edge = 12
  pop.style.maxHeight = ''
  const w = pop.offsetWidth,
    need = Math.min(pop.scrollHeight, cap)
  const below = innerHeight - r.bottom - gap - edge,
    above = r.top - gap - edge
  const up = below < Math.min(need, 240) && above > below
  const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, edge), innerWidth - w - edge)
  pop.style.left = `${left}px`
  pop.style.top = up ? 'auto' : `${r.bottom + gap}px`
  pop.style.bottom = up ? `${innerHeight - r.top + gap}px` : 'auto'
  pop.style.maxHeight = `${Math.min(cap, up ? above : below)}px`
  pop.style.transformOrigin = `${r.left + r.width / 2 - left}px ${up ? `calc(100% + ${gap}px)` : `-${gap}px`}`
  pop.classList.add('open')
  trigger.setAttribute('aria-expanded', 'true')
  popover = { pop, trigger }
}
function closePopover(refocus = false) {
  if (!popover) return
  const { pop, trigger } = popover
  popover = null
  pop.classList.remove('open')
  trigger.setAttribute('aria-expanded', 'false')
  if (refocus) trigger.focus()
}
const isOpen = pop => popover?.pop === pop

function botRow(b) {
  const on = b.id === bot.id
  const row = document.createElement('button')
  row.type = 'button'
  row.tabIndex = -1
  row.setAttribute('role', 'menuitemradio')
  row.setAttribute('aria-checked', on)
  const dot = document.createElement('i')
  dot.className = 'dotc'
  dot.style.setProperty('--c', lookColor(b.look))
  const name = document.createElement('span')
  name.className = 'nm'
  name.textContent = b.name
  const job = document.createElement('span')
  job.className = 'job'
  job.textContent = b.job
  row.append(dot, name, job)
  if (on) row.insertAdjacentHTML('beforeend', icon('check'))
  row.addEventListener('click', () => pickBot(b))
  return row
}
function botGroup(label, bots) {
  const group = document.createElement('div')
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', label)
  const title = document.createElement('div')
  title.className = 'label'
  title.setAttribute('aria-hidden', 'true')
  title.textContent = label
  group.append(title, ...bots.map(botRow))
  return group
}
function renderBotMenu() {
  $('#botList').replaceChildren(
    botRow(MOMO_BOT),
    ...(ownBots.length ? [botGroup('Yours', ownBots)] : []),
    ...BOT_GROUPS.map(([label, looks]) => botGroup(label, looks.map(builtInBot))),
  )
}
function pickBot(next) {
  bot = next
  if (chat.own?.open) chat.own.bot = next
  showBot()
  closePopover(true)
  if (!busy && !offline && bot.look !== wearing()) dressAs(bot.look)
}

const draftLook = () => {
  const byName = classify(botNameInput.value)
  return byName === 'rest' ? classify(botJobInput.value) : byName
}
function syncBotForm() {
  const look = draftLook()
  $('#botOutfit').textContent = ROLE[look] ? `${ROLE[look]} outfit` : 'Plain Momo'
  botPreview.dataset.look = look
  paintAvatar(botPreview, look, 44)
  $('#botCreate').disabled = !botNameInput.value.trim()
}

botPick.addEventListener('click', () => {
  if (isOpen(botMenu)) return closePopover()
  renderBotMenu()
  openPopover(botMenu, botPick, 360)
  botMenu.querySelector('[aria-checked="true"]').focus()
})
botMenu.addEventListener('keydown', e => {
  if (e.key === 'Tab') return closePopover(true)
  const items = [...botMenu.querySelectorAll('[role="menuitemradio"]')]
  const at = items.indexOf(document.activeElement)
  const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key]
  if (to === undefined) return
  e.preventDefault()
  items[(to + items.length) % items.length].focus()
})
newBot.addEventListener('click', () => {
  if (isOpen(botForm)) return closePopover()
  botForm.reset()
  syncBotForm()
  openPopover(botForm, newBot, 400)
  botNameInput.focus()
})
botForm.addEventListener('input', syncBotForm)
$('#botCancel').addEventListener('click', () => closePopover(true))
botForm.addEventListener('submit', e => {
  e.preventDefault()
  const name = botNameInput.value.trim()
  if (!name) return
  const look = draftLook()
  const made = {
    id: `own-${Date.now().toString(36)}`,
    name,
    job: botJobInput.value.trim() || JOB[look],
    look,
    own: true,
  }
  ownBots.unshift(made)
  ownBots.splice(12)
  writeStore(OWN_BOTS_KEY, ownBots)
  pickBot(made)
})
document.addEventListener('pointerdown', e => {
  if (popover && !popover.pop.contains(e.target) && !popover.trigger.contains(e.target))
    closePopover()
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && popover) closePopover(true)
})
let popWidth = innerWidth
window.addEventListener('resize', () => {
  if (innerWidth !== popWidth) {
    closePopover()
    setSide(false)
  }
  popWidth = innerWidth
})

document.querySelectorAll('#exprs button').forEach(b =>
  b.addEventListener('click', e => {
    e.stopPropagation()
    const m = b.dataset.e
    lastActive = time
    express(m, m === 'sleepy' ? 3500 : 1800)
    if (m === 'dizzy') momo.wobble = 1
    if (m === 'happy' || m === 'wink') {
      momo.squashV -= 1.4
      momo.liftV += 2
    }
    if (m === 'surprised') momo.liftV += 2.2
  }),
)
const sw = $('#swatches')
for (const name of ['persimmon', 'honey', 'cornflower', 'matcha', 'wisteria', 'rose']) {
  const b = document.createElement('button')
  b.type = 'button'
  b.style.background = PALETTES[name][1]
  b.title = name[0].toUpperCase() + name.slice(1)
  b.setAttribute('aria-label', b.title)
  b.dataset.palette = name
  b.addEventListener('click', () => {
    colourChoice[momo.look] = name
    if (momo.dead < 0.5) momo.colorTarget = rgb(name)
    renderSwatches()
    repaintAvatars()
    renderSide()
    renderOutfits()
    setAccent()
  })
  sw.appendChild(b)
}
function renderSwatches() {
  const current = palFor(momo.look)
  for (const b of document.querySelectorAll('#swatches button')) {
    const on = b.dataset.palette === current
    b.classList.toggle('on', on)
    b.setAttribute('aria-pressed', on)
  }
}
renderSwatches()

const HERO_CSS = 170
let hero = $('#hero')
if (!useRay) {
  R.canvas.id = 'hero'
  R.canvas.setAttribute('aria-hidden', 'true')
  hero.replaceWith(R.canvas)
  hero = R.canvas
}
hero.style.width = hero.style.height = HERO_CSS + 'px'
hero.style.transformOrigin = '0 0'
R.preload?.()
let heroPx = 0,
  perfAt = 0
const debug = new URLSearchParams(location.search).has('debug')
$('#perf').hidden = !debug
const rect = { x: 0, y: 0, w: 0 }
let last = performance.now(),
  time = 0,
  frameMs = 16.7,
  rafId = 0,
  slowFor = 0,
  repaintT = 0
const qParam = new URLSearchParams(location.search).get('q')
const SLOWMO = Math.max(1, +new URLSearchParams(location.search).get('slowmo') || 1)
let quality = qParam ? Math.max(0.3, Math.min(1, +qParam)) : 1
function targetRect() {
  const slot = thread.classList.contains('started') ? $('#slotPerch') : $('#slotBig')
  const r = slot.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width }
}
const spring = (x, v, target, k, c, dt) => {
  if (!Number.isFinite(x) || !Number.isFinite(v)) return [target, 0]
  const n = Math.max(1, Math.ceil(dt / 0.004)),
    h = dt / n
  for (let i = 0; i < n; i++) {
    v += ((target - x) * k - v * c) * h
    x += v * h
  }
  return [x, v]
}
const noise = t =>
  Math.sin(t) * 0.5 + Math.sin(t * 2.31 + 1.3) * 0.3 + Math.sin(t * 4.07 + 2.1) * 0.2
function focusTarget() {
  if (momo.focus === 'think') return [-0.045, 0.055]
  if (momo.focus instanceof Element) {
    const f = momo.focus.getBoundingClientRect(),
      h = hero.getBoundingClientRect()
    const dx = f.left + f.width / 2 - (h.left + h.width / 2),
      dy = f.top + f.height / 2 - (h.top + h.height / 2)
    const len = Math.hypot(dx, dy) || 1
    return [(dx / len) * 0.05, (-dy / len) * 0.045]
  }
  if (typingT > 0) return [0.035, -0.05]
  return null
}

const actor = { peekIn: 3, peek: 0, lids: [0, 0], acted: 'rest', since: 0 }
function acting(look, t, dt) {
  if (look !== actor.acted) {
    actor.acted = look
    actor.since = 0
  }
  actor.since += dt
  const out = { eye: null, roll: 0, squash: 0, lids: [0, 0], peek: false }
  if (reduce || momo.spin || busyFocus()) return out
  const u = actor.since
  if (look === 'cook') {
    out.roll = Math.sin(u * 2 * Math.PI * 0.55) * 0.04
    out.squash = Math.max(0, Math.sin(u * 2 * Math.PI * 1.1)) * 0.1
  } else if (look === 'investigate') {
    const scan = Math.sin(u * 0.85)
    out.eye = [scan * 0.055, -0.012 + Math.max(0, Math.sin(u * 0.43)) * 0.02]
    out.roll = 0.035 + scan * 0.02
    out.squash = 0.12
  } else if (look === 'write') {
    const cycle = u % 5.2
    if (cycle < 1.8) {
      out.eye = [0.045, 0.045]
      out.roll = 0.05
    } else {
      out.eye = [-0.012, -0.04]
      out.squash = Math.max(0, Math.sin(u * 2 * Math.PI * 2.4)) * 0.09
      out.roll = -0.02
    }
  } else if (look === 'music') {
    out.squash = Math.sin(u * 2 * Math.PI * 1.55) * 0.13
    out.roll = Math.sin(u * 2 * Math.PI * 0.78) * 0.03
  } else if (look === 'garden') {
    out.roll = Math.sin(u * 1.1) * 0.03
  } else if (look === 'builder') {
    out.eye = [Math.sin(u * 0.6) * 0.03, -0.01]
  } else if (look === 'tutor') {
    out.eye = [0.01, 0.0]
  } else if (look === 'designer') {
    const judge = Math.sin(u * 0.7)
    out.roll = -0.04 + judge * 0.035
    out.eye = [0.03 + judge * 0.02, 0.02]
  } else if (look === 'director') {
    const beat = u % 4.4
    out.eye = [0, 0]
    out.squash = beat < 0.35 ? Math.sin((beat / 0.35) * Math.PI) * 0.22 : 0
  } else if (look === 'coach') {
    out.squash = Math.abs(Math.sin(u * 2 * Math.PI * 1.1)) * 0.16 - 0.04
    out.roll = Math.sin(u * 2 * Math.PI * 0.55) * 0.025
  } else if (look === 'traveller') {
    const side = Math.sin(u * 0.4) > 0 ? 1 : -1
    out.eye = [0.05 * side, 0.03]
    out.roll = 0.02 * side
  } else if (look === 'money') {
    out.eye = [Math.sin(u * 2.2) * 0.02, -0.035]
    out.squash = Math.max(0, Math.sin(u * 2 * Math.PI * 1.6)) * 0.07
  } else if (look === 'planner') {
    const nod = u % 3.6
    out.eye = [0.03, 0.005]
    out.roll = 0.05
    out.squash = nod < 0.5 ? Math.sin((nod / 0.5) * Math.PI) * 0.1 : 0
  } else if (look === 'captain') {
    const sway = Math.sin(u * 0.9)
    out.roll = sway * 0.035
    out.eye = [0.02 + sway * 0.02, 0.02]
  } else if (look === 'tester') {
    const cycle = u % 3.2,
      beat = cycle % 1.6
    out.eye = [cycle < 1.6 ? -0.03 : 0.03, -0.012]
    out.squash = beat < 0.22 ? Math.sin((beat / 0.22) * Math.PI) * 0.08 : 0
  } else if (look === 'guard') {
    out.eye = [0, 0.01]
    out.roll = Math.sin(u * 1.3) * 0.02
  } else if (look === 'bug') {
    const scan = Math.sin(u * 0.75)
    out.eye = [scan * 0.05, -0.03]
    out.roll = scan * 0.025
  } else if (look === 'dead') {
    actor.peekIn -= dt
    if (actor.peekIn < 0) {
      actor.peek = 0.55
      actor.peekIn = 3 + Math.random() * 2.5
    }
    actor.peek = Math.max(0, actor.peek - dt)
    out.peek = actor.peek > 0 && momo.dead > 0.9
  }
  return out
}
const busyFocus = () => momo.focus != null || typingT > 0

function frame(now) {
  rafId = 0
  const realDt = Math.min(0.05, (now - last) / 1000),
    dt = realDt / SLOWMO
  last = now
  time += dt
  frameMs = frameMs * 0.94 + realDt * 1000 * 0.06
  if (frameMs > 26) slowFor += dt
  else slowFor = Math.max(0, slowFor - dt)
  if (!qParam && slowFor > 1.5 && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.2)
    slowFor = 0
  }
  if (R.info.lost) {
    $('#perf').textContent = 'The GPU reset, so the 3D view is paused. Reload to try again.'
    return
  }
  pumpAvatars(frameMs > 20 ? 3 : 8)
  const d = effectiveDpr()
  if (Math.abs(d - DPR) > 0.01) {
    DPR = d
    clearTimeout(repaintT)
    repaintT = setTimeout(repaintAvatars, 180)
  }

  const T = targetRect()
  if (!rect.w) Object.assign(rect, T)
  const a = 1 - Math.exp(-dt * 9)
  rect.x += (T.x - rect.x) * a
  rect.y += (T.y - rect.y) * a
  rect.w += (T.w - rect.w) * a
  hero.style.transform = `translate(${rect.x}px, ${rect.y}px) scale(${rect.w / HERO_CSS})`

  const M = MOODS[momo.mood]
  const ms = 1 - Math.exp(-dt * 7)
  for (let i = 0; i < 4; i++) momo.brows[i] += (M.brows[i] - momo.brows[i]) * ms
  for (let i = 0; i < 2; i++) momo.eyeScale[i] += (M.eye[i] - momo.eyeScale[i]) * ms

  typingT = Math.max(0, typingT - dt)
  const act = acting(momo.dead > 0.35 ? 'dead' : momo.look, time, dt)
  const forced = focusTarget() || act.eye
  if (forced) momo.eyeTarget = forced
  else if (!reduce) {
    momo.nextSaccade -= dt
    if (momo.nextSaccade < 0) {
      const r = Math.random()
      momo.eyeTarget =
        r < 0.5
          ? [(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.014]
          : r < 0.85
            ? [(Math.random() - 0.5) * 0.09, (Math.random() - 0.35) * 0.04]
            : [0.04, 0.03]
      momo.nextSaccade = 0.8 + Math.random() * 2.6
      if (Math.random() < 0.22) blinkNow()
    }
  } else momo.eyeTarget = [0, 0]
  const drift = reduce ? [0, 0] : [noise(time * 3.1) * 0.0025, noise(time * 2.7 + 7) * 0.002]
  for (let i = 0; i < 2; i++)
    [momo.eye[i], momo.eyeV[i]] = spring(
      momo.eye[i],
      momo.eyeV[i],
      momo.eyeTarget[i] + drift[i],
      700,
      46,
      dt,
    )

  if (!reduce) {
    momo.nextBlink -= dt
    if (face.k > 0.01 || face.close > 0.01 || face.wake >= 0 || face.sleep > 0 || face.shown === 9)
      momo.nextBlink = Math.max(momo.nextBlink, 0.6)
    if (momo.nextBlink < 0) {
      blinkNow(Math.random() < 0.18)
      momo.nextBlink = 2.4 + Math.random() * 3.6
    }
  }
  if (momo.blinkT >= 0) {
    momo.blinkT += dt
    const t = momo.blinkT
    momo.blink =
      t < 0.07 ? (t / 0.07) ** 2 : t < 0.1 ? 1 : t < 0.24 ? 1 - ((t - 0.1) / 0.14) ** 0.7 : 0
    if (t >= 0.24) {
      momo.blink = 0
      momo.blinkT = -1
      if (momo.blinkDouble) {
        momo.blinkDouble = false
        setTimeout(() => blinkNow(), 90)
      }
    }
  }

  ;[momo.squash, momo.squashV] = spring(momo.squash, momo.squashV, 0, 170, 11, dt)
  ;[momo.dead, momo.deadV] = spring(momo.dead, momo.deadV, momo.deadTarget, 70, 9, dt)
  ;[momo.lift, momo.liftV] = spring(momo.lift, momo.liftV, 0, 120, 12, dt)
  momo.dead = Math.max(0, Math.min(1.08, momo.dead))
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++)
      momo.colors[i][j] += (momo.colorTarget[i][j] - momo.colors[i][j]) * (1 - Math.exp(-dt * 5))

  let spinYaw = 0,
    spinVel = 0
  if (momo.spin) {
    const s = momo.spin
    s.t += dt / s.dur
    const p = Math.min(1, s.t)
    spinYaw = p < 1 ? easeSpin(p) * Math.PI * 2 : 0
    spinVel = p < 1 ? (spinRate(p) * Math.PI * 2) / s.dur : 0
    if (!s.swapped && p >= 0.5) {
      s.swapped = true
      const from = momo.colors
      swapLook(s.next)
      if (s.next === 'bug') {
        momo.colors = from
        momo.liftV += 2.2
        s.reveal = 0
      }
    }
    if (s.reveal != null) s.reveal += dt
    if (p >= 1 && !s.landed) {
      s.landed = true
      momo.squashV -= 2.4
      if (s.reveal != null) {
        express('surprised', 700)
        momo.antSplayV += 4
        for (let i = 0; i < 6; i++) momo.legsV[i] += 2.5
      }
    }
    const revealing = s.reveal != null && s.reveal < REVEAL_S
    if (p >= 1 && !revealing) {
      momo.spin = null
      s.resolvers.forEach(f => f())
      const q = s.queued
      if (q && q.look !== momo.look) {
        momo.squashV -= 2.2
        momo.spin = {
          t: 0,
          dur: s.dur,
          next: q.look,
          swapped: false,
          resolvers: q.resolvers,
          queued: null,
        }
      } else if (q) q.resolvers.forEach(f => f())
    }
  }
  const idleYaw = reduce ? 0 : noise(time * 0.35) * 0.05 + momo.eye[0] * 0.9
  const prevYaw = momo.yaw
  ;[momo.yaw, momo.yawV] = spring(momo.yaw, momo.yawV, idleYaw, 60, 14, dt)
  momo.browOn =
    (momo.browOn ?? 0) +
    ((momo.mood === 'neutral' ? 0 : 1) - (momo.browOn ?? 0)) * (1 - Math.exp(-dt * 6))
  momo.wobble = Math.max(0, momo.wobble - dt * 1.2)
  momo.wiggle = Math.max(0, momo.wiggle - dt * 1.6)
  if (!busy && !offline && !expr.mode && time - lastActive > 25) express('sleepy', 0, true)
  const exprOn = expr.mode && (expr.hold || time < expr.until)
  if (!exprOn) expr.mode = null
  const sleepy = expr.mode === 'sleepy'
  faceStep(exprOn ? EXPR[expr.mode] : momo.dead > 0.35 ? 4 : FACE[momo.look], dt)
  const FL = faceLook()
  momo.sleepW =
    (momo.sleepW ?? 0) +
    ((face.shown === 9 ? 1 : face.sleep) - (momo.sleepW ?? 0)) * (1 - Math.exp(-dt * 1.6))
  ;[momo.exprSq, momo.exprSqV] = spring(
    momo.exprSq ?? 0,
    momo.exprSqV ?? 0,
    expr.mode === 'surprised' ? -0.55 : 0,
    320,
    20,
    dt,
  )
  const rollTarget =
    (reduce ? 0 : noise(time * 0.27 + 3) * 0.018) +
    (M.roll + act.roll) * (1 - Math.min(1, momo.dead)) +
    (expr.mode === 'wink' ? 0.09 : 0) +
    momo.wobble * Math.sin(time * 11) * 0.14 +
    momo.wiggle * Math.sin(time * 22) * 0.06 +
    momo.topple * Math.min(1, momo.dead) * 0.2 +
    (sleepy ? 0.06 : 0)
  for (let i = 0; i < 2; i++)
    actor.lids[i] += (act.lids[i] - actor.lids[i]) * (1 - Math.exp(-dt * 8))
  ;[momo.roll, momo.rollV] = spring(momo.roll, momo.rollV, rollTarget, 50, 11, dt)
  const yawVel = (momo.yaw - prevYaw) / Math.max(dt, 1e-3)
  ;[momo.hatTilt, momo.hatV] = spring(
    momo.hatTilt,
    momo.hatV,
    -momo.roll * 0.6 - momo.squashV * 0.012 + yawVel * 0.02,
    90,
    7,
    dt,
  )

  const dead = momo.dead > 0.35
  momo.idea = Math.max(0, momo.idea - dt)
  momo.tipKick = Math.max(0, momo.tipKick - dt)
  momo.peekHold = Math.max(0, momo.peekHold - dt)
  const sig = SIGNATURE[momo.look] || {}
  const base = sig.tip || [0, 0, 1]
  let tt = base.slice()
  if (momo.deadTarget > 0.5 && momo.tipKick <= 0) tt = [1.2, 0.25, 0.86]
  else if (momo.spin) tt = base.slice()
  else if (expr.mode === 'surprised')
    tt = [-0.25 + Math.sin(time * 42) * 0.03, 0, Math.max(base[2], 1.1)]
  else if (momo.idea > 0) tt = [-0.25, 0, Math.max(base[2], 1.06)]
  else if (sleepy) tt = [base[0] + 0.32, 0.14, base[2] * 0.95]
  else if (momo.mood === 'listening') tt = [base[0] + 0.14, 0.06, base[2]]
  else if (momo.mood === 'thinking') tt = [base[0] - 0.16, 0.18, base[2] * 0.97]
  else if (momo.mood === 'unsure') tt = [base[0] - 0.2, 0, base[2]]
  if (sig.tip) tt[2] = Math.min(tt[2], base[2])
  const folding = momo.deadTarget > 0.5
  const tipW = folding ? 4.2 : 7.5
  for (let i = 0; i < 3; i++)
    [momo.tip[i], momo.tipV[i]] = spring(
      momo.tip[i],
      momo.tipV[i],
      tt[i],
      tipW * tipW,
      2 * tipW,
      dt,
    )
  ;[momo.fall, momo.fallV] = spring(
    momo.fall,
    momo.fallV,
    momo.fallTarget,
    momo.fallTarget ? 55 : 140,
    momo.fallTarget ? 8 : 16,
    dt,
  )
  momo.fall = Math.max(0, Math.min(1, momo.fall))
  if (momo.look === 'tutor' && !dead && !reduce) {
    momo.glassT += dt
    momo.glassY = Math.min(0.05, momo.glassT * 0.007)
    if (momo.glassT > 8) {
      momo.glassT = 0
      momo.squashV -= 2.2
      blinkNow()
    }
  } else {
    momo.glassY += (0 - momo.glassY) * (1 - Math.exp(-dt * 8))
    momo.glassT = 0
  }
  const leafTarget = momo.deadTarget > 0.5 ? -0.6 : busy ? 1 : (sig.leaf ?? 0.5)
  momo.leaf += (leafTarget - momo.leaf) * (1 - Math.exp(-dt * 4))
  const ideaWiden = 1
  momo.glow +=
    ((momo.idea > 0 || expr.mode === 'sparkle' ? 1 : 0) - momo.glow) *
    (1 - Math.exp(-dt * (momo.idea > 0 ? 10 : 2.5)))
  const breathe =
    reduce || momo.dead > 0.3
      ? 0
      : Math.sin((time * 2 * Math.PI) / 5.2) * 0.3 * momo.sleepW +
        Math.sin((time * 2 * Math.PI) / 3.8) * 0.16 * (1 - momo.sleepW) +
        (talk.on && time - talk.word > 0.5
          ? Math.max(0, Math.sin(time * 2 * Math.PI * 2.6)) * 0.08
          : 0)
  if (dead && !reduce && Math.random() < dt * 0.25) momo.tipV[0] += 1.4
  const reveal = momo.spin?.reveal
  const bugGrow = reveal == null ? 1 : clamp01((reveal - 0.08) / 0.8)
  const antGrow = reveal == null ? 1 : backOut(clamp01((reveal - 0.3) / 0.34))
  const bodySquash = momo.squash + breathe + act.squash + momo.exprSq
  ;[momo.antSplay, momo.antSplayV] = spring(
    momo.antSplay,
    momo.antSplayV,
    Math.min(0.32, spinVel * 0.02) + Math.min(1, momo.dead) * 0.6 + bodySquash * 0.25,
    220,
    4.5,
    dt,
  )
  ;[momo.antSway, momo.antSwayV] = spring(momo.antSway, momo.antSwayV, momo.rollV * 0.25, 90, 6, dt)
  for (let i = 0; i < 2; i++)
    [momo.antTwitch[i], momo.antTwitchV[i]] = spring(
      momo.antTwitch[i],
      momo.antTwitchV[i],
      0,
      260,
      8,
      dt,
    )
  if (momo.look === 'bug' && !reduce && !momo.spin && !dead && Math.random() < dt * 0.4) {
    const side = Math.random() < 0.5 ? 0 : 1
    momo.antTwitchV[side] += 4.5
    if (Math.random() < 0.3) momo.antTwitchV[1 - side] += 3.5
  }
  for (let i = 0; i < 6; i++) {
    const curl = dead ? 0.7 + Math.sin(time * 6 + i * 1.7) * 0.06 : 0
    ;[momo.legs[i], momo.legsV[i]] = spring(momo.legs[i], momo.legsV[i], curl, 320, 16, dt)
  }
  if (momo.look === 'bug' && !reduce && !momo.spin && !dead && Math.random() < dt * 0.5)
    momo.legsV[Math.floor(Math.random() * 6)] += 7
  const need = Math.max(T.w, rect.w) * DPR * quality
  if (!heroPx || heroPx < need * 0.98 || heroPx > need * 1.6)
    heroPx = Math.max(48, Math.min(1000, Math.round(need)))
  const px = heroPx
  if (useRay && hero.width !== px) {
    hero.width = px
    hero.height = px
  }
  if (!side.inert && phone.matches) {
    if (document.visibilityState === 'visible') rafId = requestAnimationFrame(frame)
    return
  }
  R.draw(useRay ? hero : null, px, {
    outfit: OUTFITS[momo.look],
    face: face.shown,
    smile: FL.smile,
    sleepy: FL.sleepy,
    wink: FL.wink,
    tip: momo.tip,
    fall: momo.fall,
    glow: momo.glow,
    glassY: momo.glassY,
    leaf: momo.leaf,
    colors: momo.colors,
    yaw: spinYaw + momo.yaw,
    roll: momo.roll,
    squash: bodySquash,
    bug: bugGrow,
    legL: momo.legs.slice(0, 3),
    legR: momo.legs.slice(3),
    ant: [
      antGrow,
      momo.antSplay + momo.antSway + momo.antTwitch[0],
      -momo.antSplay + momo.antSway - momo.antTwitch[1],
    ],
    dead: Math.min(1, momo.dead),
    blink: Math.max(dead ? 0 : momo.blink, face.close),
    look: dead ? [0, 0] : [momo.eye[0], momo.eye[1] + FL.lift],
    lift: momo.lift * 0.06,
    lids: [Math.max(actor.lids[0], FL.lids[0]), Math.max(actor.lids[1], FL.lids[1])],
    peek: act.peek || momo.peekHold > 0,
    brows: momo.brows.map((b, i) => b + FL.brows[i]),
    eyeScale: [
      momo.eyeScale[0] * ideaWiden * (sig.eyeScale ? sig.eyeScale[0] : 1) * FL.scale[0],
      momo.eyeScale[1] * ideaWiden * (sig.eyeScale ? sig.eyeScale[1] : 1) * FL.scale[1],
    ],
    hatTilt: momo.hatTilt,
    browOn: momo.browOn,
    restMouth: true,
    darkFloor: isDark() ? 1 : 0,
    small: 0,
    fuzz: 1,
    time,
  })
  if (debug && now - perfAt > 500) {
    perfAt = now
    $('#perf').textContent = `${R.info.gpu
      .replace(/^ANGLE \(|\)$/g, '')
      .split(',')
      .slice(0, 2)
      .join(
        ',',
      )}. Shader ready in ${R.info.compileMs} ms. Hero ${px} px, ${(1000 / frameMs).toFixed(0)} fps${quality < 1 ? `, quality ${Math.round(quality * 100)}%` : ''}. ${avatarCount} avatars in ${Math.round(avatarMs)} ms.${useRay ? ' Raymarched.' : R.info.renderer === 'canvas' ? ' Canvas 2D.' : R.info.cpuTier ? ' Light mesh.' : ' Mesh.'}`
  }
  if (document.visibilityState === 'visible') rafId = requestAnimationFrame(frame)
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !rafId) {
    last = performance.now()
    rafId = requestAnimationFrame(frame)
  }
})
window.visualViewport?.addEventListener('resize', () => {
  const d = effectiveDpr()
  if (Math.abs(d - DPR) > 0.01) {
    DPR = d
    repaintAvatars()
  }
})
window.addEventListener('resize', () => {
  clearTimeout(repaintT)
  repaintT = setTimeout(repaintAvatars, 180)
  autoGrow()
})

if (bot.look !== momo.look) swapLook(bot.look)
showBot()
renderSide()
renderOutfits()
repaintAvatars()
applyTheme(isDark() ? 'dark' : 'light')
autoGrow()
syncComposer()
initBrain()
rafId = requestAnimationFrame(frame)
window.__momo = { send, openExample, EXAMPLES, state: momo, colourChoice, localDecide }
