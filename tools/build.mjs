import { build } from 'esbuild'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  copyFileSync,
  statSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'dist')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'mesh'), { recursive: true })

await build({
  entryPoints: [join(ROOT, 'src', 'app.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  outfile: join(OUT, 'app.js'),
  define: { 'globalThis.__MOMO_PROD__': 'true' },
  legalComments: 'none',
  logLevel: 'warning',
})
await build({
  entryPoints: [join(ROOT, 'src', 'app.css')],
  minify: true,
  outfile: join(OUT, 'app.css'),
  logLevel: 'warning',
})
writeFileSync(
  join(OUT, 'index.html'),
  readFileSync(join(ROOT, 'index.html'), 'utf8')
    .replace(/\n\s*/g, '\n')
    .replaceAll('src/app.', 'app.'),
)
for (const f of readdirSync(join(ROOT, 'mesh')))
  copyFileSync(join(ROOT, 'mesh', f), join(OUT, 'mesh', f))
mkdirSync(join(OUT, 'assets'), { recursive: true })
for (const f of readdirSync(join(ROOT, 'src', 'assets')).filter(f => f.endsWith('.webp')))
  copyFileSync(join(ROOT, 'src', 'assets', f), join(OUT, 'assets', f))

const rows = []
const walk = dir =>
  readdirSync(dir).flatMap(f =>
    statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)],
  )
for (const file of walk(OUT)) {
  const buf = readFileSync(file)
  if (file.endsWith('.webp')) {
    rows.push([file.slice(OUT.length + 1).replace(/\\/g, '/'), buf.length, buf.length])
    continue
  }
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
  writeFileSync(file + '.gz', gzipSync(buf, { level: 9 }))
  writeFileSync(file + '.br', br)
  rows.push([file.slice(OUT.length + 1).replace(/\\/g, '/'), buf.length, br.length])
}
rows.sort((a, b) => b[2] - a[2])
const kb = n => (n / 1024).toFixed(1).padStart(7)
for (const [f, raw, br] of rows) console.log(`${f.padEnd(26)} ${kb(raw)} KB  br ${kb(br)} KB`)
const first = rows
  .filter(([f]) =>
    ['index.html', 'app.js', 'app.css', 'mesh/momo.json', 'mesh/momo.body.bin'].includes(f),
  )
  .reduce((s, r) => s + r[2], 0)
console.log(
  `first load (html + js + css + body mesh), brotli: ${kb(first)} KB; outfits load in idle afterwards`,
)
