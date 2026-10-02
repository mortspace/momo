import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize, dirname } from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { handleBrain } from './jev.mjs'
import { handleReply, geminiKey, GEMINI_NAME } from './gemini.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = +(process.env.PORT || 5283)
const GEMINI_FILE = process.argv.includes('--gemini-key-file')
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.webp': 'image/webp',
}

const exists = async p => {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(
      JSON.stringify({
        live: false,
        proxy: true,
        writer: (await geminiKey(GEMINI_FILE)) ? GEMINI_NAME : null,
      }),
    )
    return
  }
  if (url.pathname === '/api/brain' && req.method === 'POST')
    return handleBrain(req, res, null, { withAnswers: !(await geminiKey(GEMINI_FILE)) })
  if (url.pathname === '/api/reply' && req.method === 'POST')
    return handleReply(req, res, await geminiKey(GEMINI_FILE))
  const rel = normalize(
    decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
  ).replace(/^([/\\])+/, '')
  const file = join(ROOT, rel)
  if (!file.startsWith(ROOT) || !(await exists(file))) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }
  const accept = String(req.headers['accept-encoding'] || '')
  const enc =
    /\bbr\b/.test(accept) && (await exists(file + '.br'))
      ? 'br'
      : /\bgzip\b/.test(accept) && (await exists(file + '.gz'))
        ? 'gzip'
        : null
  const body = await readFile(enc ? file + (enc === 'br' ? '.br' : '.gz') : file)
  const headers = {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=300',
    Vary: 'Accept-Encoding',
    'Content-Length': body.length,
  }
  if (enc) headers['Content-Encoding'] = enc
  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
})

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal)
    .map(a => `http://${a.address}:${PORT}`)
  console.log(`Momo production build on http://127.0.0.1:${PORT}`)
  for (const u of lan) console.log(`On your phone (same Wi-Fi): ${u}`)
})
