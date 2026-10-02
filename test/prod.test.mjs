import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, collectErrors } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const sharp = createRequire(import.meta.url)('sharp')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
execFileSync(process.execPath, [join(ROOT, 'tools', 'build.mjs')], { stdio: 'ignore' })

const server = await startServer('prod', 5399, isolatedEnv())
const browser = await launch({ gpu: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = collectErrors(page)
const { check, finish } = report()

await page.goto(`${server.url}/index.html`)
await page.waitForTimeout(2500)
check('production page loads its bundle', await page.evaluate(() => !!window.__momo), null)

const shot = await page.locator('#hero').screenshot()
const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true })
let warm = 0
for (let i = 0; i < data.length; i += info.channels) if (data[i] - data[i + 2] > 60) warm++
check('Momo renders on the hero canvas', warm > 500, warm)

const titles = await page.$$eval('#examples .row .t', rows => rows.map(r => r.textContent))
await page.click(`#examples .row:nth-child(${titles.indexOf('Spinach skillet in 15 minutes') + 1})`)
await page.waitForTimeout(6500)
const played = await page.evaluate(() => ({
  look: window.__momo.state.look,
  role: document.querySelector('#messages .bot .role')?.textContent,
}))
check(
  'an example plays and Momo dresses for it',
  played.look === 'cook' && played.role === 'Chef',
  played,
)

await browser.close()
server.stop()
finish(errors)
