import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const BASE = process.env.BASE || 'http://127.0.0.1:5281'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')

export function outPath(name) {
  mkdirSync(OUT_DIR, { recursive: true })
  return join(OUT_DIR, name)
}

const GPU_ARGS = [
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
]
const SOFTWARE_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

export function launch({ gpu = !!process.env.GPU } = {}) {
  return chromium.launch({ args: gpu ? GPU_ARGS : SOFTWARE_ARGS })
}

export function collectErrors(page, { ignore } = {}) {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => {
    if (m.type() === 'error' && !ignore?.test(m.text())) errors.push(m.text())
  })
  return errors
}
