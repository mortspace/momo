import http from 'node:http'
import { launch, collectErrors } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const GOOD = 'test-key-good-0001',
  BAD = 'test-key-bad-0002'
const seen = [],
  bodies = []
let reply = { look: 'music', answer: 'none', conf: 0.9 }
const mock = http.createServer(async (req, res) => {
  let raw = ''
  for await (const c of req) raw += c
  const auth = req.headers.authorization || ''
  seen.push(auth)
  try {
    bodies.push(JSON.parse(raw))
  } catch {}
  res.writeHead(auth === `Bearer ${GOOD}` ? 200 : 401, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify(
      auth === `Bearer ${GOOD}`
        ? {
            model: 'mock',
            answers: {
              look: { choice: reply.look, confidence: 0.9 },
              mood: { choice: 'happy' },
              vague: { noul: 0 },
              answer: { type: 'choice', choice: reply.answer, confidence: reply.conf },
            },
          }
        : { message: 'invalid key' },
    ),
  )
})
await new Promise(r => mock.listen(5390, '127.0.0.1', r))
const env = isolatedEnv({ JEV_URL: 'http://127.0.0.1:5390/v1/systemone' })
const server = await startServer('dev', 5391, env)
const { check, finish } = report()
try {
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
  const status = () => page.textContent('#brainStatus')
  check('starts on local rules', /local rules/.test(await status()), await status())

  await page.fill('#keyInput', GOOD)
  await page.click('#keyForm .keybtn')
  await page.waitForTimeout(800)
  check('good key accepted', (await status()) === 'Using Jev', await status())
  check(
    'key masked, not shown',
    (await page.textContent('#keyMask')) === '•••• 0001' &&
      (await page.inputValue('#keyInput')) === '',
    await page.textContent('#keyMask'),
  )
  check(
    'key saved in this browser',
    (await page.evaluate(() => localStorage.getItem('momo.jevKey'))) === GOOD,
  )

  await page.fill('#input', 'Can you help me with something?')
  await page.press('#input', 'Enter')
  await settle()
  const role = await page.evaluate(() => document.querySelector('.msg.bot .role')?.textContent)
  check(
    'Momo follows Jev (mock says Music, local rules would say Resting)',
    role === 'Music' && (await page.evaluate(() => window.__momo.state.look)) === 'music',
    role,
  )
  check('proxy forwarded the browser key to Jev', seen.includes(`Bearer ${GOOD}`), seen)
  const lastPick = await page.textContent('#brainLast')
  check(
    'Brain shows the Jev pick',
    /^Last pick: Music, happy \(Jev, 90% sure, \d+ ms\)\nReply: none written for this$/.test(
      lastPick,
    ),
    lastPick,
  )
  const q = bodies.at(-1)?.questions?.answer
  check(
    'Jev is asked to pick a written answer',
    q?.type === 'choice' &&
      !!q.criteria?.vpn &&
      !!q.criteria?.none &&
      Object.keys(q.criteria).length > 40,
    q && Object.keys(q.criteria || {}).length,
  )
  const botText = () =>
    page.evaluate(() => [...document.querySelectorAll('.msg.bot .body')].pop().textContent)
  const ask = async (text, r) => {
    reply = r
    await page.fill('#input', text)
    await page.press('#input', 'Enter')
    await settle()
  }
  await ask('what is vpn', { look: 'tutor', answer: 'none', conf: 0.9 })
  check(
    'VPN with no written match never gets the DNS answer',
    !/DNS/.test(await botText()) && /^I don.t have an answer written/.test(await botText()),
    await botText(),
  )
  await ask('what is vpn', { look: 'tutor', answer: 'vpn', conf: 0.93 })
  check(
    'Jev picks the VPN answer',
    /^A VPN \(virtual private network\)/.test(await botText()),
    await botText(),
  )
  check(
    'Brain names the matched answer',
    /\nReply: written answer, What is a VPN and what does it do\?$/.test(
      await page.textContent('#brainLast'),
    ),
    await page.textContent('#brainLast'),
  )
  await ask('what is a proxy', { look: 'tutor', answer: 'vpn', conf: 0.3 })
  check(
    'unsure pick is not used',
    /^I don.t have an answer written/.test(await botText()) &&
      /closest was/.test(await page.textContent('#brainLast')),
    await botText(),
  )
  await ask('what should I cook with a vpn', { look: 'cook', answer: 'vpn', conf: 0.95 })
  check(
    'answer from another outfit is not used',
    /^I don.t have an answer written/.test(await botText()),
    await botText(),
  )
  await ask('what is 12 x 7', { look: 'tutor', answer: 'none', conf: 0.9 })
  check('simple sums are worked out', (await botText()) === '12 × 7 = 84', await botText())
  reply = { look: 'music', answer: 'none', conf: 0.9 }

  await page.reload()
  await page.waitForTimeout(1500)
  check(
    'key survives a reload',
    (await status()) === 'Using Jev' && !(await page.isHidden('#keyRow')),
    await status(),
  )

  await page.click('#keyRemove')
  await page.waitForTimeout(200)
  check(
    'remove clears it',
    /local rules/.test(await status()) &&
      (await page.evaluate(() => localStorage.getItem('momo.jevKey'))) === null,
    await status(),
  )

  await page.fill('#keyInput', BAD)
  await page.click('#keyForm .keybtn')
  await page.waitForTimeout(800)
  check(
    'bad key reported with the reason Jev gave',
    (await status()) === 'Jev rejected this key. Jev says: invalid key',
    await status(),
  )
  await page.reload()
  await page.waitForTimeout(1500)
  check(
    'rejected state survives a reload',
    (await status()) === 'Jev rejected this key',
    await status(),
  )
  await page.fill('#input', 'Explain how DNS works')
  await page.press('#input', 'Enter')
  await settle()
  check(
    'rejected key falls back to local rules',
    (await page.evaluate(() => document.querySelector('.msg.bot .role')?.textContent)) === 'Tutor',
  )
  const lastBody = () =>
    page.evaluate(() => [...document.querySelectorAll('.msg.bot .body')].pop().textContent)
  await page.fill('#input', 'whats the time')
  await page.press('#input', 'Enter')
  await settle()
  check(
    'local rules tell the time',
    /^It.s .+ on your device\.$/.test(await lastBody()),
    await lastBody(),
  )
  await page.waitForTimeout(1500)
  await page.fill('#input', 'who won the football last night')
  await page.press('#input', 'Enter')
  await page.waitForFunction(
    () =>
      /leaves turn yellow.$/.test(
        [...document.querySelectorAll('.msg.bot .body')].pop()?.textContent || '',
      ),
    null,
    { timeout: 15000 },
  )
  await page.waitForTimeout(150)
  check(
    'unwritten question gets the honest reply',
    /^I don.t have an answer written for that one yet\. I.m a demo/.test(await lastBody()),
    await lastBody(),
  )
  check(
    'Momo looks sorry, not winking',
    (await page.evaluate(() => window.__momo.state.mood)) === 'concerned',
    await page.evaluate(() => window.__momo.state.mood),
  )
  await page.waitForTimeout(3000)
  await page.fill('#input', 'hi')
  await page.press('#input', 'Enter')
  await settle()
  check(
    'greeting keeps the friendly reply',
    /^Happy to help/.test(await lastBody()),
    await lastBody(),
  )
  await page.fill('#input', 'Help')
  await page.press('#input', 'Enter')
  await settle()
  check(
    'one word request asks for more',
    /^I.m in. What are we working on/.test(await lastBody()),
    await lastBody(),
  )

  await page.click('#keyRemove')
  await page.fill('#keyInput', 'short')
  await page.click('#keyForm .keybtn')
  check(
    'malformed key refused before any request',
    (await status()) === 'That doesn’t look like a Jev key',
    await status(),
  )
  check('no page errors', errors.length === 0, errors)
  await browser.close()

  const prod = await startServer('prod', 5392, env)
  const call = key =>
    fetch(`${prod.url}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Jev-Key': key } : {}) },
      body: JSON.stringify({ text: 'hi', history: [] }),
    })
  check('phone server: no key means no Jev call', (await call(null)).status === 503)
  check('phone server: browser key works', (await (await call(GOOD)).json()).look === 'music')
  prod.stop()
  check('server never prints the key', !server.output().includes('test-key'), server.output())
} finally {
  server.stop()
  mock.close()
}
finish()
