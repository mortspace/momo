import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname, normalize, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { handleBrain } from './jev.mjs'
import { handleReply, geminiKey, GEMINI_NAME } from './gemini.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = +(process.env.PORT || process.argv.slice(2).find(a => /^\d+$/.test(a)) || 5281)
const USE_KEY_FILE = process.argv.includes('--use-key-file')
const GEMINI_FILE = process.argv.includes('--gemini-key-file')
const KEY_FILE = join(homedir(), '.momo', 'jev.env')
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json',
}

async function apiKey() {
  if (!USE_KEY_FILE) return null
  if (process.env.JEV_AI_API_KEY) return process.env.JEV_AI_API_KEY.trim()
  try {
    return (await readFile(KEY_FILE, 'utf8')).match(/^JEV_AI_API_KEY=(\S+)/m)?.[1] || null
  } catch {
    return null
  }
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (url.pathname === '/api/health')
    return send(res, 200, {
      live: !!(await apiKey()),
      proxy: true,
      writer: (await geminiKey(GEMINI_FILE)) ? GEMINI_NAME : null,
    })
  if (url.pathname === '/api/brain' && req.method === 'POST')
    return handleBrain(req, res, await apiKey(), { withAnswers: !(await geminiKey(GEMINI_FILE)) })
  if (url.pathname === '/api/reply' && req.method === 'POST')
    return handleReply(req, res, await geminiKey(GEMINI_FILE))
  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(
    /^([/\\])+/,
    '',
  )
  if (path.includes('..') || /\.(mjs|env)$/.test(path))
    return send(res, 404, 'not found', 'text/plain')
  try {
    send(
      res,
      200,
      await readFile(join(ROOT, path)),
      TYPES[extname(path)] || 'application/octet-stream',
    )
  } catch {
    send(res, 404, 'not found', 'text/plain')
  }
})

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, '127.0.0.1', async () =>
    console.log(
      `Momo prototype on http://127.0.0.1:${PORT} (Jev ${(await apiKey()) ? 'key found' : 'no key, local rules'}; replies ${(await geminiKey(GEMINI_FILE)) ? 'by ' + GEMINI_NAME : 'written ahead of time'})`,
    ),
  )
}
