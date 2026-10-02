import { launch, collectErrors } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const server = await startServer('dev', 5393, isolatedEnv({ JEV_URL: 'http://127.0.0.1:9/never' }))
const health = await (await fetch(`${server.url}/api/health`)).json()
if (health.live) {
  server.stop()
  throw new Error('test server found a key; refusing to run')
}

const browser = await launch({ gpu: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = collectErrors(page, { ignore: /404/ })
const { check, finish } = report()
await page.goto(`${server.url}/index.html`)
await page.waitForTimeout(1800)

check(
  'no drawer button on desktop',
  await page.evaluate(
    () => getComputedStyle(document.querySelector('#sideToggle')).display === 'none',
  ),
)
const titles = await page.$$eval('#examples .row', rows =>
  rows.map(r => r.querySelector('.t')?.textContent || r.textContent),
)
const example = title => page.click(`#examples .row:nth-child(${titles.indexOf(title) + 1})`)
const settle = () =>
  page.waitForFunction(
    () =>
      !document.querySelector('#thread.busy') && !document.querySelector('#messages .card.loading'),
    null,
    { timeout: 20000 },
  )
const state = () =>
  page.evaluate(() => ({
    title: document.querySelector('#title').textContent,
    msgs: [...document.querySelectorAll('#messages > *')].map(e =>
      e.classList.contains('user')
        ? 'U:' + e.textContent.slice(0, 24)
        : e.classList.contains('bot')
          ? 'B:' +
            (e.querySelector('.role')?.textContent || 'rest') +
            ':' +
            e.querySelector('.body').textContent.slice(0, 24)
          : 'S:' + e.textContent.slice(0, 20),
    ),
    look: window.__momo.state.look,
    cards: [...document.querySelectorAll('#messages .card-head b')].map(b => b.textContent),
    dead: +window.__momo.state.deadTarget,
    status: document.querySelector('#status').textContent,
    active: document.querySelector('#examples .row.on .t')?.textContent || null,
  }))

for (const title of [
  'Spinach skillet in 15 minutes',
  'Charged twice at checkout',
  '45 minute focus mix',
  'How DNS finds a website',
  'Launch post for Momo',
]) {
  await example(title)
  await page.waitForTimeout(250)
}
await settle()
let s = await state()
check(
  'rapid clicks end on the last example',
  s.title === 'Launch post for Momo' && s.active === 'Launch post for Momo',
  s,
)
check(
  'only the last example is shown, reply complete',
  s.msgs.length === 2 && s.msgs[1].startsWith('B:Writer:Here'),
  s.msgs,
)
check('Momo wears the last outfit', s.look === 'write', s.look)
check('only the last example shows its card', s.cards.join() === 'Launch post', s.cards)
await page.click('#messages .card .tab:has-text("Playful")')
const tabbed = await page.evaluate(() => {
  const tabs = [...document.querySelectorAll('#messages .card .tab')]
  const shown = [...document.querySelectorAll('#messages .card .panel')].filter(p => !p.hidden)
  return {
    selected: tabs.find(t => t.getAttribute('aria-selected') === 'true')?.textContent.trim(),
    shown: shown.length,
    playful: shown[0]?.textContent.includes('16 outfits'),
  }
})
check(
  'tabs switch the card view',
  tabbed.selected === 'Playful' && tabbed.shown === 1 && tabbed.playful,
  tabbed,
)

await example('Offline mid-answer')
await page.waitForTimeout(2600)
s = await state()
check('offline example plays dead', s.dead === 1 && s.status === 'Offline', s)
await example('Rescuing a wilting basil')
await page.waitForTimeout(400)
s = await state()
check('switching away revives Momo at once', s.dead === 0 && s.status === 'Online', s)
await settle()
s = await state()
check(
  'next example completes normally',
  s.title === 'Rescuing a wilting basil' &&
    s.look === 'garden' &&
    s.msgs.length === 2 &&
    s.msgs[1].startsWith('B:Gardener'),
  s,
)

await page.click('#newChat')
await page.fill('#input', 'Explain how DNS works')
await page.press('#input', 'Enter')
await page.waitForTimeout(700)
await example('Landing page hero')
await page.waitForTimeout(500)
await page.click('#chats .row')
await page.waitForTimeout(1500)
s = await state()
check(
  'own chat interrupted mid-reply comes back complete',
  s.title === 'Explain how DNS works' &&
    s.msgs.length === 2 &&
    /^B:Tutor:Think of DNS/.test(s.msgs[1]),
  s,
)
await page.waitForTimeout(1500)
s = await state()
check('Momo turns back to the own chat outfit', s.look === 'tutor', s.look)

const cycle = [
  'Spinach skillet in 15 minutes',
  'Charged twice at checkout',
  'Launch post for Momo',
  'Landing page hero',
  '45 minute focus mix',
  'How DNS finds a website',
  'Rescuing a wilting basil',
  'Offline mid-answer',
  'A one word request',
]
for (let i = 0; i < 12; i++) {
  await example(cycle[i % cycle.length])
  await page.waitForTimeout(90)
}
await settle()
s = await state()
check(
  '12 very fast clicks settle cleanly',
  s.dead === 0 && s.status === 'Online' && s.msgs.filter(m => m.startsWith('U:')).length === 1,
  s,
)
check('no card leaks into another chat', s.cards.length <= 1, s.cards)

const picked = async label => {
  await page.click(`#outfits button:has-text("${label}")`)
  await page.waitForTimeout(1300)
  return page.evaluate(() => ({
    name: document.querySelector('#botName').textContent,
    placeholder: document.querySelector('#input').placeholder,
    look: window.__momo.state.look,
  }))
}
await page.click('#newChat')
await settle()
let p = await picked('Planner')
check(
  'a Playground outfit becomes the bot',
  p.name === 'Planner' && p.placeholder === 'Ask Planner anything' && p.look === 'planner',
  p,
)
await page.click('#newChat')
await page.waitForTimeout(1300)
p = await page.evaluate(() => ({
  name: document.querySelector('#botName').textContent,
  placeholder: document.querySelector('#input').placeholder,
  look: window.__momo.state.look,
}))
check(
  'New chat always starts with plain Momo',
  p.name === 'Momo' && p.placeholder === 'Ask Momo anything' && p.look === 'rest',
  p,
)
await picked('Planner')
p = await picked('Resting')
check('Resting goes back to Momo', p.name === 'Momo' && p.look === 'rest', p)

await browser.close()
server.stop()
finish(errors)
