import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const GEMINI_URL = process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta'
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
export const GEMINI_NAME = 'Gemini 3.5 Flash-Lite'

const SYSTEM = `You are Momo, a small, friendly helper inside a chat app. Answer the user's latest message directly and correctly.

Write plain text for a chat bubble. No markdown: no asterisks, no bold, no headings, no tables. For a list, start each item on its own line with "1." or "•". Skip openers like "Great question".

If the message is too vague to act on, ask one short question about what they mean. If it needs live information you don't have, such as today's news, prices, weather or scores, say so plainly. Never invent facts.`
const STYLE = {
  short: 'Answer in one or two sentences.',
  steps: 'Answer with a short numbered list, or a short draft if they asked for writing.',
  long: 'Give a fuller answer: a few short paragraphs at most.',
}

export async function geminiKey(useFile) {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim()
  if (!useFile) return null
  try {
    return (
      (await readFile(join(homedir(), '.momo', 'gemini.env'), 'utf8')).match(
        /^GEMINI_API_KEY=(\S+)/m,
      )?.[1] || null
    )
  } catch {
    return null
  }
}

export function plainText() {
  let hold = '',
    lineStart = true
  const line = (seg, atStart) =>
    (atStart
      ? seg.replace(/^(\s*)#{1,6}\s+/, '$1').replace(/^(\s*)[*+-]\s+/, '$1• ')
      : seg
    ).replace(/\*\*|__/g, '')
  return (chunk, final = false) => {
    let s = hold + chunk
    hold = ''
    if (!final) {
      const tail = /[*_#]+$/.exec(s)
      if (tail) {
        hold = tail[0]
        s = s.slice(0, -hold.length)
      }
      const nl = s.lastIndexOf('\n')
      const last = s.slice(nl + 1)
      if ((nl >= 0 || lineStart) && /^\s*[#*+-]*\s*$/.test(last) && last.length) {
        hold = last + hold
        s = s.slice(0, nl + 1)
      }
    }
    if (!s) return ''
    const parts = s.split('\n')
    const out = parts.map((seg, i) => line(seg, i > 0 || lineStart)).join('\n')
    lineStart = s.endsWith('\n')
    return out
  }
}

const hits = new Map()
function limited(ip) {
  const now = Date.now(),
    recent = (hits.get(ip) || []).filter(t => now - t < 60000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > 12
}

function statusOf(code, message) {
  if (code === 400 && /api key/i.test(message)) return 401
  if (code === 401 || code === 403 || code === 429 || code === 400) return code
  return 502
}

async function readJson(req, limit = 60000) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > limit) throw Object.assign(new Error('too large'), { code: 413 })
  }
  return JSON.parse(raw)
}

export async function handleReply(req, res, key) {
  const fail = (status, error) => {
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ error }))
    }
  }
  if (!key) return fail(503, 'no writer')
  if (limited(req.socket.remoteAddress || '?'))
    return fail(429, 'Too many messages. Wait a minute and try again.')
  let input
  try {
    input = await readJson(req)
  } catch (e) {
    return fail(e.code === 413 ? 413 : 400, 'bad request')
  }
  const turns = (Array.isArray(input.messages) ? input.messages : [])
    .slice(-12)
    .map(m => ({
      role: m.role === 'momo' ? 'model' : 'user',
      text: String(m.text || '').slice(0, 2000),
    }))
    .filter(m => m.text.trim())
  while (turns.length && turns[0].role !== 'user') turns.shift()
  if (!turns.length || turns[turns.length - 1].role !== 'user')
    return fail(400, 'last message must be from the user')
  const now = String(input.now || '').slice(0, 120)
  const system = `${SYSTEM}\n\n${STYLE[input.length] || 'Keep it short: a few sentences unless the question needs more.'}\n\nThe user's local date and time: ${now || 'unknown'}.`
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: 'minimal' } },
  }

  const abort = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) abort.abort()
  })
  const t0 = Date.now()
  let first = 0,
    started = false,
    finish = null,
    blocked = null,
    usage = null
  const start = () => {
    if (!started) {
      started = true
      first = Date.now() - t0
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
    }
  }
  const clean = plainText()
  const emit = t => {
    if (t) {
      start()
      res.write(t)
    }
  }
  try {
    const r = await fetch(`${GEMINI_URL}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => null)
      const message = String(j?.error?.message || `status ${r.status}`).slice(0, 200)
      console.log(`[gemini] ${r.status} in ${Date.now() - t0} ms: ${message}`)
      return fail(statusOf(r.status, message), message)
    }
    const reader = r.body.getReader(),
      dec = new TextDecoder()
    let buf = ''
    const handle = data => {
      let j
      try {
        j = JSON.parse(data)
      } catch {
        return
      }
      const c = j.candidates?.[0]
      emit(
        clean(
          (c?.content?.parts || [])
            .filter(p => !p.thought)
            .map(p => p.text || '')
            .join(''),
        ),
      )
      if (c?.finishReason) finish = c.finishReason
      if (j.promptFeedback?.blockReason) blocked = j.promptFeedback.blockReason
      if (j.usageMetadata) usage = j.usageMetadata
    }
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const lineText = buf.slice(0, i).replace(/\r$/, '')
        buf = buf.slice(i + 1)
        if (lineText.startsWith('data:')) handle(lineText.slice(5).trim())
      }
    }
    buf += dec.decode()
    if (buf.startsWith('data:')) handle(buf.slice(5).trim())
    emit(clean('', true))
    if (!started) {
      const refused = blocked || /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/.test(finish || '')
      if (refused) res.setHeader('X-Momo-Stop', 'blocked')
      emit(
        refused
          ? 'I can’t help with that one.'
          : 'I came back empty on that one. Try asking again.',
      )
    } else if (finish === 'MAX_TOKENS') res.write('…')
    res.end()
    console.log(
      `[gemini] 200 in ${Date.now() - t0} ms (first words ${first} ms): ${usage?.promptTokenCount ?? '?'} in / ${usage?.candidatesTokenCount ?? '?'} out tokens${usage?.thoughtsTokenCount ? `, ${usage.thoughtsTokenCount} thinking` : ''}, ${finish || blocked || 'no finish reason'}`,
    )
  } catch (err) {
    if (abort.signal.aborted) {
      console.log(`[gemini] stopped by the page after ${Date.now() - t0} ms`)
      if (!res.writableEnded) res.end()
      return
    }
    const timeout = err?.name === 'TimeoutError'
    console.log(
      `[gemini] ${timeout ? 'timed out after 30 s' : `unreachable: ${err?.cause?.code || err?.message}`}`,
    )
    if (!started) return fail(504, timeout ? 'Gemini took too long' : 'Can’t reach Gemini')
    res.end()
  }
}
