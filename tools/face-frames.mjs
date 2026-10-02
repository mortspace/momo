import { createRequire } from 'node:module'
import { BASE, launch, collectErrors, outPath } from './browser.mjs'

const sharp = createRequire(import.meta.url)('sharp')

const SLOW = +(process.env.SLOW || 5)
const scenes = (process.argv[2] || 'happy,wink,surprised,spin,sleep').split(',')

const browser = await launch({ gpu: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })
const errors = collectErrors(page)
await page.goto(`${BASE}/index.html?slowmo=${SLOW}`)
await page.waitForTimeout(4000)

async function grab() {
  const r = await page.evaluate(() => {
    const b = document.querySelector('#hero').getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height }
  })
  return page.screenshot({
    clip: { x: r.x + r.w * 0.22, y: r.y + r.h * 0.36, width: r.w * 0.56, height: r.h * 0.34 },
  })
}

async function record(name, ms, every, action) {
  const frames = []
  const start = Date.now()
  if (action) await action()
  while (Date.now() - start < ms) {
    frames.push(await grab())
    await page.waitForTimeout(every)
  }
  const cols = 8
  const tileW = 220
  const tileH = Math.round(tileW * 0.6)
  const tiles = await Promise.all(
    frames.map(f => sharp(f).resize(tileW, tileH, { fit: 'fill' }).png().toBuffer()),
  )
  const labels = tiles.map((_, i) => ({
    input: Buffer.from(
      `<svg width="30" height="16"><text x="2" y="12" font-family="Arial" font-size="11" fill="#999">${i}</text></svg>`,
    ),
    left: (i % cols) * tileW,
    top: Math.floor(i / cols) * tileH,
  }))
  const file = outPath(`frames-${name}.png`)
  await sharp({
    create: {
      width: tileW * cols,
      height: tileH * Math.ceil(frames.length / cols),
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([
      ...tiles.map((t, i) => ({
        input: t,
        left: (i % cols) * tileW,
        top: Math.floor(i / cols) * tileH,
      })),
      ...labels,
    ])
    .png()
    .toFile(file)
  console.log(`${name}: ${frames.length} frames  ${file}`)
}

const fresh = async () => {
  await page.click('#newChat')
  await page.waitForTimeout(2500)
}
const chip = mood => () => page.click(`#exprs button[data-e="${mood}"]`)
const HOLD = 1800 * SLOW

for (const [mood, onset] of [
  ['happy', 2200],
  ['wink', 1600],
  ['surprised', 1100],
]) {
  if (!scenes.includes(mood)) continue
  await fresh()
  await record(`${mood}-in`, onset, 25, chip(mood))
  await page.waitForTimeout(HOLD - onset - 300)
  await record(`${mood}-out`, 2400, 25)
}
if (scenes.includes('spin')) {
  await fresh()
  const rows = await page.$$eval('#examples .row', els => els.map(e => e.textContent))
  const n = rows.findIndex(t => t.includes('Spinach')) + 1
  await record('spin-chef', 1300 * SLOW + 2400, 45, () =>
    page.click(`#examples .row:nth-child(${n})`),
  )
}
if (scenes.includes('sleep')) {
  await fresh()
  const drowse = 2400 * SLOW + 500
  await record('sleep', drowse, 90, chip('sleepy'))
  await page.waitForTimeout(Math.max(0, 3500 * SLOW - drowse - 200))
  await record('wake', 1300 * SLOW + 600, 70)
}
console.log('errors:', errors.length ? errors.join('\n') : 'none')
await browser.close()
