import { BASE, launch, collectErrors, outPath } from './browser.mjs'

const [, , query = '', out = outPath('parity.png')] = process.argv

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 400 } })
const errors = collectErrors(page)
await page.goto(`${BASE}/tools/parity.html?${query}`)
await page
  .waitForFunction(() => window.parity, null, { timeout: 580000 })
  .catch(() => errors.push('timed out'))
const stats = await page.evaluate(() => window.parity)
await page.screenshot({ path: out, fullPage: true })
for (const s of stats || []) {
  console.log(
    `${s.look.padEnd(10)} ${s.pose.padEnd(9)} mean ${s.mean}  max ${s.max}  >24: ${s.overPct}%`,
  )
}
if (errors.length) console.log(errors.join('\n').slice(0, 1500))
await browser.close()
