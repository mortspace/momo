import { BASE, launch, collectErrors, outPath } from './browser.mjs'

const [, , query = '', out = outPath('wardrobe.png'), width = '1500'] = process.argv

const browser = await launch()
const page = await browser.newPage({
  viewport: { width: +width, height: 400 },
  deviceScaleFactor: 2,
})
const errors = collectErrors(page)
await page.goto(`${BASE}/tools/wardrobe.html?${query}`)
await page
  .waitForFunction(() => window.done, null, { timeout: 560000 })
  .catch(() => errors.push('timed out'))
await page.screenshot({ path: out, fullPage: true })
console.log(errors.length ? errors.join('\n').slice(0, 2000) : `ok ${out}`)
await browser.close()
