import { ANSWERS, ANSWER_CRITERIA } from '../src/answers.js'

const JEV_URL = process.env.JEV_URL || 'https://api.typesafe.ai/v1/systemone'

export const LOOKS = {
  cook: 'Food and cooking: recipes, meals, ingredients, groceries',
  bug: 'Bugs in code or apps: errors, crashes',
  investigate:
    'Why something broke, not code bugs or curious why-questions: outages, failed payments, slow internet',
  write: 'Writing or editing text: posts, emails, messages, bios, copy',
  builder:
    'Making something new: code, apps, websites, landing pages, prototypes. Not for fixing bugs',
  music: 'Music: playlists, songs, artists, audio',
  tutor: 'Explaining how something works or what something means, including curious why-questions',
  garden: 'Plants and gardening: growing, watering, soil, pests',
  designer:
    'Visual design: Figma, UI and UX, layouts, colours, fonts, logos, images. Not for writing code',
  director: 'Video and audio: YouTube, reels, TikTok, podcasts, filming, editing, video scripts',
  coach: 'Health and fitness: workouts, running, sleep, diet, habits, stress',
  traveller: 'Travel: trips, flights, hotels, packing, itineraries, visas, getting around',
  money: 'Money and numbers: budgets, prices, saving, taxes, invoices, spreadsheets, data',
  planner:
    'Organising and booking: calendars, meetings, reminders, to-do lists, appointments, table bookings. Not for trips',
  captain: 'Shipping code: git, commits, pull requests, merging, releases, deploys',
  tester: 'Testing software: writing or running tests, test coverage, flaky tests, QA',
  guard:
    'Risky actions that need the user to say yes first: deleting files or data, overwriting, permissions, anything that cannot be undone',
  rest: 'Greetings, small talk, or anything that fits none of the others',
}
export const MOODS = {
  happy: 'Warm and glad to help',
  focused: 'Concentrating on a concrete task',
  curious: 'Interested and wants to know more',
  unsure: 'The message is vague or ambiguous',
  concerned: 'The user sounds stressed, or something important is broken',
}
export const ROUTES = {
  answer: 'A question or task that needs a written reply',
  chat: 'Only a greeting, thanks or small talk',
  unclear: 'Too vague to act on without asking what they mean',
}
export const LENGTHS = {
  short: 'One or two sentences',
  steps: 'A short list of steps, a recipe, or a short draft',
  long: 'A fuller explanation or a longer piece of writing',
}

function pick(answer, type) {
  if (!answer) return null
  const v = answer[type] ?? answer.value ?? answer.answer
  if (v != null) return v
  if (answer.probabilities)
    return Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return null
}
const confOf = (a, choice) => a?.confidence ?? a?.probabilities?.[choice] ?? null

export function parseDecision(json) {
  const a = json?.answers || {}
  const look = pick(a.look, 'choice')
  const mood = pick(a.mood, 'choice')
  const route = pick(a.route, 'choice')
  const length = pick(a.length, 'choice')
  const answer = pick(a.answer, 'choice')
  const vague = pick(a.vague, 'noul')
  const r = ROUTES[route] ? route : null
  return {
    look: LOOKS[look] ? look : 'rest',
    mood: MOODS[mood] ? mood : 'curious',
    route: r,
    routeConfidence: r ? confOf(a.route, r) : null,
    length: LENGTHS[length] ? length : null,
    vague: r
      ? r === 'unclear'
        ? 1
        : 0
      : typeof vague === 'number'
        ? vague
        : vague === true
          ? 1
          : 0,
    answer: ANSWERS[answer] ? answer : null,
    answerConfidence: ANSWERS[answer] ? confOf(a.answer, answer) : null,
    confidence: confOf(a.look, look),
    tokens: json?.usage?.input_tokens ?? null,
    model: json?.model || null,
  }
}

const PASS = new Set([401, 402, 403, 422, 429, 529])
function detailOf(json) {
  const v = json?.message ?? json?.error?.message ?? json?.detail ?? json?.error
  if (v == null) return null
  return (typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 200)
}

export const validKey = k => typeof k === 'string' && /^[\x21-\x7e]{8,200}$/.test(k)

export function buildRequest(text, prev, { withAnswers = false } = {}) {
  const state = `New message: "${text}"${prev ? `\nPrevious message from the same user: "${prev}"` : ''}`
  const questions = {
    look: { type: 'choice', instructions: 'Which outfit suits the new message?', criteria: LOOKS },
    mood: { type: 'choice', instructions: 'Which face should Momo make?', criteria: MOODS },
    route: {
      type: 'choice',
      instructions: 'What does the new message need from Momo?',
      criteria: ROUTES,
    },
    length: { type: 'choice', instructions: 'How long should Momo’s reply be?', criteria: LENGTHS },
  }
  if (withAnswers)
    questions.answer = {
      type: 'choice',
      instructions:
        'Momo can only reply with answers written ahead of time. Which prepared answer replies to exactly what the new message asks? Choose none unless one of these is clearly the same question, even if another topic is close.',
      criteria: ANSWER_CRITERIA,
    }
  return { model: 'jev-latest', state, questions }
}

export async function decide(text, prev, key, opts) {
  if (!validKey(key)) return { status: 503, body: { error: 'no key' } }
  const body = buildRequest(text, prev, opts)
  const t0 = Date.now()
  try {
    const r = await fetch(JEV_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const json = await r.json().catch(() => null)
    const ms = Date.now() - t0
    if (!r.ok) {
      const detail = detailOf(json)
      console.log(`[jev] ${r.status} in ${ms} ms${detail ? `: ${detail}` : ''}`)
      return {
        status: PASS.has(r.status) ? r.status : 502,
        body: { error: `jev ${r.status}`, detail },
      }
    }
    const d = parseDecision(json)
    const pct = v => (v != null ? ` ${Math.round(v * 100)}%` : '')
    console.log(
      `[jev] 200 in ${ms} ms: ${d.look}${pct(d.confidence)}, ${d.mood}, ${d.route || '?'}${pct(d.routeConfidence)}, ${d.length || '?'}${body.questions.answer ? `, answer ${d.answer || 'none'}${pct(d.answerConfidence)}` : ''}${d.tokens != null ? `, ${d.tokens} input tokens` : ''}`,
    )
    return { status: 200, body: { ...d, source: 'jev', ms } }
  } catch (e) {
    const timeout = e.name === 'TimeoutError'
    console.log(
      `[jev] ${timeout ? 'timed out after 15 s' : `unreachable: ${e.cause?.code || e.message}`}`,
    )
    return {
      status: 504,
      body: {
        error: timeout ? 'jev timeout' : 'jev unreachable',
        detail: timeout
          ? 'No answer within 15 seconds'
          : String(e.cause?.code || e.message).slice(0, 120),
      },
    }
  }
}

function previousUserText(input, text) {
  if (typeof input.prev === 'string') return input.prev.slice(0, 200)
  const users = (Array.isArray(input.history) ? input.history : [])
    .filter(h => h.role !== 'momo')
    .map(h => String(h.text || ''))
  if (users.length && users[users.length - 1] === text) users.pop()
  return (users.pop() || '').slice(0, 200)
}

export async function handleBrain(req, res, fallbackKey, opts) {
  const reply = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 20000) return reply(413, { error: 'too large' })
  }
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    return reply(400, { error: 'bad json' })
  }
  const text = String(input.text || '').slice(0, 1000)
  const headerKey = req.headers['x-jev-key']
  const key = validKey(headerKey) ? headerKey : fallbackKey
  const out = await decide(text, previousUserText(input, text), key, opts)
  return reply(out.status, out.body)
}
