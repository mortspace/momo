import { launch, collectErrors } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const server = await startServer('dev', 5394, isolatedEnv({ JEV_URL: 'http://127.0.0.1:9/never' }))
const health = await (await fetch(`${server.url}/api/health`)).json()
if (health.live) {
  server.stop()
  throw new Error('test server found a key; refusing to run')
}

const browser = await launch({ gpu: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const errors = collectErrors(page, { ignore: /404/ })
const { check, finish } = report()
const drawerOpen = () =>
  page.evaluate(() => document.querySelector('#side').classList.contains('open'))

await page.goto(`${server.url}/index.html`)
await page.waitForTimeout(1800)

await page.tap('#sideToggle')
await page.waitForTimeout(450)
check('the menu button opens the chats drawer', await drawerOpen())
await page.tap('#scrim', { position: { x: 370, y: 400 } })
await page.waitForTimeout(450)
check('tapping outside closes it', !(await drawerOpen()))

const cdp = await context.newCDPSession(page)
const touch = (type, x = 0) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y: 420 }],
  })
const drawerX = () =>
  page.evaluate(
    () => new DOMMatrix(getComputedStyle(document.querySelector('#side')).transform).m41,
  )
await page.tap('#sideToggle')
await page.waitForTimeout(600)
await touch('touchStart', 220)
for (let i = 1; i <= 6; i++) {
  await touch('touchMove', 220 - i * 10)
  await page.waitForTimeout(16)
}
check('the drawer follows the finger', Math.round(await drawerX()) === -60, await drawerX())
await touch('touchEnd')
await page.waitForTimeout(600)
check('a short drag springs back open', await drawerOpen())
await touch('touchStart', 240)
for (let i = 1; i <= 10; i++) {
  await touch('touchMove', 240 - i * 20)
  await page.waitForTimeout(16)
}
await touch('touchEnd')
await page.waitForTimeout(600)
check('a long swipe closes it', !(await drawerOpen()))
await page.tap('#sideToggle')
await page.waitForTimeout(600)
await touch('touchStart', 240)
for (let i = 1; i <= 4; i++) {
  await touch('touchMove', 240 - i * 17.5)
  await page.waitForTimeout(8)
}
await touch('touchEnd')
await page.waitForTimeout(600)
check('a quick flick closes it', !(await drawerOpen()))

await page.evaluate(() => {
  window.__moved = 0
  const seen = new Map()
  const watch = () => {
    const body = [...document.querySelectorAll('#messages .msg.bot .body')].pop()
    if (body && !body.querySelector('.typing')) {
      const top = body.getBoundingClientRect()
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      let index = 0
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let at = 0; at < node.length; at += 5) {
          const range = document.createRange()
          range.setStart(node, at)
          range.setEnd(node, at + 1)
          const r = range.getBoundingClientRect()
          if (!r.width) continue
          const pos = [r.left - top.left, r.top - top.top]
          const was = seen.get(index + at)
          if (was && (Math.abs(was[0] - pos[0]) > 1 || Math.abs(was[1] - pos[1]) > 1))
            window.__moved++
          seen.set(index + at, pos)
        }
        index += node.length
      }
    }
    if (!window.__stopWatch) requestAnimationFrame(watch)
  }
  requestAnimationFrame(watch)
})
await page.tap('#sideToggle')
await page.waitForTimeout(450)
await page.tap('#examples .row:has-text("Spinach skillet in 15 minutes")')
await page.waitForTimeout(300)
check('picking an example closes the drawer', !(await drawerOpen()))
await page.waitForFunction(
  () =>
    !document.querySelector('#thread.busy') && !document.querySelector('#messages .card.loading'),
  null,
  { timeout: 25000 },
)
const played = await page.evaluate(() => {
  window.__stopWatch = true
  return {
    title: document.querySelector('#title').textContent,
    look: window.__momo.state.look,
    card: document.querySelector('#messages .card-head b')?.textContent,
    moved: window.__moved,
  }
})
check(
  'the example plays on a phone with its card',
  played.title === 'Spinach skillet in 15 minutes' &&
    played.look === 'cook' &&
    played.card === 'Spinach and egg skillet',
  played,
)
check('streamed text never jumps once written', played.moved === 0, played.moved)

await browser.close()
server.stop()
finish(errors)
