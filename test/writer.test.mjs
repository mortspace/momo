import http from 'node:http'
import { launch, collectErrors } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const JEV_KEY = 'test-jev-key-0003',
  GEM_KEY = 'test-gemini-key-0004'
const jevBodies = [],
  gem = []
let jev = { look: 'tutor', mood: 'curious', route: 'answer', routeConf: 0.95, length: 'short' }
let mode = 'ok'

const jevMock = http.createServer(async (req, res) => {
  let raw = ''
  for await (const c of req) raw += c
  jevBodies.push(JSON.parse(raw))
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      model: 'mock',
      usage: { input_tokens: 180, output_tokens: 30 },
      answers: {
        look: { type: 'choice', choice: jev.look, confidence: 0.97 },
        mood: { type: 'choice', choice: jev.mood, confidence: 0.8 },
        route: { type: 'choice', choice: jev.route, confidence: jev.routeConf },
        length: { type: 'choice', choice: jev.length, confidence: 0.9 },
      },
    }),
  )
})
const sse = o => `data: ${JSON.stringify(o)}\r\n\r\n`
const part = (text, extra = {}) => ({
  candidates: [{ content: { parts: [{ text }], role: 'model' }, ...extra }],
})
const gemMock = http.createServer(async (req, res) => {
  let raw = ''
  for await (const c of req) raw += c
  const call = {
    url: req.url,
    key: req.headers['x-goog-api-key'],
    body: JSON.parse(raw),
    closedEarly: false,
  }
  gem.push(call)
  if (mode === '429') {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: {
          code: 429,
          message: 'You exceeded your current quota',
          status: 'RESOURCE_EXHAUSTED',
        },
      }),
    )
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/event-stream' })
  res.on('close', () => {
    if (!res.writableFinished) call.closedEarly = true
  })
  if (mode === 'slow') {
    res.write(sse(part('DNS turns names into numbers. ')))
    await new Promise(r => setTimeout(r, 6000))
    if (!res.destroyed) res.end(sse(part('Late words.', { finishReason: 'STOP' })))
    return
  }
  if (mode === 'max') {
    res.end(sse(part('This answer runs long and', { finishReason: 'MAX_TOKENS' })))
    return
  }
  const first = Buffer.from(sse(part('**VPN** means virtual private network. Café ')))
  const cut = first.indexOf(Buffer.from('é')) + 1
  res.write(first.subarray(0, cut))
  await new Promise(r => setTimeout(r, 60))
  res.write(first.subarray(cut))
  await new Promise(r => setTimeout(r, 60))
  res.write(sse(part('Wi-Fi is safer.\n* It encrypts')))
  await new Promise(r => setTimeout(r, 60))
  res.end(
    sse({
      ...part(' traffic.', { finishReason: 'STOP' }),
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20 },
    }),
  )
})
await new Promise(r => jevMock.listen(5394, '127.0.0.1', r))
await new Promise(r => gemMock.listen(5395, '127.0.0.1', r))

const env = isolatedEnv({
  JEV_URL: 'http://127.0.0.1:5394/v1/systemone',
  GEMINI_URL: 'http://127.0.0.1:5395/v1beta',
  GEMINI_API_KEY: GEM_KEY,
})
const server = await startServer('dev', 5396, env)
const { check, finish } = report()
try {
  const healthText = await (await fetch(`${server.url}/api/health`)).text()
  check(
    'health names the writer, never the key',
    JSON.parse(healthText).writer === 'Gemini 3.5 Flash-Lite' && !healthText.includes(GEM_KEY),
    healthText,
  )

  const browser = await launch({ gpu: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = collectErrors(page, { ignore: /Failed to load resource/ })
  const settle = (min = 600) =>
    page
      .waitForTimeout(min)
      .then(() =>
        page.waitForFunction(
          () =>
            !document.querySelector('#thread.busy') &&
            !document.querySelector('#messages .card.loading'),
          null,
          { timeout: 25000 },
        ),
      )
  await page.goto(`${server.url}/index.html`)
  await page.waitForTimeout(1500)
  await page.fill('#keyInput', JEV_KEY)
  await page.click('#keyForm .keybtn')
  await page.waitForTimeout(800)
  check(
    'writer status shows Gemini',
    (await page.textContent('#writerStatus')) === 'Replies written by Gemini 3.5 Flash-Lite',
    await page.textContent('#writerStatus'),
  )
  const botText = () =>
    page.evaluate(() => [...document.querySelectorAll('.msg.bot .body')].pop()?.textContent)
  const sysText = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('.msg-list .sys, #messages .sys')].pop()?.textContent || '',
    )
  const ask = async (text, wait = 5000) => {
    await page.fill('#input', text)
    await page.press('#input', 'Enter')
    await settle(Math.min(wait, 1500))
  }

  const jevBefore = jevBodies.length
  await ask('what is a vpn')
  const jb = jevBodies.at(-1)
  check(
    'Jev state is only the new message',
    jb?.state === 'New message: "what is a vpn"',
    jb?.state,
  )
  check(
    'Jev is not sent the written-answer list',
    jb && !jb.questions.answer && !!jb.questions.route && !!jb.questions.length,
    jb && Object.keys(jb.questions),
  )
  check(
    'Jev request is small with 14 outfits',
    JSON.stringify(jb).length < 2600,
    JSON.stringify(jb).length,
  )
  const g = gem.at(-1)
  check('Gemini key sent in the header only', g?.key === GEM_KEY && !g.url.includes('key='), g?.url)
  check(
    'streaming endpoint used',
    /\/models\/gemini-3\.5-flash-lite:streamGenerateContent\?alt=sse$/.test(g?.url || ''),
    g?.url,
  )
  check(
    'thinking set to minimal, generous ceiling',
    g?.body.generationConfig.thinkingConfig.thinkingLevel === 'minimal' &&
      g.body.generationConfig.maxOutputTokens === 1024,
    g?.body.generationConfig,
  )
  check(
    'Jev length becomes the style',
    /one or two sentences/.test(g?.body.systemInstruction.parts[0].text || ''),
    g?.body.systemInstruction,
  )
  check(
    'streamed reply is clean plain text',
    (await botText()) ===
      'VPN means virtual private network. Café Wi-Fi is safer.\n• It encrypts traffic.',
    await botText(),
  )
  check(
    'Momo wears the Jev outfit',
    (await page.evaluate(
      () =>
        document.querySelector('.msg.bot:last-child .role, .msg.bot .role') &&
        [...document.querySelectorAll('.msg.bot .role')].pop().textContent,
    )) === 'Tutor',
  )
  const last = await page.textContent('#brainLast')
  check(
    'Brain shows tokens and the writer',
    /\(Jev, 97% sure, \d+ ms, 180 tokens\)\nReply: Gemini 3\.5 Flash-Lite, short$/.test(last),
    last,
  )

  jev = { look: 'cook', mood: 'happy', route: 'answer', routeConf: 0.9, length: 'steps' }
  await ask('and for dessert?')
  const jb2 = jevBodies.at(-1)
  check(
    'follow-up sends the previous user message, not Momo’s reply',
    jb2?.state ===
      'New message: "and for dessert?"\nPrevious message from the same user: "what is a vpn"',
    jb2?.state,
  )
  check(
    'Gemini gets the conversation',
    gem
      .at(-1)
      ?.body.contents.map(c => c.role)
      .join(',') === 'user,model,user',
    gem.at(-1)?.body.contents.map(c => c.role),
  )

  const users = () => page.evaluate(() => document.querySelectorAll('.msg.user').length)
  const usersBefore = await users(),
    gemBefore = gem.length
  await page.click('.msg.bot.latest .act[data-action="retry"]')
  await page.waitForTimeout(5000)
  const re = gem.at(-1)?.body.contents || []
  check(
    'retry asks again without the old reply or a second bubble',
    gem.length === gemBefore + 1 &&
      re.map(c => c.role).join(',') === 'user,model,user' &&
      /dessert/.test(JSON.stringify(re.at(-1))) &&
      (await users()) === usersBefore &&
      !!(await page.$('.msg.bot.latest')),
    [gem.length - gemBefore, re.map(c => c.role), await users(), usersBefore],
  )

  const counts = () => [jevBodies.length, gem.length]
  let before = counts()
  await ask('hi there', 3500)
  check(
    'short greeting: no Jev or Gemini call',
    JSON.stringify(counts()) === JSON.stringify(before),
    [before, counts()],
  )
  before = counts()
  await ask('what is 12 x 7', 3500)
  check(
    'sum worked out on the device, no calls',
    (await botText()) === '12 × 7 = 84' && JSON.stringify(counts()) === JSON.stringify(before),
    [await botText(), before, counts()],
  )

  jev = { look: 'rest', mood: 'happy', route: 'chat', routeConf: 0.93, length: 'short' }
  before = counts()
  await ask('that is so cool', 3500)
  check(
    'confident small talk skips Gemini',
    gem.length === before[1] &&
      jevBodies.length === before[0] + 1 &&
      /^Happy to help/.test(await botText()),
    [await botText(), before, counts()],
  )
  jev = { look: 'rest', mood: 'curious', route: 'chat', routeConf: 0.55, length: 'short' }
  await ask('who wrote hamlet', 5000)
  check('unsure small talk still goes to Gemini', gem.length === before[1] + 1, counts())

  mode = 'max'
  jev = { look: 'write', mood: 'focused', route: 'answer', routeConf: 0.9, length: 'long' }
  await ask('write me a long story', 5000)
  check(
    'cut-off reply is marked',
    (await botText()) === 'This answer runs long and…',
    await botText(),
  )

  mode = '429'
  jev = { look: 'tutor', mood: 'curious', route: 'answer', routeConf: 0.9, length: 'short' }
  await ask('what is a vpn exactly', 5000)
  check(
    'free limit reached: honest note',
    /free limit is used up for now/.test(await sysText()),
    await sysText(),
  )
  check(
    'free limit reached: falls back to the written answer',
    /^A VPN \(virtual private network\)/.test(await botText()),
    await botText(),
  )
  check(
    'writer status explains the limit',
    /free limit is used up/.test(await page.textContent('#writerStatus')),
    await page.textContent('#writerStatus'),
  )

  mode = 'slow'
  await page.fill('#input', 'explain dns again')
  await page.press('#input', 'Enter')
  await page.waitForFunction(
    () =>
      /DNS turns names/.test(
        [...document.querySelectorAll('.msg.bot .body')].pop()?.textContent || '',
      ),
    null,
    { timeout: 15000 },
  )
  const stopped = gem.at(-1)
  const stopLabel = await page.textContent('#send')
  await page.click('#send')
  await page.waitForTimeout(600)
  check(
    'Stop ends the reply and closes the request',
    stopLabel === 'Stop' &&
      stopped.closedEarly === true &&
      /…$/.test(await botText()) &&
      (await page.textContent('#send')) === 'Send',
    [stopLabel, stopped.closedEarly, await botText()],
  )

  await page.fill('#input', 'explain dns slowly')
  await page.press('#input', 'Enter')
  await page.waitForFunction(
    () =>
      /DNS turns names/.test(
        [...document.querySelectorAll('.msg.bot .body')].pop()?.textContent || '',
      ),
    null,
    { timeout: 15000 },
  )
  const slow = gem.at(-1)
  await page.click('#examples .row:has-text("Spinach skillet in 15 minutes")')
  await page.waitForTimeout(1200)
  check('switching chats closes the Gemini request', slow.closedEarly === true, slow.closedEarly)
  await page.waitForTimeout(5000)
  check(
    'Momo returns to working order',
    (await page.evaluate(() => window.__momo.state.look)) === 'cook',
    await page.evaluate(() => window.__momo.state.look),
  )
  check('no page errors', errors.length === 0, errors)
  await browser.close()

  const prod = await startServer('prod', 5397, env)
  mode = 'ok'
  const ph = await (await fetch(`${prod.url}/api/health`)).json()
  const pr = await fetch(`${prod.url}/api/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', text: 'what is a vpn' }],
      now: 'test',
      length: 'short',
    }),
  })
  check(
    'phone server streams Gemini replies',
    ph.writer === 'Gemini 3.5 Flash-Lite' && pr.ok && (await pr.text()).startsWith('VPN means'),
    ph,
  )
  prod.stop()
  check(
    'server never prints either key',
    !server.output().includes(JEV_KEY) && !server.output().includes(GEM_KEY),
    server.output(),
  )
} finally {
  server.stop()
  jevMock.close()
  gemMock.close()
}
finish()
