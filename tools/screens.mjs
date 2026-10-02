import { BASE, launch, collectErrors, outPath } from './browser.mjs'

const widths = (process.argv[2] || '1440,1180,1000,820,390').split(',').map(Number)

const browser = await launch({ gpu: true })
const errors = []
for (const width of widths) {
  const phone = width <= 480
  const page = await browser.newPage({
    viewport: { width, height: phone ? 780 : 860 },
    deviceScaleFactor: 2,
    hasTouch: phone,
    isMobile: phone,
  })
  const pageErrors = collectErrors(page, { ignore: /404/ })
  await page.goto(`${BASE}/index.html`)
  await page.waitForTimeout(2200)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  const file = outPath(`screen-${width}.png`)
  await page.screenshot({ path: file })
  console.log(`${width}px  horizontal overflow ${overflow}px  ${file}`)
  errors.push(...pageErrors.map(e => `${width}: ${e}`))
  await page.close()
}
console.log('errors:', errors.length ? errors.join('\n') : 'none')
await browser.close()
