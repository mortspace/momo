import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function isolatedEnv(extra = {}) {
  const home = mkdtempSync(join(tmpdir(), 'momo-test-'))
  const { JEV_AI_API_KEY, GEMINI_API_KEY, ...clean } = process.env
  return { ...clean, USERPROFILE: home, HOME: home, ...extra }
}

export async function startServer(name, port, env) {
  const proc = spawn(process.execPath, [join(ROOT, 'server', `${name}.mjs`)], {
    env: { ...env, PORT: String(port) },
  })
  let output = ''
  proc.stdout.on('data', d => (output += d))
  proc.stderr.on('data', d => (output += d))
  const url = `http://127.0.0.1:${port}`
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) break
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return { url, output: () => output, stop: () => proc.kill() }
}

export function report() {
  const results = []
  return {
    check(name, ok, detail) {
      results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`)
    },
    finish(errors = []) {
      console.log(results.join('\n'))
      console.log('errors:', errors.length ? errors.join('\n') : 'none')
      if (errors.length || results.some(r => r.startsWith('FAIL'))) process.exitCode = 1
    },
  }
}
